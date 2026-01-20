import type { Article, Feed } from "@/lib/types";
import { createMapCacheManager } from "@/lib/cache";

export type CachedArticleData = { article: Article; feed: Feed | null };

// Shared cache for article detail to enable instant navigation from lists.
export const articleCache = createMapCacheManager<string, CachedArticleData>("Article");

export function primeArticleCache(article: Article, feed?: Feed | null) {
  articleCache.set(article.id, { article, feed: feed ?? null });
}
