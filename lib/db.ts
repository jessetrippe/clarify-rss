// Dexie database setup for local-first storage

import Dexie, { type EntityTable, type Transaction } from "dexie";
import type { Feed, Article, SyncState } from "./types";

// Type for raw feed data during migrations (before normalization)
interface RawFeedData {
  isDeleted?: boolean | number;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
  enableExtraction?: boolean | number;
}

// Type for raw article data during migrations (before normalization)
interface RawArticleData {
  isDeleted?: boolean | number;
  isRead?: boolean | number;
  isStarred?: boolean | number;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
  publishedAt?: Date | string | number;
  extractedAt?: Date | string | number;
}

/**
 * Helper function to normalize data during migrations
 * Converts boolean flags to numeric (0/1) and ensures dates are Date objects
 */
function normalizeDatabaseData(tx: Transaction) {
  return Promise.all([
    tx.table("feeds").toCollection().modify((feed: RawFeedData) => {
      if (typeof feed.isDeleted === "boolean") feed.isDeleted = feed.isDeleted ? 1 : 0;
      if (typeof feed.isDeleted !== "number") feed.isDeleted = 0;
      if (typeof feed.enableExtraction === "boolean") {
        feed.enableExtraction = feed.enableExtraction ? 1 : 0;
      }
      if (typeof feed.enableExtraction !== "number") feed.enableExtraction = 0;
      if (feed.createdAt && !(feed.createdAt instanceof Date)) {
        feed.createdAt = new Date(feed.createdAt);
      }
      if (!feed.createdAt) feed.createdAt = new Date();
      if (feed.updatedAt && !(feed.updatedAt instanceof Date)) {
        feed.updatedAt = new Date(feed.updatedAt);
      }
      if (!feed.updatedAt) feed.updatedAt = feed.createdAt;
    }),
    tx.table("articles").toCollection().modify((article: RawArticleData) => {
      if (typeof article.isDeleted === "boolean") article.isDeleted = article.isDeleted ? 1 : 0;
      if (typeof article.isDeleted !== "number") article.isDeleted = 0;
      if (typeof article.isRead === "boolean") article.isRead = article.isRead ? 1 : 0;
      if (typeof article.isRead !== "number") article.isRead = 0;
      if (typeof article.isStarred === "boolean") article.isStarred = article.isStarred ? 1 : 0;
      if (typeof article.isStarred !== "number") article.isStarred = 0;
      if (article.createdAt && !(article.createdAt instanceof Date)) {
        article.createdAt = new Date(article.createdAt);
      }
      if (!article.createdAt) article.createdAt = new Date();
      if (article.updatedAt && !(article.updatedAt instanceof Date)) {
        article.updatedAt = new Date(article.updatedAt);
      }
      if (!article.updatedAt) article.updatedAt = article.createdAt;
      if (article.publishedAt && !(article.publishedAt instanceof Date)) {
        article.publishedAt = new Date(article.publishedAt);
      }
      if (article.extractedAt && !(article.extractedAt instanceof Date)) {
        article.extractedAt = new Date(article.extractedAt);
      }
    }),
  ]);
}

export class ClarifyDB extends Dexie {
  feeds!: EntityTable<Feed, "id">;
  articles!: EntityTable<Article, "id">;
  syncState!: EntityTable<SyncState, "id">;

  constructor() {
    super("ClarifyRSS");

    // Define schema version 1
    this.version(1).stores({
      // Feeds table indexes
      feeds: "id, url, isDeleted, updatedAt",

      // Articles table indexes
      // Primary key: id
      // Indexes: feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted]",

      // Sync state table (single row)
      syncState: "id",
    });

    this.version(2).stores({
      feeds: "id, url, isDeleted, updatedAt",
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted]",
      syncState: "id",
    }).upgrade(normalizeDatabaseData);

    this.version(3).stores({
      feeds: "id, url, isDeleted, updatedAt",
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted]",
      syncState: "id",
    }).upgrade(normalizeDatabaseData);

    // Version 4: Add extraction status fields for full article extraction
    this.version(4).stores({
      feeds: "id, url, isDeleted, updatedAt",
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, extractionStatus, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted]",
      syncState: "id",
    }).upgrade(normalizeDatabaseData);

    // Version 5: Add compound index for efficient unread count queries by feed
    this.version(5).stores({
      feeds: "id, url, isDeleted, updatedAt",
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, extractionStatus, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted], [feedId+isRead+isDeleted]",
      syncState: "id",
    });

    // Version 6: Add feed-level extraction toggle
    this.version(6).stores({
      feeds: "id, url, isDeleted, updatedAt",
      articles:
        "id, feedId, isRead, isStarred, publishedAt, isDeleted, updatedAt, extractionStatus, [feedId+isDeleted], [isStarred+isDeleted], [isRead+isDeleted], [feedId+isRead+isDeleted]",
      syncState: "id",
    }).upgrade(normalizeDatabaseData);
  }
}

// Export a singleton instance
export const db = new ClarifyDB();
