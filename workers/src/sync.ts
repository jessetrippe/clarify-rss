// Sync logic for Clarify RSS

import type {
  Env,
  Feed,
  Article,
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
} from "./types";

/**
 * Pull changes from server since cursor
 * Returns feeds and articles updated since the cursor timestamp
 */
export async function syncPull(
  request: SyncPullRequest,
  env: Env
): Promise<SyncPullResponse> {
  const cursor = request.cursor || "0";
  const limit = request.limit || 100;

  // Convert cursor to timestamp
  const cursorTimestamp = parseInt(cursor, 10);

  // Get feeds updated since cursor
  const feedsResult = await env.DB.prepare(
    `SELECT * FROM feeds WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`
  )
    .bind(cursorTimestamp, limit)
    .all<Feed>();

  const feeds = feedsResult.results || [];

  // Get articles updated since cursor
  const articlesResult = await env.DB.prepare(
    `SELECT * FROM articles WHERE updated_at > ? ORDER BY updated_at ASC LIMIT ?`
  )
    .bind(cursorTimestamp, limit)
    .all<Article>();

  const articles = articlesResult.results || [];

  // Determine if there are more results
  const totalResults = feeds.length + articles.length;
  const hasMore = totalResults >= limit;

  // New cursor is the latest updated_at timestamp
  let newCursor = cursor;
  if (feeds.length > 0 || articles.length > 0) {
    const latestFeedTime =
      feeds.length > 0 ? feeds[feeds.length - 1].updated_at : 0;
    const latestArticleTime =
      articles.length > 0 ? articles[articles.length - 1].updated_at : 0;
    newCursor = Math.max(latestFeedTime, latestArticleTime).toString();
  }

  return {
    feeds,
    articles,
    cursor: newCursor,
    hasMore,
  };
}

/**
 * Push changes from client to server
 * Uses last-write-wins conflict resolution based on updated_at timestamps
 */
export async function syncPush(
  request: SyncPushRequest,
  env: Env
): Promise<SyncPushResponse> {
  let feedsProcessed = 0;
  let articlesProcessed = 0;
  let conflicts = 0;

  // Process feeds
  for (const feed of request.feeds) {
    // Check if feed exists
    const existingResult = await env.DB.prepare(
      `SELECT updated_at FROM feeds WHERE id = ?`
    )
      .bind(feed.id)
      .first<{ updated_at: number }>();

    if (existingResult) {
      // Feed exists - check for conflict
      if (existingResult.updated_at > feed.updated_at) {
        // Server version is newer - conflict (server wins)
        conflicts++;
        continue;
      }
    }

    // Upsert feed (insert or replace)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO feeds (id, url, title, last_fetched_at, last_error, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        feed.id,
        feed.url,
        feed.title,
        feed.last_fetched_at || null,
        feed.last_error || null,
        feed.created_at,
        feed.updated_at,
        feed.is_deleted
      )
      .run();

    feedsProcessed++;
  }

  // Process articles
  for (const article of request.articles) {
    // Check if article exists
    const existingResult = await env.DB.prepare(
      `SELECT updated_at FROM articles WHERE id = ?`
    )
      .bind(article.id)
      .first<{ updated_at: number }>();

    if (existingResult) {
      // Article exists - check for conflict
      if (existingResult.updated_at > article.updated_at) {
        // Server version is newer - conflict (server wins)
        conflicts++;
        continue;
      }
    }

    // Upsert article (insert or replace)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO articles (
        id, feed_id, guid, url, title, content, summary, published_at,
        is_read, is_starred, created_at, updated_at, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        article.id,
        article.feed_id,
        article.guid || null,
        article.url || null,
        article.title,
        article.content || null,
        article.summary || null,
        article.published_at || null,
        article.is_read,
        article.is_starred,
        article.created_at,
        article.updated_at,
        article.is_deleted
      )
      .run();

    articlesProcessed++;
  }

  return {
    success: true,
    feedsProcessed,
    articlesProcessed,
    conflicts,
  };
}
