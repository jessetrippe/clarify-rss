// Type definitions for Clarify RSS Worker
// D1 types are provided by @cloudflare/workers-types

export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  ALLOWED_ORIGIN?: string; // Frontend origin for CORS (e.g., "https://clarify.example.com")
}

export interface Feed {
  id: string;
  url: string;
  title: string;
  last_fetched_at?: number;
  last_error?: string;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface Article {
  id: string;
  feed_id: string;
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  published_at?: number;
  is_read: number;
  is_starred: number;
  created_at: number;
  updated_at: number;
  is_deleted: number;
  // Article extraction fields
  extraction_status?: string;
  extraction_error?: string;
  extracted_at?: number;
}

export interface SyncPullRequest {
  cursor?: string;
  feedCursor?: string;
  articleCursor?: string;
  limit?: number;
}

export interface SyncPullResponse {
  feeds: Feed[];
  articles: Article[];
  feedCursor: string;
  articleCursor: string;
  hasMore: boolean;
}

export interface SyncPushRequest {
  feeds: Feed[];
  articles: Article[];
}

export interface SyncPushResponse {
  success: boolean;
  feedsProcessed: number;
  articlesProcessed: number;
  conflicts: number;
}
