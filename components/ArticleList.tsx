// ArticleList component - displays a virtualized list of articles for performance

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { StarIcon } from "@heroicons/react/24/solid";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Article } from "@/lib/types";
import { primeArticleCache } from "@/lib/article-cache";
import SwipeableArticleItem from "@/components/SwipeableArticleItem";

interface ArticleListProps {
  articles: Article[];
  showFeedName?: boolean;
  feedNames?: Record<string, string>; // feedId -> feedName mapping
  fromPath?: string;
  onToggleRead?: (articleId: string) => void;
}

interface ArticleItemProps {
  article: Article;
  showFeedName: boolean;
  feedName?: string;
  sourcePath: string;
  isSelected: boolean;
}

// Individual article item - memoized so only changed articles re-render
const ArticleItem = React.memo(function ArticleItem({
  article,
  showFeedName,
  feedName,
  sourcePath,
  isSelected,
}: ArticleItemProps) {
  const isUnread = article.isRead === 0;

  return (
    <Link
      href={`${sourcePath}?article=${encodeURIComponent(article.id)}`}
      onClick={() => primeArticleCache(article)}
      className={`block px-4 py-3 border-b border-[var(--border)] transition-colors ${
        isSelected
          ? "bg-[var(--border)]/70 ring-1 ring-inset ring-[var(--accent)]/40"
          : "hover:bg-[var(--border)]/50"
      }`}
    >
      {/* Metadata line */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1">
        {showFeedName && feedName && (
          <>
            <span className="font-medium">{feedName}</span>
            <span>·</span>
          </>
        )}
        {article.publishedAt && (
          <span>{format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
        )}
        {article.isStarred === 1 && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <StarIcon className="h-3 w-3" aria-hidden="true" />
            </span>
          </>
        )}
      </div>

      {/* Title */}
      <h3
        className={`text-base leading-snug ${
          isUnread
            ? "font-semibold text-[var(--foreground)]"
            : "font-normal text-[var(--muted)]"
        }`}
      >
        {article.title}
      </h3>

      {/* Summary */}
      {article.summary && (
        <p className="text-sm text-[var(--muted)] line-clamp-2 mt-1">
          {article.summary}
        </p>
      )}
    </Link>
  );
}, (prevProps, nextProps) => {
  // Only re-render if this specific article changed
  return (
    prevProps.article.id === nextProps.article.id &&
    prevProps.article.isRead === nextProps.article.isRead &&
    prevProps.article.isStarred === nextProps.article.isStarred &&
    prevProps.article.title === nextProps.article.title &&
    prevProps.showFeedName === nextProps.showFeedName &&
    prevProps.feedName === nextProps.feedName &&
    prevProps.sourcePath === nextProps.sourcePath &&
    prevProps.isSelected === nextProps.isSelected
  );
});

// Threshold for enabling virtualization (don't virtualize small lists)
const VIRTUALIZATION_THRESHOLD = 100;

// Estimated row heights for virtualization
const ESTIMATED_ROW_HEIGHT = 85; // px - average height of an article row

const ArticleList = React.memo(function ArticleList({
  articles,
  showFeedName = false,
  feedNames = {},
  fromPath,
  onToggleRead,
}: ArticleListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sourcePath = fromPath || pathname;
  const selectedId = searchParams.get("article");
  const parentRef = useRef<HTMLDivElement>(null);

  // Detect touch device capability
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    // Check for touch capability after hydration
    setIsTouchDevice(
      "ontouchstart" in window || navigator.maxTouchPoints > 0
    );
  }, []);

  // Use virtualization for large lists
  const shouldVirtualize = articles.length > VIRTUALIZATION_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: articles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport
    enabled: shouldVirtualize,
  });

  if (articles.length === 0) {
    return (
      <div className="py-16 px-4 text-center text-[var(--muted)]">
        <p className="text-base mb-1">No articles</p>
        <p className="text-sm">Articles will appear here when you add feeds</p>
      </div>
    );
  }

  // Helper to render an article item with optional swipe wrapper
  const renderArticleItem = (article: Article) => {
    const item = (
      <ArticleItem
        article={article}
        showFeedName={showFeedName}
        feedName={feedNames[article.feedId]}
        sourcePath={sourcePath}
        isSelected={selectedId === article.id}
      />
    );

    // Wrap with swipe gesture on touch devices when callback is provided
    if (isTouchDevice && onToggleRead) {
      return (
        <SwipeableArticleItem
          key={article.id}
          onToggleRead={() => onToggleRead(article.id)}
          isRead={article.isRead === 1}
          enabled
        >
          {item}
        </SwipeableArticleItem>
      );
    }

    return <React.Fragment key={article.id}>{item}</React.Fragment>;
  };

  // For small lists, render without virtualization
  if (!shouldVirtualize) {
    return (
      <>
        {articles.map((article) => renderArticleItem(article))}
      </>
    );
  }

  // Virtualized rendering for large lists
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const article = articles[virtualItem.index];
          const articleContent = (
            <ArticleItem
              article={article}
              showFeedName={showFeedName}
              feedName={feedNames[article.feedId]}
              sourcePath={sourcePath}
              isSelected={selectedId === article.id}
            />
          );
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {isTouchDevice && onToggleRead ? (
                <SwipeableArticleItem
                  onToggleRead={() => onToggleRead(article.id)}
                  isRead={article.isRead === 1}
                  enabled
                >
                  {articleContent}
                </SwipeableArticleItem>
              ) : (
                articleContent
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if the filtered articles actually changed
  if (prevProps.articles.length !== nextProps.articles.length) return false;
  if (prevProps.showFeedName !== nextProps.showFeedName) return false;
  if (prevProps.fromPath !== nextProps.fromPath) return false;
  if (prevProps.onToggleRead !== nextProps.onToggleRead) return false;

  // Check if article IDs or read states changed
  for (let i = 0; i < prevProps.articles.length; i++) {
    const prev = prevProps.articles[i];
    const next = nextProps.articles[i];
    if (!next || prev.id !== next.id || prev.isRead !== next.isRead) {
      return false;
    }
  }

  return true; // Props equal, skip re-render
});

export default ArticleList;
