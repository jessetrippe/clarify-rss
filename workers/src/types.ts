// Type definitions for Clarify RSS Worker

// D1 Database types (from Cloudflare Workers)
// These are provided by @cloudflare/workers-types but declared here for standalone compilation
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown[]>(): Promise<T[]>;
  }

  interface D1Result<T = unknown> {
    results?: T[];
    success: boolean;
    error?: string;
    meta?: object;
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }
}

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
