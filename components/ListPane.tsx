"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getAllArticles,
  getAllFeeds,
  getStarredArticles,
  getArticlesByFeed,
} from "@/lib/db-operations";
import type { Article, Feed } from "@/lib/types";
import ArticleList from "@/components/ArticleList";
import ListPaneHeader from "@/components/ListPaneHeader";
import EmptyArticleList from "@/components/EmptyArticleList";
import { uiLogger } from "@/lib/logger";

type ListVariant = "all" | "starred" | "feed";

interface ListPaneProps {
  variant: ListVariant;
  feedId?: string;
  freezeQuery?: boolean; // Don't re-query database, use cached data only
}

const STORAGE_KEYS: Record<Exclude<ListVariant, "feed">, string> = {
  all: "clarify-show-read-all-items",
  starred: "clarify-show-read-starred",
};

type ListCache = {
  articles: Map<string, Article[]>;
  feeds: Map<string, Feed[]>;
};

const getListCache = (): ListCache => {
  if (typeof globalThis === "undefined") {
    return { articles: new Map(), feeds: new Map() };
  }
  const global = globalThis as typeof globalThis & {
    __clarifyListCache?: ListCache;
  };
  if (!global.__clarifyListCache) {
    global.__clarifyListCache = { articles: new Map(), feeds: new Map() };
  }
  return global.__clarifyListCache;
};

