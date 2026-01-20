"use client";

import { useState } from "react";
import { addFeed, getFeedByUrl, addArticle, updateFeed, restoreFeedArticles } from "@/lib/db-operations";
import { parseFeedFromApi, discoverFeedsFromApi, type FeedArticleData } from "@/lib/feed-api";
import { cardClass, inputClass } from "@/components/ui/classes";
import { feedLogger } from "@/lib/logger";

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
      const existingFeed = await getFeedByUrl(url);
      if (existingFeed && existingFeed.isDeleted === 0) {
        setError("This feed already exists");
        setIsLoading(false);
        return;
      }

      // Try to parse as feed
      try {
        const feedData = await parseFeedFromApi(url);

        // Add feed to database
        const feed = existingFeed
          ? await updateFeed(existingFeed.id, {
              title: feedData.title,
              iconUrl: feedData.iconUrl,
              isDeleted: 0,
            }).then(() => ({
              ...existingFeed,
              title: feedData.title,
              iconUrl: feedData.iconUrl,
              isDeleted: 0,
            }))
          : await addFeed({
              url,
              title: feedData.title,
              iconUrl: feedData.iconUrl,
            });

        if (existingFeed?.isDeleted === 1) {
          await restoreFeedArticles(feed.id);
        }

        // Add initial articles
        const articlePromises = feedData.articles.map((article: FeedArticleData) =>
          addArticle({
            feedId: feed.id,
            guid: article.guid,
            url: article.url,
            title: article.title,
            content: article.content,
            summary: article.summary,
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
          })
        );
        await Promise.all(articlePromises);

        // Success!
        setUrl("");
        setIsLoading(false);
        if (onSuccess) onSuccess();
      } catch (parseError) {
        // Feed parsing failed, try auto-discovery
        const discovered = await discoverFeedsFromApi(url);

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
      feedLogger.error("Error adding feed:", err);
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
    <div className={cardClass}>
      <h2 className="text-sm font-medium uppercase tracking-wider text-[var(--muted)] mb-3">Add Feed</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter feed URL (e.g., https://example.com/feed)"
            className={inputClass}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {discoveredFeeds.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--muted)]">
              Try one of these:
            </p>
            <div className="space-y-1">
              {discoveredFeeds.map((feedUrl) => (
                <button
                  key={feedUrl}
                  type="button"
                  onClick={() => handleDiscoveredFeedClick(feedUrl)}
                  className="block w-full text-left px-3 py-2 text-sm bg-[var(--border)]/50 hover:bg-[var(--border)] rounded transition-colors truncate"
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
          className="w-full px-4 py-2.5 bg-[var(--accent)] text-white rounded text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isLoading ? "Adding Feed..." : "Add Feed"}
        </button>
      </form>
    </div>
  );
}
