import { getAllFeeds, addArticle, updateFeed } from "./db-operations";
import { parseFeedFromApi } from "./feed-api";
import type { Feed } from "./types";
import { feedLogger } from "./logger";
import { withRetry, isTransientError } from "./retry";

// Minimum time between feed refreshes (5 minutes)
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface RefreshProgress {
  total: number;
  completed: number;
  currentFeed?: string;
  errors: Array<{ feedId: string; feedTitle: string; error: string }>;
}

export type RefreshCallback = (progress: RefreshProgress) => void;

export class FeedRefreshService {
  private isRefreshing = false;

  /**
   * Refresh all feeds for the current user
   * @param onProgress Optional callback for progress updates
   * @returns Object with success status and any errors
   */
  async refreshAllFeeds(
    onProgress?: RefreshCallback
  ): Promise<{ success: boolean; errors: RefreshProgress["errors"] }> {
    feedLogger.debug("refreshAllFeeds called, isRefreshing:", this.isRefreshing);

    if (this.isRefreshing) {
      feedLogger.debug("Already refreshing, skipping");
      return {
        success: false,
        errors: [
          { feedId: "", feedTitle: "", error: "Refresh already in progress" },
        ],
      };
    }

    this.isRefreshing = true;

    try {
      // Get all user's feeds
      const feeds = await getAllFeeds();
      feedLogger.debug("Found", feeds.length, "feeds to refresh");
      const errors: RefreshProgress["errors"] = [];

      // Notify start
      onProgress?.({
        total: feeds.length,
        completed: 0,
        errors: [],
      });

      // Fetch all feeds in parallel (with Promise.allSettled to handle failures)
      const results = await Promise.allSettled(
        feeds.map(async (feed) => {
          try {
            // Check rate limit
            if (feed.lastFetchedAt) {
              const timeSinceLastFetch =
                Date.now() - new Date(feed.lastFetchedAt).getTime();

              if (timeSinceLastFetch < MIN_REFRESH_INTERVAL_MS) {
                // Skip this feed, too soon since last fetch
                return { feedId: feed.id, skipped: true };
              }
            }

            // Fetch and parse feed with retry for transient errors
            const feedData = await withRetry(
              () => parseFeedFromApi(feed.url),
              {
                maxRetries: 2,
                initialDelayMs: 1000,
                shouldRetry: isTransientError,
              }
            );

            // Add articles in batches to prevent too many concurrent IndexedDB operations
            // (addArticle handles duplicates via stable ID generation)
            const BATCH_SIZE = 50;
            for (let i = 0; i < feedData.articles.length; i += BATCH_SIZE) {
              const batch = feedData.articles.slice(i, i + BATCH_SIZE);
              await Promise.all(
                batch.map((article) =>
                  addArticle({
                    feedId: feed.id,
                    guid: article.guid,
                    url: article.url,
                    title: article.title,
                    content: article.content,
                    summary: article.summary,
                    publishedAt: article.publishedAt
                      ? new Date(article.publishedAt)
                      : undefined,
                  })
                )
              );
            }

            // Update feed's lastFetchedAt timestamp and clear any error
            await updateFeed(feed.id, {
              lastFetchedAt: new Date(),
              lastError: undefined,
            });

            return {
              feedId: feed.id,
              success: true,
              articlesAdded: feedData.articles.length,
            };
          } catch (error) {
            // Track error but don't fail entire refresh
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            errors.push({
              feedId: feed.id,
              feedTitle: feed.title,
              error: errorMessage,
            });

            // Store error on feed for debugging
            await updateFeed(feed.id, {
              lastError: errorMessage,
            });

            return { feedId: feed.id, error: errorMessage };
          }
        })
      );

      // Count completed feeds
      const completed = results.filter((r) => r.status === "fulfilled").length;

      // Notify completion
      onProgress?.({
        total: feeds.length,
        completed,
        errors,
      });

      return {
        success: errors.length === 0,
        errors,
      };
    } finally {
      this.isRefreshing = false;
    }
  }

  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// Singleton instance
export const feedRefreshService = new FeedRefreshService();
