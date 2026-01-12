// TypeScript type definitions for Clarify RSS
// These will be implemented in Phase 1

export interface Feed {
  id: string;
  url: string;
  title: string;
  lastFetchedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface Article {
  id: string;
  feedId: string;
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  publishedAt?: Date;
  isRead: boolean;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface SyncState {
  id: string;
  lastSyncAt?: Date;
  cursor?: string;
}
