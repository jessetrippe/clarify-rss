"use client";

import { useState, useEffect } from "react";
import {
  getAllFeeds,
  addFeed,
  deleteFeed,
  getAllArticles,
  addArticle,
  toggleArticleRead,
  toggleArticleStarred,
  getCounts,
  clearAllData,
} from "@/lib/db-operations";
import type { Feed, Article } from "@/lib/types";

export default function TestDatabase() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState({
    totalFeeds: 0,
    totalArticles: 0,
    unreadCount: 0,
    starredCount: 0,
  });
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedTitle, setNewFeedTitle] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    try {
      const [feedsData, articlesData, countsData] = await Promise.all([
        getAllFeeds(),
        getAllArticles(),
        getCounts(),
      ]);
      setFeeds(feedsData);
      setArticles(articlesData);
      setCounts(countsData);
    } catch (error) {
      console.error("Error loading data:", error);
      setStatus("Error loading data");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFeed = async () => {
    if (!newFeedUrl || !newFeedTitle) {
      setStatus("Please enter both URL and title");
      return;
    }

    try {
      await addFeed({ url: newFeedUrl, title: newFeedTitle });
      setNewFeedUrl("");
      setNewFeedTitle("");
      setStatus("Feed added successfully!");
      loadData();
    } catch (error) {
      console.error("Error adding feed:", error);
      setStatus("Error adding feed");
    }
  };

  const handleDeleteFeed = async (id: string) => {
    try {
      await deleteFeed(id);
      setStatus("Feed deleted");
      loadData();
    } catch (error) {
      console.error("Error deleting feed:", error);
      setStatus("Error deleting feed");
    }
  };

  const handleAddTestArticle = async (feedId: string) => {
    try {
      await addArticle({
        feedId,
        title: `Test Article ${Date.now()}`,
        content: "<p>This is a test article with <strong>HTML content</strong>.</p>",
        summary: "A test article summary",
        publishedAt: new Date(),
        url: `https://example.com/article-${Date.now()}`,
      });
      setStatus("Article added!");
      loadData();
    } catch (error) {
      console.error("Error adding article:", error);
      setStatus("Error adding article");
    }
  };

  const handleToggleRead = async (id: string) => {
    try {
      await toggleArticleRead(id);
      loadData();
    } catch (error) {
      console.error("Error toggling read:", error);
    }
  };

  const handleToggleStarred = async (id: string) => {
    try {
      await toggleArticleStarred(id);
      loadData();
    } catch (error) {
      console.error("Error toggling starred:", error);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all data?")) {
      try {
        await clearAllData();
        setStatus("All data cleared");
        loadData();
      } catch (error) {
        console.error("Error clearing data:", error);
        setStatus("Error clearing data");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Test Page</h1>

      {status && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded">
          {status}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 className="text-xl font-bold mb-2">Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">{counts.totalFeeds}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Feeds
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.totalArticles}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Articles
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.unreadCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Unread
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{counts.starredCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Starred
            </div>
          </div>
        </div>
      </div>

      {/* Add Feed Form */}
      <div className="mb-6 p-4 border border-gray-300 dark:border-gray-700 rounded">
        <h2 className="text-xl font-bold mb-3">Add Test Feed</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Feed URL"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
          />
          <input
            type="text"
            placeholder="Feed Title"
            value={newFeedTitle}
            onChange={(e) => setNewFeedTitle(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
          />
          <button
            onClick={handleAddFeed}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Feed
          </button>
        </div>
      </div>

      {/* Feeds List */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Feeds ({feeds.length})</h2>
        <div className="space-y-2">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="p-3 border border-gray-300 dark:border-gray-700 rounded"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold">{feed.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {feed.url}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {feed.id}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddTestArticle(feed.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Add Article
                  </button>
                  <button
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {feeds.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No feeds yet. Add one above!
            </div>
          )}
        </div>
      </div>

      {/* Articles List */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3">Articles ({articles.length})</h2>
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.id}
              className="p-3 border border-gray-300 dark:border-gray-700 rounded"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold">
                    {article.title}
                    {article.isStarred && (
                      <span className="ml-2 text-yellow-500">★</span>
                    )}
                    {!article.isRead && (
                      <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                        UNREAD
                      </span>
                    )}
                  </div>
                  {article.summary && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {article.summary}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {article.publishedAt?.toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleRead(article.id)}
                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                  >
                    {article.isRead ? "Unread" : "Read"}
                  </button>
                  <button
                    onClick={() => handleToggleStarred(article.id)}
                    className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                  >
                    {article.isStarred ? "Unstar" : "Star"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {articles.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No articles yet. Add a feed and then add test articles!
            </div>
          )}
        </div>
      </div>

      {/* Clear All Button */}
      <div className="mb-6">
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear All Data
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        <h3 className="font-bold mb-2">Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Add a test feed using the form above</li>
          <li>Click "Add Article" to create test articles for that feed</li>
          <li>Toggle Read/Unread and Star/Unstar to test state changes</li>
          <li>Refresh the page to verify data persists in IndexedDB</li>
          <li>
            Open DevTools → Application → IndexedDB → ClarifyRSS to inspect the
            database
          </li>
          <li>Use "Clear All Data" to reset when done testing</li>
        </ol>
      </div>
    </div>
  );
}
