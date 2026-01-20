// Database operations for feeds, articles, and sync state

import { db } from "./db";
import type { Feed, Article } from "./types";
import { generateArticleId } from "./article-id";

// ============================================================================
// FEED OPERATIONS
// ============================================================================

/**
 * Get all feeds (excluding deleted)
 */
export async function getAllFeeds(): Promise<Feed[]> {
  return db.feeds.where("isDeleted").equals(0).sortBy("title");
}

/**
 * Get a single feed by ID
 */
export async function getFeedById(id: string): Promise<Feed | undefined> {
  return db.feeds.get(id);
}

/**
 * Get a single feed by URL
 */
export async function getFeedByUrl(url: string): Promise<Feed | undefined> {
  return db.feeds.where("url").equals(url).first();
}

/**
 * Add a new feed
 */
export async function addFeed(params: {
  url: string;
  title: string;
  iconUrl?: string;
}): Promise<Feed> {
  const now = new Date();
  const feed: Feed = {
    id: crypto.randomUUID(),
    url: params.url,
    title: params.title,
    iconUrl: params.iconUrl,
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
  };

  await db.feeds.add(feed);
  return feed;
}

/**
 * Update an existing feed
 */
export async function updateFeed(
  id: string,
  updates: Partial<Omit<Feed, "id" | "createdAt">>
): Promise<void> {
  await db.feeds.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Delete a feed (soft delete)
 */
export async function deleteFeed(id: string): Promise<void> {
  const now = new Date();
  await db.feeds.update(id, {
    isDeleted: 1,
    updatedAt: now,
  });

  // Also soft delete all articles from this feed
  await db.articles.where("feedId").equals(id).modify({
    isDeleted: 1,
    updatedAt: now,
  });
}

// feedExists removed - use getFeedByUrl instead

// ============================================================================
// ARTICLE OPERATIONS
// ============================================================================

/**
 * Get all articles (excluding deleted), sorted by published date (newest first)
 */
export async function getAllArticles(): Promise<Article[]> {
  const articles = await db.articles
    .where("isDeleted")
    .equals(0)
    .toArray();

  // Sort by publishedAt descending (newest first), with null/undefined at the end
  return articles.sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? 0;
    const bTime = b.publishedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**
 * Get articles by feed ID
 */
export async function getArticlesByFeed(feedId: string): Promise<Article[]> {
  if (!feedId) return [];

  const articles = await db.articles
    .where("[feedId+isDeleted]")
    .equals([feedId, 0])
    .toArray();

  // Sort by publishedAt descending (newest first)
  return articles.sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? 0;
    const bTime = b.publishedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

/**
 * Get starred articles
 */
export async function getStarredArticles(): Promise<Article[]> {
  const articles = await db.articles
    .where("[isStarred+isDeleted]")
    .equals([1, 0])
    .toArray();

  // Sort by publishedAt descending (newest first)
  return articles.sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? 0;
    const bTime = b.publishedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

// getUnreadArticles removed - use getAllArticles and filter in component

/**
 * Get a single article by ID
 */
export async function getArticleById(
  id: string
): Promise<Article | undefined> {
  return db.articles.get(id);
}

/**
 * Add a new article (or update if it already exists)
 * Uses a transaction to prevent race conditions
 */
export async function addArticle(params: {
  feedId: string;
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  publishedAt?: Date;
}): Promise<Article> {
  const now = new Date();

  // Generate stable article ID
  const id = generateArticleId({
    feedId: params.feedId,
    guid: params.guid,
    url: params.url,
    title: params.title,
    publishedAt: params.publishedAt,
  });

  // Use transaction to prevent race conditions between check and update/insert
  return db.transaction("rw", db.articles, async () => {
    const existing = await db.articles.get(id);

    if (existing) {
      // Update existing article (but preserve user state: isRead, isStarred)
      await db.articles.update(id, {
        title: params.title,
        content: params.content,
        summary: params.summary,
        publishedAt: params.publishedAt,
        updatedAt: now,
      });
      return (await db.articles.get(id))!;
    }

    // Create new article
    const article: Article = {
      id,
      feedId: params.feedId,
      guid: params.guid,
      url: params.url,
      title: params.title,
      content: params.content,
      summary: params.summary,
      publishedAt: params.publishedAt,
      isRead: 0,
      isStarred: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0,
    };

    await db.articles.add(article);
    return article;
  });
}

/**
 * Mark an article as read
 */
export async function markArticleRead(id: string): Promise<void> {
  await db.articles.update(id, {
    isRead: 1,
    updatedAt: new Date(),
  });
}

// markArticleUnread removed - use toggleArticleRead instead

/**
 * Toggle article read status
 */
export async function toggleArticleRead(id: string): Promise<number> {
  const article = await db.articles.get(id);
  if (!article) return 0; // Fixed: return 0 instead of false

  const newReadState = article.isRead ? 0 : 1;
  await db.articles.update(id, {
    isRead: newReadState,
    updatedAt: new Date(),
  });
  return newReadState;
}

// starArticle and unstarArticle removed - use toggleArticleStarred instead

/**
 * Toggle article starred status
 */
export async function toggleArticleStarred(id: string): Promise<number> {
  const article = await db.articles.get(id);
  if (!article) return 0; // Fixed: return 0 instead of false

  const newStarredState = article.isStarred ? 0 : 1;
  await db.articles.update(id, {
    isStarred: newStarredState,
    updatedAt: new Date(),
  });
  return newStarredState;
}

// deleteArticle removed - not used in application

/**
 * Update article content after extraction
 */
export async function updateArticleContent(
  id: string,
  content: string,
  extractionStatus: 'completed' | 'failed',
  extractionError?: string
): Promise<void> {
  const now = new Date();
  await db.articles.update(id, {
    content,
    extractionStatus,
    extractionError,
    extractedAt: now,
    updatedAt: now,
  });
}

/**
 * Update article extraction status (for tracking progress)
 */
export async function updateArticleExtractionStatus(
  id: string,
  extractionStatus: 'pending' | 'extracting' | 'completed' | 'failed',
  extractionError?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    extractionStatus,
    updatedAt: new Date(),
  };

  if (extractionError !== undefined) {
    updates.extractionError = extractionError;
  }

  if (extractionStatus === 'completed' || extractionStatus === 'failed') {
    updates.extractedAt = new Date();
  }

  await db.articles.update(id, updates);
}

// ============================================================================
// SYNC STATE OPERATIONS
// ============================================================================

/**
 * Get sync state
 */
export async function getSyncState() {
  return db.syncState.get("default");
}

/**
 * Update sync state
 */
export async function updateSyncState(params: {
  lastSyncAt?: Date;
  cursor?: string;
  feedCursor?: string;
  articleCursor?: string;
}): Promise<void> {
  const existing = await db.syncState.get("default");

  if (existing) {
    await db.syncState.update("default", params);
  } else {
    await db.syncState.add({
      id: "default",
      ...params,
    });
  }
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Get counts for dashboard/stats
 */
export async function getCounts() {
  const [totalFeeds, totalArticles, unreadCount, starredCount] =
    await Promise.all([
      db.feeds.where("isDeleted").equals(0).count(),
      db.articles.where("isDeleted").equals(0).count(),
      db.articles.where("[isRead+isDeleted]").equals([0, 0]).count(),
      db.articles.where("[isStarred+isDeleted]").equals([1, 0]).count(),
    ]);

  return {
    totalFeeds,
    totalArticles,
    unreadCount,
    starredCount,
  };
}

/**
 * Get article counts grouped by feed ID
 * More efficient than calling getArticlesByFeed() for each feed
 * Uses streaming to avoid loading all articles into memory at once
 */
export async function getArticleCountsByFeed(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Use .each() to stream through articles without loading all into memory
  await db.articles
    .where("isDeleted")
    .equals(0)
    .each((article) => {
      counts[article.feedId] = (counts[article.feedId] || 0) + 1;
    });

  return counts;
}

/**
 * Get unread article counts grouped by feed ID
 * Uses streaming to avoid loading all articles into memory at once
 */
export async function getUnreadCountsByFeed(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Use .each() to stream through unread articles
  await db.articles
    .where("[isRead+isDeleted]")
    .equals([0, 0])
    .each((article) => {
      counts[article.feedId] = (counts[article.feedId] || 0) + 1;
    });

  return counts;
}

/**
 * Clear all data (for testing/debugging)
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.feeds.clear(),
    db.articles.clear(),
    db.syncState.clear(),
  ]);
}
