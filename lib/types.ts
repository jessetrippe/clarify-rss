// TypeScript type definitions for Clarify RSS
// These will be implemented in Phase 1

export interface Feed {
  id: string;
  url: string;
  title: string;
  iconUrl?: string;
  enableExtraction?: number;
  lastFetchedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: number;
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
  isRead: number;
  isStarred: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: number;
  // Article extraction fields
  extractionStatus?: 'pending' | 'extracting' | 'completed' | 'failed';
  extractionError?: string;
  extractedAt?: Date;
}

export interface SyncState {
  id: string;
  lastSyncAt?: Date;
  cursor?: string;
  feedCursor?: string;
  articleCursor?: string;
}
