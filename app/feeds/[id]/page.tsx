"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getFeedById,
  getArticlesByFeed,
  deleteFeed,
} from "@/lib/db-operations";
import type { Feed, Article } from "@/lib/types";
import { format } from "date-fns";

export default function FeedDetail() {
  const params = useParams();
  const router = useRouter();
  const feedId = params.id as string;

  const [feed, setFeed] = useState<Feed | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeedData = async () => {
      setIsLoading(true);
      try {
        const [feedData, articlesData] = await Promise.all([
          getFeedById(feedId),
          getArticlesByFeed(feedId),
        ]);

        if (!feedData) {
          router.push("/feeds");
          return;
        }

        setFeed(feedData);
        setArticles(articlesData);
      } catch (error) {
        console.error("Error loading feed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedData();
  }, [feedId, router]);

  const handleDeleteFeed = async () => {
    if (!feed) return;

    if (confirm(`Are you sure you want to delete "${feed.title}"?`)) {
      try {
        await deleteFeed(feed.id);
        router.push("/feeds");
      } catch (error) {
        console.error("Error deleting feed:", error);
        alert("Failed to delete feed");
      }
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/feeds"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to Feeds
          </Link>
        </div>
        <div className="text-gray-500 text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div>
        <div className="mb-6">
          <Link
            href="/feeds"
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            ← Back to Feeds
          </Link>
        </div>
        <div className="text-gray-500 text-center py-12">Feed not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/feeds"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          ← Back to Feeds
        </Link>
      </div>

      {/* Feed Info */}
      <div className="mb-6 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{feed.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {feed.url}
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>{articles.length} articles</span>
              {feed.lastFetchedAt && (
                <span>
                  Last updated:{" "}
                  {format(new Date(feed.lastFetchedAt), "PPp")}
                </span>
              )}
            </div>
            {feed.lastError && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                Error: {feed.lastError}
              </div>
            )}
          </div>
          <button
            onClick={handleDeleteFeed}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete Feed
          </button>
        </div>
      </div>

      {/* Articles List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Articles ({articles.length})
        </h2>

        {articles.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-lg mb-2">No articles yet</p>
            <p className="text-sm">
              Articles will appear here when the feed is refreshed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${encodeURIComponent(article.id)}`}
                className="block border border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold text-lg mb-1 ${!article.isRead ? "text-blue-600 dark:text-blue-400" : ""}`}
                    >
                      {article.title}
                      {!article.isRead && (
                        <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </h3>
                    {article.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {article.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {article.publishedAt && (
                        <span>
                          {format(new Date(article.publishedAt), "PPp")}
                        </span>
                      )}
                      {article.isStarred && (
                        <span className="text-yellow-500">★ Starred</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
