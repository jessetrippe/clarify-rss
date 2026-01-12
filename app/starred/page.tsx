"use client";

import { useState, useEffect } from "react";
import { getStarredArticles, getAllFeeds } from "@/lib/db-operations";
import type { Article, Feed } from "@/lib/types";
import ArticleList from "@/components/ArticleList";

export default function Starred() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [feedNames, setFeedNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [articlesData, feedsData] = await Promise.all([
          getStarredArticles(),
          getAllFeeds(),
        ]);

        setArticles(articlesData);

        // Create feedId -> feedName mapping
        const names: Record<string, string> = {};
        feedsData.forEach((feed: Feed) => {
          names[feed.id] = feed.title;
        });
        setFeedNames(names);
      } catch (error) {
        console.error("Error loading starred articles:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Starred</h1>
        <div className="text-gray-500 text-center py-12">Loading starred articles...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Starred</h1>
        {articles.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {articles.length} starred {articles.length === 1 ? "article" : "articles"}
          </div>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-lg mb-2">No starred articles</p>
          <p className="text-sm">
            Star articles to save them for later
          </p>
        </div>
      ) : (
        <ArticleList articles={articles} showFeedName={true} feedNames={feedNames} />
      )}
    </div>
  );
}
