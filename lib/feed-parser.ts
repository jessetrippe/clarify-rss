// Mock feed parser for Phase 2
// This will be replaced with real RSS parsing in Phase 5

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
 * Mock feed parser that returns fake data for testing
 * This will be replaced with real rss-parser implementation in Phase 5
 */
export async function parseFeed(url: string): Promise<ParsedFeed> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Extract domain for mock feed title
  let domain = url;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace("www.", "");
  } catch {
    // If URL parsing fails, use the raw URL
  }

  // Generate mock feed data
  return {
    title: `${domain} Feed`,
    url,
    articles: generateMockArticles(url, 5),
  };
}

/**
 * Generate mock articles for testing
 */
function generateMockArticles(
  feedUrl: string,
  count: number
): ParsedArticle[] {
  const articles: ParsedArticle[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const date = new Date(now - i * 3600000); // 1 hour apart
    articles.push({
      guid: `${feedUrl}/article-${i + 1}`,
      url: `${feedUrl}/article-${i + 1}`,
      title: `Article ${i + 1}: Sample Title`,
      content: `<p>This is <strong>sample content</strong> for article ${i + 1}.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`,
      summary: `This is a sample summary for article ${i + 1}.`,
      publishedAt: date,
    });
  }

  return articles;
}

/**
 * Attempt to discover feed URLs from an HTML page
 * Returns an array of discovered feed URLs
 */
export async function discoverFeeds(url: string): Promise<string[]> {
  // Mock implementation - in real version, this would fetch HTML and parse <link> tags
  await new Promise((resolve) => setTimeout(resolve, 300));

  // For mock, just return some common feed URL patterns
  const baseUrl = url.replace(/\/$/, "");
  return [
    `${baseUrl}/feed`,
    `${baseUrl}/rss`,
    `${baseUrl}/atom.xml`,
  ];
}
