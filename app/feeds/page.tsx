"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllFeeds, deleteFeed, getArticlesByFeed } from "@/lib/db-operations";
import type { Feed } from "@/lib/types";
import AddFeedForm from "@/components/AddFeedForm";
import OPMLImport from "@/components/OPMLImport";
import { exportOPML } from "@/lib/opml-export";

export default function Feeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [feedCounts, setFeedCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadFeeds = async () => {
    setIsLoading(true);
    try {
      const feedsData = await getAllFeeds();
      setFeeds(feedsData);

      // Get article counts for each feed
      const counts: Record<string, number> = {};
      await Promise.all(
        feedsData.map(async (feed) => {
          const articles = await getArticlesByFeed(feed.id);
          counts[feed.id] = articles.length;
        })
      );
      setFeedCounts(counts);
    } catch (error) {
      console.error("Error loading feeds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleDeleteFeed = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteFeed(id);
        loadFeeds();
      } catch (error) {
        console.error("Error deleting feed:", error);
        alert("Failed to delete feed");
      }
    }
  };

  const handleExportOPML = async () => {
    try {
      await exportOPML(feeds);
    } catch (error) {
      console.error("Error exporting OPML:", error);
      alert("Failed to export OPML");
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Feeds</h1>
        <div className="text-gray-500 text-center py-12">Loading feeds...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Feeds</h1>
        {feeds.length > 0 && (
          <button
            onClick={handleExportOPML}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Export OPML
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Add Feed Form */}
        <AddFeedForm onSuccess={loadFeeds} />

        {/* OPML Import */}
        <OPMLImport onSuccess={loadFeeds} />

        {/* Feed List */}
        {feeds.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-lg mb-2">No feeds yet</p>
            <p className="text-sm">Add your first RSS feed above to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xl font-bold">Your Feeds ({feeds.length})</h2>
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <Link href={`/feeds/${feed.id}`} className="flex-1">
                    <h3 className="font-bold text-lg hover:text-blue-600 dark:hover:text-blue-400">
                      {feed.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {feed.url}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{feedCounts[feed.id] || 0} articles</span>
                      {feed.lastFetchedAt && (
                        <span>
                          Last updated:{" "}
                          {new Date(feed.lastFetchedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {feed.lastError && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Error: {feed.lastError}
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={() => handleDeleteFeed(feed.id, feed.title)}
                    className="ml-4 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
