// ArticleList component - displays a list of articles

import Link from "next/link";
import { format } from "date-fns";
import type { Article } from "@/lib/types";

interface ArticleListProps {
  articles: Article[];
  showFeedName?: boolean;
  feedNames?: Record<string, string>; // feedId -> feedName mapping
}

export default function ArticleList({
  articles,
  showFeedName = false,
  feedNames = {},
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
        <p className="text-lg mb-2">No articles yet</p>
        <p className="text-sm">Articles will appear here when you add feeds</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article) => (
        <Link
          key={article.id}
          href={`/articles/${article.id}`}
          className="block border border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title with unread indicator */}
              <h3
                className={`font-bold text-lg mb-1 ${
                  !article.isRead
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {article.title}
                {!article.isRead && (
                  <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </h3>

              {/* Feed name */}
              {showFeedName && feedNames[article.feedId] && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {feedNames[article.feedId]}
                </div>
              )}

              {/* Summary */}
              {article.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                  {article.summary}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {article.publishedAt && (
                  <span>
                    {format(new Date(article.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                )}
                {article.isStarred && (
                  <span className="text-yellow-500 font-medium">★ Starred</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
