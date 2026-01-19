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
  const legacyCursor = request.cursor || "0";
  const feedCursor = request.feedCursor || legacyCursor;
  const articleCursor = request.articleCursor || legacyCursor;
  const limit = request.limit || 100;

  const feedCursorParts = parseCursor(feedCursor);
  const articleCursorParts = parseCursor(articleCursor);

  // Get feeds updated since cursor
  const feedsResult = await env.DB.prepare(
    `SELECT * FROM feeds
     WHERE (updated_at > ? OR (updated_at = ? AND id > ?))
     ORDER BY updated_at ASC, id ASC
     LIMIT ?`
  )
    .bind(
      feedCursorParts.updatedAt,
      feedCursorParts.updatedAt,
      feedCursorParts.id,
      limit
    )
    .all<Feed>();

  const feeds = feedsResult.results || [];

  // Get articles updated since cursor
  const articlesResult = await env.DB.prepare(
    `SELECT * FROM articles
     WHERE (updated_at > ? OR (updated_at = ? AND id > ?))
     ORDER BY updated_at ASC, id ASC
     LIMIT ?`
  )
    .bind(
      articleCursorParts.updatedAt,
      articleCursorParts.updatedAt,
      articleCursorParts.id,
      limit
    )
    .all<Article>();

  const articles = articlesResult.results || [];

  // Determine if there are more results
  const hasMore = feeds.length === limit || articles.length === limit;

  const newFeedCursor =
    feeds.length > 0
      ? cursorFromRow(feeds[feeds.length - 1].updated_at, feeds[feeds.length - 1].id)
      : feedCursor;
  const newArticleCursor =
    articles.length > 0
      ? cursorFromRow(
          articles[articles.length - 1].updated_at,
          articles[articles.length - 1].id
        )
      : articleCursor;

  return {
    feeds,
    articles,
    feedCursor: newFeedCursor,
    articleCursor: newArticleCursor,
    hasMore,
  };
}

/**
 * Push changes from client to server
 * Uses last-write-wins conflict resolution based on updated_at timestamps
 * With equal timestamps, uses ID as tiebreaker (higher ID wins)
 */
export async function syncPush(
  request: SyncPushRequest,
  env: Env
): Promise<SyncPushResponse> {
  let feedsProcessed = 0;
  let articlesProcessed = 0;
  let conflicts = 0;
  const conflictDetails: Array<{ type: "feed" | "article"; id: string }> = [];

  // Batch process feeds for better performance
  const feedStatements: D1PreparedStatement[] = [];

  for (const feed of request.feeds) {
    // Check if feed exists and compare timestamps
    const existingResult = await env.DB.prepare(
      `SELECT updated_at, id FROM feeds WHERE id = ?`
    )
      .bind(feed.id)
      .first<{ updated_at: number; id: string }>();

    if (existingResult) {
      // Feed exists - check for conflict using timestamp, then ID as tiebreaker
      const serverNewer = existingResult.updated_at > feed.updated_at;
      const sameTimeServerWins =
        existingResult.updated_at === feed.updated_at &&
        existingResult.id > feed.id;

      if (serverNewer || sameTimeServerWins) {
        conflicts++;
        conflictDetails.push({ type: "feed", id: feed.id });
        continue;
      }
    }

    // Prepare upsert statement
    feedStatements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO feeds (id, url, title, last_fetched_at, last_error, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        feed.id,
        feed.url,
        feed.title,
        feed.last_fetched_at || null,
        feed.last_error || null,
        feed.created_at,
        feed.updated_at,
        feed.is_deleted
      )
    );
    feedsProcessed++;
  }

  // Execute feed updates in batch if any
  if (feedStatements.length > 0) {
    await env.DB.batch(feedStatements);
  }

  // Batch process articles for better performance
  const articleStatements: D1PreparedStatement[] = [];

  for (const article of request.articles) {
    // Check if article exists and compare timestamps
    const existingResult = await env.DB.prepare(
      `SELECT updated_at, id FROM articles WHERE id = ?`
    )
      .bind(article.id)
      .first<{ updated_at: number; id: string }>();

    if (existingResult) {
      // Article exists - check for conflict using timestamp, then ID as tiebreaker
      const serverNewer = existingResult.updated_at > article.updated_at;
      const sameTimeServerWins =
        existingResult.updated_at === article.updated_at &&
        existingResult.id > article.id;

      if (serverNewer || sameTimeServerWins) {
        conflicts++;
        conflictDetails.push({ type: "article", id: article.id });
        continue;
      }
    }

    // Prepare upsert statement
    articleStatements.push(
      env.DB.prepare(
        `INSERT OR REPLACE INTO articles (
          id, feed_id, guid, url, title, content, summary, published_at,
          is_read, is_starred, created_at, updated_at, is_deleted,
          extraction_status, extraction_error, extracted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
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
        article.is_deleted,
        article.extraction_status || null,
        article.extraction_error || null,
        article.extracted_at || null
      )
    );
    articlesProcessed++;
  }

  // Execute article updates in batch if any
  if (articleStatements.length > 0) {
    await env.DB.batch(articleStatements);
  }

  return {
    success: true,
    feedsProcessed,
    articlesProcessed,
    conflicts,
  };
}

/**
 * Parse a cursor string into its components
 * Supports both legacy format (timestamp:encodedId) and new base64 format
 */
function parseCursor(cursor: string): { updatedAt: number; id: string } {
  if (!cursor) {
    return { updatedAt: 0, id: "" };
  }

  // Try to parse as base64 JSON first (new format)
  try {
    const decoded = atob(cursor);
    const parsed = JSON.parse(decoded);
    if (typeof parsed.t === "number" && typeof parsed.i === "string") {
      return { updatedAt: parsed.t, id: parsed.i };
    }
  } catch {
    // Not base64 JSON, try legacy format
  }

  // Legacy format: timestamp:encodedId
  const separatorIndex = cursor.indexOf(":");
  if (separatorIndex !== -1) {
    const updatedAtPart = cursor.slice(0, separatorIndex);
    const idPart = cursor.slice(separatorIndex + 1);
    const updatedAt = Number.parseInt(updatedAtPart, 10);
    return {
      updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
      id: idPart ? decodeURIComponent(idPart) : "",
    };
  }

  // Fallback: just a timestamp
  const updatedAt = Number.parseInt(cursor, 10);
  return {
    updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt,
    id: "",
  };
}

/**
 * Create a cursor string from timestamp and ID
 * Uses base64-encoded JSON to safely handle any characters in the ID
 */
function cursorFromRow(updatedAt: number, id: string): string {
  const payload = JSON.stringify({ t: updatedAt, i: id });
  return btoa(payload);
}
