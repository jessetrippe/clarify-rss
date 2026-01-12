-- Clarify RSS Database Schema for D1 (SQLite)

-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  last_fetched_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_feeds_url ON feeds(url);
CREATE INDEX IF NOT EXISTS idx_feeds_is_deleted ON feeds(is_deleted);
CREATE INDEX IF NOT EXISTS idx_feeds_updated_at ON feeds(updated_at);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  guid TEXT,
  url TEXT,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  published_at INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (feed_id) REFERENCES feeds(id)
);

CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
CREATE INDEX IF NOT EXISTS idx_articles_is_deleted ON articles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_articles_updated_at ON articles(updated_at);
CREATE INDEX IF NOT EXISTS idx_articles_feed_deleted ON articles(feed_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_articles_starred_deleted ON articles(is_starred, is_deleted);
