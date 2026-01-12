"use client";

import { useState } from "react";
import { addFeed, feedExists, addArticle } from "@/lib/db-operations";
import { parseFeed, discoverFeeds } from "@/lib/feed-parser";

interface AddFeedFormProps {
  onSuccess?: () => void;
}

export default function AddFeedForm({ onSuccess }: AddFeedFormProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [discoveredFeeds, setDiscoveredFeeds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a feed URL");
      return;
    }

    setIsLoading(true);
    setError("");
    setDiscoveredFeeds([]);

    try {
      // Check if feed already exists
      const exists = await feedExists(url);
      if (exists) {
        setError("This feed already exists");
        setIsLoading(false);
        return;
      }

      // Try to parse as feed
      try {
        const feedData = await parseFeed(url);

        // Add feed to database
        const feed = await addFeed({
          url,
          title: feedData.title,
        });

        // Add initial articles
        const articlePromises = feedData.articles.map((article) =>
          addArticle({
            feedId: feed.id,
            guid: article.guid,
            url: article.url,
            title: article.title,
            content: article.content,
            summary: article.summary,
            publishedAt: article.publishedAt,
          })
        );
        await Promise.all(articlePromises);

        // Success!
        setUrl("");
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } catch (parseError) {
        // Feed parsing failed, try auto-discovery
        console.log("Feed parsing failed, attempting discovery...", parseError);
        const discovered = await discoverFeeds(url);

        if (discovered.length > 0) {
          setDiscoveredFeeds(discovered);
          setError(
            "Could not parse feed. Found these potential feed URLs - click one to try:"
          );
        } else {
          setError(
            "Could not parse feed at this URL. Please check the URL and try again."
          );
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error adding feed:", err);
      setError("An error occurred while adding the feed");
      setIsLoading(false);
    }
  };

  const handleDiscoveredFeedClick = async (discoveredUrl: string) => {
    setUrl(discoveredUrl);
    setDiscoveredFeeds([]);
    setError("");
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
      <h2 className="text-lg font-bold mb-3">Add Feed</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter feed URL (e.g., https://example.com/feed)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {discoveredFeeds.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Try one of these:
            </p>
            <div className="space-y-1">
              {discoveredFeeds.map((feedUrl) => (
                <button
                  key={feedUrl}
                  type="button"
                  onClick={() => handleDiscoveredFeedClick(feedUrl)}
                  className="block w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  {feedUrl}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? "Adding Feed..." : "Add Feed"}
        </button>
      </form>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Note: Using mock feed parser. Real RSS parsing will be implemented in
        Phase 5.
      </p>
    </div>
  );
}
