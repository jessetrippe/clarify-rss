/**
 * Shared feed API utilities for parsing and discovering RSS feeds
 */

import { validateUrl } from "./validation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

// Request timeout in milliseconds
const REQUEST_TIMEOUT_MS = 30000;

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
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse a feed URL using the backend API
 */
export async function parseFeedFromApi(url: string): Promise<FeedData> {
  // Validate and normalize the URL
  const validatedUrl = validateUrl(url);

  const response = await fetchWithTimeout(`${API_URL}/api/feeds/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: validatedUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to parse feed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  // Validate response structure
  if (!data || typeof data.title !== "string") {
    throw new Error("Invalid response from feed parser");
  }

  return data;
}

/**
 * Discover feed URLs from a website using the backend API
 */
export async function discoverFeedsFromApi(url: string): Promise<string[]> {
  // Validate and normalize the URL
  const validatedUrl = validateUrl(url);

  const response = await fetchWithTimeout(`${API_URL}/api/feeds/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: validatedUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to discover feeds (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  // Validate response structure
  if (!data || !Array.isArray(data.feeds)) {
    return [];
  }

  return data.feeds;
}
