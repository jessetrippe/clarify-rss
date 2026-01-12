// Feed fetching and parsing for Cloudflare Workers

import Parser from "rss-parser";
import type { Env, Feed, Article } from "./types";

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  maxRedirects: 5,
});

export interface ParsedFeed {
  title: string;
  url: string;
  articles: ParsedArticle[];
}

export interface ParsedArticle {
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  publishedAt?: Date;
}

/**
 * Fetch and parse an RSS/Atom feed
 */
export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  try {
    // Fetch and parse feed
    const feed = await parser.parseURL(url);

    // Extract articles
    const articles: ParsedArticle[] = feed.items.map((item) => ({
      guid: item.guid || item.id,
      url: item.link,
      title: item.title || "Untitled",
      content: item.content || item["content:encoded"],
      summary: item.contentSnippet || item.summary,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    }));

    return {
      title: feed.title || url,
      url,
      articles,
    };
  } catch (error) {
    console.error("Feed parsing error:", error);
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Discover feed URLs from an HTML page
 * Looks for <link rel="alternate" type="application/rss+xml"> tags
 */
export async function discoverFeeds(url: string): Promise<string[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Clarify RSS/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const feeds: string[] = [];

    // Simple regex to find feed links (not perfect but works for most cases)
    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi;
    const linkRegex2 = /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/gi;

    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      feeds.push(match[2]);
    }
    while ((match = linkRegex2.exec(html)) !== null) {
      feeds.push(match[2]);
    }

    // Try common feed URLs if nothing found
    if (feeds.length === 0) {
      const baseUrl = new URL(url);
      const commonPaths = ["/feed", "/rss", "/atom.xml", "/rss.xml", "/feed.xml"];
      for (const path of commonPaths) {
        feeds.push(`${baseUrl.origin}${path}`);
      }
    }

    return [...new Set(feeds)]; // Remove duplicates
  } catch (error) {
    console.error("Feed discovery error:", error);
    return [];
  }
}

/**
 * Check if feed should be refreshed (rate limiting)
 * Returns true if feed can be refreshed
 */
export function canRefreshFeed(feed: Feed): boolean {
  const now = Date.now();
  const MIN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  if (!feed.last_fetched_at) {
    return true; // Never fetched before
  }

  return now - feed.last_fetched_at >= MIN_REFRESH_INTERVAL;
}
