// Dexie database setup for local-first storage

import Dexie, { type EntityTable } from "dexie";
import type { Feed, Article, SyncState } from "./types";

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
  }
}

// Export a singleton instance
export const db = new ClarifyDB();
