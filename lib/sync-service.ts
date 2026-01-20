// Sync service for frontend-backend synchronization

import { db } from "./db";
import type { Feed, Article } from "./types";
import { getSyncState, updateSyncState } from "./db-operations";
import { getAccessToken } from "@/lib/supabase/auth";
import { syncLogger } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/fetch-utils";
import { articleCache } from "@/lib/article-cache";
import { isNetworkError } from "@/lib/network-utils";

// API base URL (localhost for development, will be replaced with actual domain in production)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Maximum number of sync iterations to prevent infinite loops
const MAX_SYNC_ITERATIONS = 100;

/**
 * Normalize timestamp to milliseconds
 * Handles both milliseconds and seconds timestamps
 */
function normalizeTimestamp(timestamp: number | undefined): number {
  if (!timestamp) return 0;
  // If timestamp is less than year 2000 in milliseconds, assume it's in seconds
  // Year 2000 in ms = 946684800000, in seconds = 946684800
  if (timestamp < 946684800000) {
    return timestamp * 1000;
  }
  return timestamp;
}

/**
 * Sync service for coordinating local and remote data
 */
export class SyncService {
  private isSyncing = false;

  /**
   * Pull changes from server and merge into local database
   */
  async pull(): Promise<{ success: boolean; feedsCount: number; articlesCount: number; error?: string }> {
    try {
      const accessToken = await getAccessToken();
      const syncState = await getSyncState();
      const legacyCursor = syncState?.cursor || "0";
      let feedCursor = syncState?.feedCursor || legacyCursor;
      let articleCursor = syncState?.articleCursor || legacyCursor;
      const limit = 100;

      let totalFeeds = 0;
      let totalArticles = 0;
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < MAX_SYNC_ITERATIONS) {
        iterations++;

        const response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/pull`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            feedCursor,
            articleCursor,
            limit,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync pull failed: ${response.statusText}`);
        }

        const data = await response.json();
        const {
          feeds,
          articles,
          feedCursor: newFeedCursor,
          articleCursor: newArticleCursor,
          hasMore: nextHasMore,
        } = data;

        // Detect potential infinite loop (same cursors returned)
        if (newFeedCursor === feedCursor && newArticleCursor === articleCursor && nextHasMore) {
          throw new Error("Sync loop detected: cursors not advancing");
        }

        // Merge feeds into local database
        for (const feed of feeds) {
          const existing = await db.feeds.get(feed.id);
          const localUpdatedAt = existing?.updatedAt?.getTime() ?? 0;
          const serverUpdatedAt = normalizeTimestamp(feed.updated_at);

          // Only update if server version is newer or doesn't exist locally
          if (!existing || localUpdatedAt < serverUpdatedAt) {
            await db.feeds.put({
              ...feed,
              iconUrl: existing?.iconUrl,
              lastFetchedAt: feed.last_fetched_at ? new Date(normalizeTimestamp(feed.last_fetched_at)) : undefined,
              createdAt: new Date(normalizeTimestamp(feed.created_at)),
              updatedAt: new Date(serverUpdatedAt),
              isDeleted: typeof feed.is_deleted === "number" ? feed.is_deleted : 0,
            });
          }
        }

        // Merge articles into local database
        for (const article of articles) {
          const existing = await db.articles.get(article.id);
          const localUpdatedAt = existing?.updatedAt?.getTime() ?? 0;
          const serverUpdatedAt = normalizeTimestamp(article.updated_at);

          // Only update if server version is newer or doesn't exist locally
          if (!existing || localUpdatedAt < serverUpdatedAt) {
            await db.articles.put({
              ...article,
              feedId: article.feed_id,
              publishedAt: article.published_at ? new Date(normalizeTimestamp(article.published_at)) : undefined,
              isRead: typeof article.is_read === "number" ? article.is_read : 0,
              isStarred: typeof article.is_starred === "number" ? article.is_starred : 0,
              createdAt: new Date(normalizeTimestamp(article.created_at)),
              updatedAt: new Date(serverUpdatedAt),
              isDeleted: typeof article.is_deleted === "number" ? article.is_deleted : 0,
              // Extraction fields
              extractionStatus: article.extraction_status as Article['extractionStatus'],
              extractionError: article.extraction_error,
              extractedAt: article.extracted_at ? new Date(normalizeTimestamp(article.extracted_at)) : undefined,
            });
            // Invalidate article cache to prevent stale data
            articleCache.invalidate(article.id);
          }
        }

        totalFeeds += feeds.length;
        totalArticles += articles.length;
        feedCursor = newFeedCursor;
        articleCursor = newArticleCursor;
        hasMore = nextHasMore;
      }

      if (iterations >= MAX_SYNC_ITERATIONS) {
        syncLogger.warn("Sync pull reached maximum iterations limit");
      }

      // Update sync state
      await updateSyncState({
        lastSyncAt: new Date(),
        feedCursor,
        articleCursor,
      });

      return {
        success: true,
        feedsCount: totalFeeds,
        articlesCount: totalArticles,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Don't log network errors (expected when backend is unavailable)
      if (!isNetworkError(error)) {
        syncLogger.error("Sync pull error:", errorMessage);
      }
      return {
        success: false,
        feedsCount: 0,
        articlesCount: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Push local changes to server
   */
  async push(): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await getAccessToken();
      const syncState = await getSyncState();
      const lastSyncTime = syncState?.lastSyncAt?.getTime() || 0;

      // Get feeds changed since last sync
      const feeds = await db.feeds
        .where("updatedAt")
        .above(new Date(lastSyncTime))
        .toArray();

      // Get articles changed since last sync
      const articles = await db.articles
        .where("updatedAt")
        .above(new Date(lastSyncTime))
        .toArray();

      if (feeds.length === 0 && articles.length === 0) {
        return { success: true }; // Nothing to push
      }

      // Convert to API format
      const feedsToSync = feeds.map((f) => ({
        id: f.id,
        url: f.url,
        title: f.title,
        last_fetched_at: f.lastFetchedAt?.getTime(),
        last_error: f.lastError,
        created_at: f.createdAt.getTime(),
        updated_at: f.updatedAt.getTime(),
        is_deleted: f.isDeleted,
      }));

      const articlesToSync = articles.map((a) => ({
        id: a.id,
        feed_id: a.feedId,
        guid: a.guid,
        url: a.url,
        title: a.title,
        content: a.content,
        summary: a.summary,
        published_at: a.publishedAt?.getTime(),
        is_read: a.isRead,
        is_starred: a.isStarred,
        created_at: a.createdAt.getTime(),
        updated_at: a.updatedAt.getTime(),
        is_deleted: a.isDeleted,
        // Extraction fields
        extraction_status: a.extractionStatus,
        extraction_error: a.extractionError,
        extracted_at: a.extractedAt?.getTime(),
      }));

      // Push to server
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          feeds: feedsToSync,
          articles: articlesToSync,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed: ${response.statusText}`);
      }

      const result = await response.json();

      return { success: result.success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Don't log network errors (expected when backend is unavailable)
      if (!isNetworkError(error)) {
        syncLogger.error("Sync push error:", errorMessage);
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Full sync: push then pull
   */
  async sync(): Promise<{ success: boolean; error?: string }> {
    if (this.isSyncing) {
      return { success: false, error: "Sync already in progress" };
    }

    this.isSyncing = true;

    try {
      // Push local changes first
      const pushResult = await this.push();
      if (!pushResult.success) {
        return pushResult;
      }

      // Then pull server changes
      const pullResult = await this.pull();
      return pullResult;
    } finally {
      this.isSyncing = false;
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
