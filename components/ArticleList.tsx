// ArticleList component - displays a list of articles

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { StarIcon } from "@heroicons/react/24/solid";
import type { Article } from "@/lib/types";

interface ArticleListProps {
  articles: Article[];
  showFeedName?: boolean;
  feedNames?: Record<string, string>; // feedId -> feedName mapping
  fromPath?: string;
}

interface ArticleItemProps {
  article: Article;
  showFeedName: boolean;
  feedName?: string;
  sourcePath: string;
}

// Individual article item - memoized so only changed articles re-render
const ArticleItem = React.memo(function ArticleItem({
  article,
  showFeedName,
  feedName,
  sourcePath,
}: ArticleItemProps) {
  const isUnread = article.isRead === 0;

  return (
    <Link
      href={`${sourcePath}?article=${encodeURIComponent(article.id)}`}
      className="block px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--border)]/50 transition-colors"
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

      {/* Summary - only show for unread */}
      {article.summary && isUnread && (
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
    prevProps.sourcePath === nextProps.sourcePath
  );
});

const ArticleList = React.memo(function ArticleList({
  articles,
  showFeedName = false,
  feedNames = {},
  fromPath,
}: ArticleListProps) {
  const pathname = usePathname();
  const sourcePath = fromPath || pathname;

  if (articles.length === 0) {
    return (
      <div className="py-16 px-4 text-center text-[var(--muted)]">
        <p className="text-base mb-1">No articles</p>
        <p className="text-sm">Articles will appear here when you add feeds</p>
      </div>
    );
  }

  return (
    <>
      {articles.map((article) => (
        <ArticleItem
          key={article.id}
          article={article}
          showFeedName={showFeedName}
          feedName={feedNames[article.feedId]}
          sourcePath={sourcePath}
        />
      ))}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if the filtered articles actually changed
  if (prevProps.articles.length !== nextProps.articles.length) return false;
  if (prevProps.showFeedName !== nextProps.showFeedName) return false;
  if (prevProps.fromPath !== nextProps.fromPath) return false;

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
