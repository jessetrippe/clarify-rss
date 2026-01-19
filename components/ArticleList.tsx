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
  return (
    <Link
      href={`${sourcePath}?article=${encodeURIComponent(article.id)}`}
      className={`p-4 transition-colors flex items-start justify-between gap-4 border-t-1 border-black/15 dark:border-white/15 ${
        article.isRead === 0
          ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          : "bg-gray-50 dark:bg-gray-900/60 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
        <div className="flex-1 min-w-0">
          {/* Title with unread indicator */}
          <h3
            className={`text-lg mb-1 ${
              article.isRead === 0
                ? "font-semibold text-gray-900 dark:text-gray-100"
                : "font-normal text-gray-500 dark:text-gray-500"
            }`}
          >
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p
              className={`text-sm line-clamp-2 mb-2 ${
                article.isRead === 0
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {article.summary}
            </p>
          )}

          {/* Metadata */}
          <div
            className={`flex items-center gap-3 text-xs ${
              article.isRead === 0
                ? "text-gray-500"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {showFeedName && feedName && (
              <span>{feedName}</span>
            )}
            {article.publishedAt && (
              <span>
                {format(new Date(article.publishedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
            {article.isStarred === 1 && (
              <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                <StarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Starred
              </span>
            )}
          </div>
        </div>
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
      <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
        <p className="text-lg mb-2">No articles yet</p>
        <p className="text-sm">Articles will appear here when you add feeds</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {articles.map((article) => (
        <ArticleItem
          key={article.id}
          article={article}
          showFeedName={showFeedName}
          feedName={feedNames[article.feedId]}
          sourcePath={sourcePath}
        />
      ))}
    </div>
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
