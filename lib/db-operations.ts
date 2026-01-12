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
 * Add a new feed
 */
export async function addFeed(params: {
  url: string;
  title: string;
}): Promise<Feed> {
  const now = new Date();
  const feed: Feed = {
    id: crypto.randomUUID(),
    url: params.url,
    title: params.title,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
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
  await db.feeds.update(id, {
    isDeleted: true,
    updatedAt: new Date(),
  });

  // Also soft delete all articles from this feed
  const articles = await db.articles.where("feedId").equals(id).toArray();
  const updates = articles.map((article) =>
    db.articles.update(article.id, {
      isDeleted: true,
      updatedAt: new Date(),
    })
  );
  await Promise.all(updates);
}

/**
 * Check if a feed URL already exists
 */
export async function feedExists(url: string): Promise<boolean> {
  const count = await db.feeds.where("url").equals(url).count();
  return count > 0;
}

// ============================================================================
// ARTICLE OPERATIONS
// ============================================================================

/**
 * Get all articles (excluding deleted), sorted by published date (newest first)
 */
export async function getAllArticles(): Promise<Article[]> {
  return db.articles
    .where("isDeleted")
    .equals(0)
    .reverse()
    .sortBy("publishedAt");
}

/**
 * Get articles by feed ID
 */
export async function getArticlesByFeed(feedId: string): Promise<Article[]> {
  return db.articles
    .where("[feedId+isDeleted]")
    .equals([feedId, 0])
    .reverse()
    .sortBy("publishedAt");
}

/**
 * Get starred articles
 */
export async function getStarredArticles(): Promise<Article[]> {
  return db.articles
    .where("[isStarred+isDeleted]")
    .equals([1, 0])
    .reverse()
    .sortBy("publishedAt");
}

/**
 * Get unread articles
 */
export async function getUnreadArticles(): Promise<Article[]> {
  return db.articles
    .where("[isRead+isDeleted]")
    .equals([0, 0])
    .reverse()
    .sortBy("publishedAt");
}

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

  // Check if article already exists
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
    isRead: false,
    isStarred: false,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await db.articles.add(article);
  return article;
}

/**
 * Mark an article as read
 */
export async function markArticleRead(id: string): Promise<void> {
  await db.articles.update(id, {
    isRead: true,
    updatedAt: new Date(),
  });
}

/**
 * Mark an article as unread
 */
export async function markArticleUnread(id: string): Promise<void> {
  await db.articles.update(id, {
    isRead: false,
    updatedAt: new Date(),
  });
}

/**
 * Toggle article read status
 */
export async function toggleArticleRead(id: string): Promise<boolean> {
  const article = await db.articles.get(id);
  if (!article) return false;

  const newReadState = !article.isRead;
  await db.articles.update(id, {
    isRead: newReadState,
    updatedAt: new Date(),
  });
  return newReadState;
}

/**
 * Star an article
 */
export async function starArticle(id: string): Promise<void> {
  await db.articles.update(id, {
    isStarred: true,
    updatedAt: new Date(),
  });
}

/**
 * Unstar an article
 */
export async function unstarArticle(id: string): Promise<void> {
  await db.articles.update(id, {
    isStarred: false,
    updatedAt: new Date(),
  });
}

/**
 * Toggle article starred status
 */
export async function toggleArticleStarred(id: string): Promise<boolean> {
  const article = await db.articles.get(id);
  if (!article) return false;

  const newStarredState = !article.isStarred;
  await db.articles.update(id, {
    isStarred: newStarredState,
    updatedAt: new Date(),
  });
  return newStarredState;
}

/**
 * Delete an article (soft delete)
 */
export async function deleteArticle(id: string): Promise<void> {
  await db.articles.update(id, {
    isDeleted: true,
    updatedAt: new Date(),
  });
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
 * Clear all data (for testing/debugging)
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.feeds.clear(),
    db.articles.clear(),
    db.syncState.clear(),
  ]);
}
