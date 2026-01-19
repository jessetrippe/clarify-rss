import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  maxRedirects: 5,
});

export interface ParsedFeed {
  title: string;
  url: string;
  iconUrl?: string;
  articles: ParsedArticle[];
}

export interface ParsedArticle {
  guid?: string;
  url?: string;
  title: string;
  content?: string;
  summary?: string;
  publishedAt?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "\u2014",
    "&ndash;": "\u2013",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&hellip;": "\u2026",
    "&copy;": "\u00A9",
    "&reg;": "\u00AE",
    "&trade;": "\u2122",
  };

  let result = text;

  for (const [entity, char] of Object.entries(namedEntities)) {
    result = result.split(entity).join(char);
  }

  result = result.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(Number.parseInt(dec, 10))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );

  return result;
}

async function fetchFeedText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Clarify RSS/1.0",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  try {
    const xml = await fetchFeedText(url);
    const feed = await parser.parseString(xml);

    const articles: ParsedArticle[] = feed.items.map((item) => ({
      guid: item.guid || item.id,
      url: item.link,
      title: decodeHtmlEntities(item.title || "Untitled"),
      content: item.content || (item as { "content:encoded"?: string })["content:encoded"],
      summary: item.contentSnippet || item.summary,
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : item.isoDate
          ? new Date(item.isoDate).toISOString()
          : undefined,
    }));

    const iconUrl = resolveFeedIconUrl(feed, url);

    return {
      title: decodeHtmlEntities(feed.title || url),
      url,
      iconUrl,
      articles,
    };
  } catch (error) {
    console.error("Feed parsing error:", error);
    throw new Error(
      `Failed to parse feed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function resolveFeedIconUrl(feed: any, url: string): string | undefined {
  const rawIcon = feed.image?.url || feed.icon || feed.logo;
  if (rawIcon) {
    try {
      return new URL(rawIcon, url).toString();
    } catch {
      return rawIcon;
    }
  }

  try {
    const origin = new URL(feed.link || url).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

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

    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi;
    const linkRegex2 = /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/gi;

    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      feeds.push(new URL(match[2], url).toString());
    }
    while ((match = linkRegex2.exec(html)) !== null) {
      feeds.push(new URL(match[2], url).toString());
    }

    if (feeds.length === 0) {
      const baseUrl = new URL(url);
      const commonPaths = ["/feed", "/rss", "/atom.xml", "/rss.xml", "/feed.xml"];
      for (const path of commonPaths) {
        feeds.push(`${baseUrl.origin}${path}`);
      }
    }

    return [...new Set(feeds)];
  } catch (error) {
    console.error("Feed discovery error:", error);
    return [];
  }
}
