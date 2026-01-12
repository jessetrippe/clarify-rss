"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllArticles, getAllFeeds, getCounts } from "@/lib/db-operations";
import type { Article, Feed } from "@/lib/types";
import ArticleList from "@/components/ArticleList";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [feedNames, setFeedNames] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState({ unreadCount: 0, totalArticles: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [articlesData, feedsData, countsData] = await Promise.all([
          getAllArticles(),
          getAllFeeds(),
          getCounts(),
        ]);

        setArticles(articlesData);
        setCounts(countsData);

        // Create feedId -> feedName mapping
        const names: Record<string, string> = {};
        feedsData.forEach((feed: Feed) => {
          names[feed.id] = feed.title;
        });
        setFeedNames(names);
      } catch (error) {
        console.error("Error loading articles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">All Items</h1>
        <div className="text-gray-500 text-center py-12">Loading articles...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Items</h1>
        {counts.totalArticles > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {counts.unreadCount} unread of {counts.totalArticles}
          </div>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-lg mb-2">No articles yet</p>
          <p className="text-sm mb-4">Add your first feed to get started</p>
          <Link
            href="/feeds"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Feeds
          </Link>
        </div>
      ) : (
        <ArticleList articles={articles} showFeedName={true} feedNames={feedNames} />
      )}
    </div>
  );
}
