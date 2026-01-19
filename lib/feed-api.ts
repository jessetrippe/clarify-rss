/**
 * Shared feed API utilities for parsing and discovering RSS feeds
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export interface FeedArticleData {
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  publishedAt?: string;
}

export interface FeedData {
  title: string;
  url: string;
  iconUrl?: string;
  articles: FeedArticleData[];
}

/**
 * Parse a feed URL using the backend API
 */
export async function parseFeedFromApi(url: string): Promise<FeedData> {
  const response = await fetch(`${API_URL}/api/feeds/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to parse feed (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

/**
 * Discover feed URLs from a website using the backend API
 */
export async function discoverFeedsFromApi(url: string): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/feeds/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to discover feeds (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  return data.feeds || [];
}