function ListPane({ variant, feedId, freezeQuery = false }: ListPaneProps) {
  const { articles: articleCache, feeds: feedCache } = getListCache();
  const [feed, setFeed] = useState<Feed | null>(null);

  // Scroll position preservation
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollPosition = useRef<number>(0);

  const readSessionKey = `clarify-read-session-${variant}-${feedId || "all"}`;

  // Session-based read tracking to prevent immediate article removal
  // Initialize from sessionStorage to persist across route changes
  const [readInSession, setReadInSession] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = sessionStorage.getItem(readSessionKey);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  const storageKey =
    variant === "feed"
      ? feedId
        ? `clarify-show-read-feed:${feedId}`
        : undefined
      : STORAGE_KEYS[variant];

  // Always start with false to match server-side render and prevent hydration mismatch
  const [showRead, setShowRead] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    // Read from localStorage after hydration
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setShowRead(stored === "true");
  }, [storageKey]);

  const handleShowReadChange = (checked: boolean) => {
    setShowRead(checked);
    if (!storageKey) return;
    localStorage.setItem(storageKey, checked ? "true" : "false");
  };

  const cacheKey = useMemo(
    () => (variant === "feed" ? `feed:${feedId || "unknown"}` : variant),
    [variant, feedId]
  );

  // Combine cached state to reduce renders
  const [cachedData, setCachedData] = useState<{
    feeds: Feed[];
    articles: Article[];
  }>(() => ({
    feeds: feedCache.get("all") || [],
    articles: articleCache.get(cacheKey) || [],
  }));

  const feeds = useLiveQuery(() => {
    if (freezeQuery) return undefined; // Don't query, use cache
    return getAllFeeds();
  }) as Feed[] | undefined;
  const lastFeedsRef = useRef<Feed[]>([]);

  const articles = useLiveQuery(async () => {
    if (freezeQuery) return undefined; // Don't query, use cache
    if (variant === "all") {
      return await getAllArticles();
    }
    if (variant === "starred") {
      return await getStarredArticles();
    }
    if (variant === "feed" && feedId) {
      return await getArticlesByFeed(feedId);
    }
    return [];
  }, [variant, feedId, freezeQuery]) as Article[] | undefined;

  useEffect(() => {
    if (freezeQuery) return; // Skip cache updates when frozen

    // Batch feed and article updates together
    const needsFeedUpdate = feeds && feeds !== lastFeedsRef.current;
    const needsArticleUpdate = articles !== undefined;

    if (needsFeedUpdate || needsArticleUpdate) {
      let hasChanges = false;
      const updates: Partial<typeof cachedData> = {};

      if (needsFeedUpdate && feeds) {
        lastFeedsRef.current = feeds;
        feedCache.set("all", feeds);
        updates.feeds = feeds;
        hasChanges = true;
      }

      if (needsArticleUpdate && articles) {
        articleCache.set(cacheKey, articles);
        updates.articles = articles;
        hasChanges = true;
      }

      // Only update state if something actually changed
      if (hasChanges) {
        setCachedData(prev => ({
          ...prev,
          ...updates,
        }));
      }
    }
  }, [feeds, articles, cacheKey, freezeQuery]);

  // When frozen, always read from global cache
  const resolvedFeeds = freezeQuery
    ? (feedCache.get("all") || cachedData.feeds)
    : (feeds ?? cachedData.feeds);

  // Memoize feedNames to prevent recalculation on every render
  const feedNames = useMemo(() => {
    if (!resolvedFeeds.length) return {};
    const names: Record<string, string> = {};
    resolvedFeeds.forEach((feedItem) => {
      names[feedItem.id] = feedItem.title;
    });
    return names;
  }, [resolvedFeeds]);

  useEffect(() => {
    if (variant !== "feed") return;
    if (!feedId || !resolvedFeeds.length) return;
    const feedMatch = resolvedFeeds.find((feedItem) => feedItem.id === feedId) || null;
    setFeed(feedMatch);
  }, [variant, feedId, resolvedFeeds]);

  // When frozen, ONLY use cache (ignore undefined from useLiveQuery)
  // Always check global cache on each render when frozen
  const resolvedArticles = freezeQuery
    ? (articleCache.get(cacheKey) || cachedData.articles)
    : (articles ?? cachedData.articles);

  // Memoize visible articles calculation to prevent unnecessary filtering
  const visibleArticles = useMemo(() => {
    uiLogger.debug('Filtering articles. showRead:', showRead, 'readInSession size:', readInSession.size, 'total articles:', resolvedArticles.length);

    if (showRead) return resolvedArticles;

    // Show unread articles + articles marked as read in this session
    const filtered = resolvedArticles.filter(article =>
      article.isRead === 0 || readInSession.has(article.id)
    );

    uiLogger.debug('Visible articles after filter:', filtered.length);
    return filtered;
  }, [resolvedArticles, showRead, readInSession]);

  // Detect newly read articles and keep them visible for this session
  const previousReadState = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (freezeQuery || !articles) return; // Skip when frozen

    const prevMap = previousReadState.current;
    const nextMap = new Map<string, number>();

    setReadInSession(prev => {
      let next = prev;
      let changed = false;

      articles.forEach(article => {
        const prevRead = prevMap.get(article.id);

        if (prevRead === 0 && article.isRead === 1 && !prev.has(article.id)) {
          uiLogger.debug("Article marked as read, keeping visible:", article.id);
          if (!changed) {
            next = new Set(prev);
            changed = true;
          }
          next.add(article.id);
        } else if (prevRead === 1 && article.isRead === 0 && prev.has(article.id)) {
          if (!changed) {
            next = new Set(prev);
            changed = true;
          }
          next.delete(article.id);
        }

        nextMap.set(article.id, article.isRead);
      });

      previousReadState.current = nextMap;

      if (changed) {
        sessionStorage.setItem(readSessionKey, JSON.stringify(Array.from(next)));
        return next;
      }

      return prev;
    });
  }, [articles, freezeQuery, readSessionKey]);

  // Clear session tracking when navigating to different view
  useEffect(() => {
    // Clear sessionStorage for this view
    sessionStorage.removeItem(readSessionKey);
    setReadInSession(new Set());
    previousReadState.current = new Map();
  }, [variant, feedId, readSessionKey]);

  // Track scroll position before updates
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    // Restore scroll position from sessionStorage on mount
    const scrollKey = `clarify-scroll-${variant}-${feedId || 'all'}`;
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll) {
      const scrollPos = parseInt(savedScroll, 10);
      container.scrollTop = scrollPos;
      lastScrollPosition.current = scrollPos;
    }

    const handleScroll = () => {
      lastScrollPosition.current = container.scrollTop;
      // Persist to sessionStorage
      sessionStorage.setItem(scrollKey, container.scrollTop.toString());
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [variant, feedId]);

  // Restore scroll position after visibleArticles updates (BEFORE paint to prevent flash)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const savedPos = lastScrollPosition.current;

    // Only restore if we have articles and a saved position
    if (visibleArticles.length === 0 || savedPos === 0) return;

    // Run immediately before paint, no requestAnimationFrame
    container.scrollTop = savedPos;
  }, [visibleArticles.length]); // Only depend on length, not the array itself

  if (variant === "feed" && !feedId) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-12">
        Invalid feed
      </div>
    );
  }

  if (variant === "feed" && !feed && resolvedArticles.length > 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-12">
        Feed not found
      </div>
    );
  }

  const headerTitle =
    variant === "all"
      ? "All Items"
      : variant === "starred"
        ? "Starred"
        : feed?.title || "Feed";
  const listPath =
    variant === "feed" && feedId
      ? `/feeds/${feedId}`
      : variant === "starred"
        ? "/starred"
        : "/";

  return (
    <div ref={scrollContainerRef} className="overflow-y-auto h-full">
      <ListPaneHeader
        title={headerTitle}
        count={visibleArticles.length}
        showRead={showRead}
        onShowReadChange={handleShowReadChange}
      />

      {visibleArticles.length === 0 ? (
        <EmptyArticleList
          hasArticles={resolvedArticles.length > 0}
          showSettingsLink={variant !== "feed"}
        />
      ) : (
        <ArticleList
          articles={visibleArticles}
          showFeedName={variant !== "feed"}
          feedNames={feedNames}
          fromPath={listPath}
        />
      )}
    </div>
  );
}

// Memoize component to prevent re-renders when props haven't changed
export default React.memo(ListPane, (prevProps, nextProps) => {
  return (
    prevProps.variant === nextProps.variant &&
    prevProps.feedId === nextProps.feedId &&
    prevProps.freezeQuery === nextProps.freezeQuery
  );
});
