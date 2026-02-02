/**
 * Shared feed API utilities for parsing and discovering RSS feeds
 */

import { validateUrl } from "./validation";
import { getAccessToken } from "@/lib/supabase/auth";
import { fetchWithTimeout } from "@/lib/fetch-utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  // Validate and normalize the URL
  const validatedUrl = validateUrl(url);
  const accessToken = await getAccessToken();

  const response = await fetchWithTimeout(`${API_URL}/api/feeds/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
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
  const accessToken = await getAccessToken();

  const response = await fetchWithTimeout(`${API_URL}/api/feeds/discover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
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

export interface ExtractArticleResult {
  success: boolean;
  content?: string;
  title?: string;
  error?: string;
}

/**
 * Extract full article content from a URL using the backend API
 */
export async function extractArticleContent(
  articleId: string,
  url: string,
  feedId?: string
): Promise<ExtractArticleResult> {
  const accessToken = await getAccessToken();
  const response = await fetchWithTimeout(`${API_URL}/api/articles/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ articleId, url, feedId }),
  });

  if (!response.ok) {
    // Handle rate limiting
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const retryAfter = data.retryAfter || 60;
      return {
        success: false,
        error: `Rate limited. Please try again in ${retryAfter} seconds.`,
      };
    }

    const errorText = await response.text().catch(() => "Unknown error");
    return {
      success: false,
      error: `Failed to extract article (${response.status}): ${errorText}`,
    };
  }

  const data = await response.json();
  return data;
}
