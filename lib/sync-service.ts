// Sync service for frontend-backend synchronization

import { db } from "./db";
import type { Feed, Article } from "./types";
import { getSyncState, updateSyncState } from "./db-operations";

// API base URL (localhost for development, will be replaced with actual domain in production)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

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
      const syncState = await getSyncState();
      const cursor = syncState?.cursor || "0";

      // Call backend API
      const response = await fetch(`${API_BASE_URL}/api/sync/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursor, limit: 100 }),
      });

      if (!response.ok) {
        throw new Error(`Sync pull failed: ${response.statusText}`);
      }

      const data = await response.json();
      const { feeds, articles, cursor: newCursor } = data;

      // Merge feeds into local database
      for (const feed of feeds) {
        const existing = await db.feeds.get(feed.id);

        // Only update if server version is newer or doesn't exist locally
        if (!existing || existing.updated_at < feed.updated_at) {
          await db.feeds.put({
            ...feed,
            lastFetchedAt: feed.last_fetched_at ? new Date(feed.last_fetched_at) : undefined,
            createdAt: new Date(feed.created_at),
            updatedAt: new Date(feed.updated_at),
            isDeleted: Boolean(feed.is_deleted),
          });
        }
      }

      // Merge articles into local database
      for (const article of articles) {
        const existing = await db.articles.get(article.id);

        // Only update if server version is newer or doesn't exist locally
        if (!existing || existing.updated_at < article.updated_at) {
          await db.articles.put({
            ...article,
            feedId: article.feed_id,
            publishedAt: article.published_at ? new Date(article.published_at) : undefined,
            isRead: Boolean(article.is_read),
            isStarred: Boolean(article.is_starred),
            createdAt: new Date(article.created_at),
            updatedAt: new Date(article.updated_at),
            isDeleted: Boolean(article.is_deleted),
          });
        }
      }

      // Update sync state
      await updateSyncState({
        lastSyncAt: new Date(),
        cursor: newCursor,
      });

      return {
        success: true,
        feedsCount: feeds.length,
        articlesCount: articles.length,
      };
    } catch (error) {
      console.error("Sync pull error:", error);
      return {
        success: false,
        feedsCount: 0,
        articlesCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Push local changes to server
   */
  async push(): Promise<{ success: boolean; error?: string }> {
    try {
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
        is_deleted: f.isDeleted ? 1 : 0,
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
        is_read: a.isRead ? 1 : 0,
        is_starred: a.isStarred ? 1 : 0,
        created_at: a.createdAt.getTime(),
        updated_at: a.updatedAt.getTime(),
        is_deleted: a.isDeleted ? 1 : 0,
      }));

      // Push to server
      const response = await fetch(`${API_BASE_URL}/api/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error("Sync push error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
