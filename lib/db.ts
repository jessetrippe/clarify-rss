// Dexie database setup
// This will be implemented in Phase 1

import Dexie from "dexie";
import type { Feed, Article, SyncState } from "./types";

// Database will be set up here
// For now, this is a placeholder

export class ClarifyDB extends Dexie {
  // Tables will be defined here in Phase 1
  feeds!: Dexie.Table<Feed, string>;
  articles!: Dexie.Table<Article, string>;
  syncState!: Dexie.Table<SyncState, string>;

  constructor() {
    super("ClarifyRSS");
    // Schema will be defined in Phase 1
  }
}

// Export a singleton instance
export const db = new ClarifyDB();
