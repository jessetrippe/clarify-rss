// Article content extraction using Mozilla Readability
// Extracts full article content from URLs for RSS feeds that only provide summaries

import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export interface ExtractionResult {
  success: boolean;
  content?: string;
  title?: string;
  excerpt?: string;
  error?: string;
}

/**
 * Fetch a URL with browser-like headers
 * This helps bypass some basic bot detection
 */
async function fetchWithBrowserHeaders(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

/**
 * Extract article content from a URL using Mozilla Readability
 *
 * This works well for sites that include full content in their HTML
 * (for SEO/search indexing) but overlay paywalls with JavaScript.
 * Since we fetch raw HTML server-side, JavaScript doesn't execute.
 */
export async function extractArticleContent(
  url: string
): Promise<ExtractionResult> {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        success: false,
        error: "Invalid URL protocol",
      };
    }

    // Fetch the page
    const response = await fetchWithBrowserHeaders(url);
    const html = await response.text();

    if (!html || html.length < 100) {
      return {
        success: false,
        error: "Page content too short or empty",
      };
    }

    // Parse HTML with linkedom
    const { document } = parseHTML(html);

    // Use Readability to extract the article
    const reader = new Readability(document, {
      // Keep classes for potential styling
      keepClasses: false,
      // Disable JSON-LD parsing to avoid potential issues
      disableJSONLD: true,
    });

    const article = reader.parse();

    if (!article || !article.content) {
      return {
        success: false,
        error: "Could not extract article content",
      };
    }

    // Check if we got meaningful content
    const contentLength = article.content.replace(/<[^>]*>/g, "").trim().length;
    if (contentLength < 100) {
      return {
        success: false,
        error: "Extracted content too short",
      };
    }

    return {
      success: true,
      content: article.content,
      title: article.title || undefined,
      excerpt: article.excerpt || undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle specific error types
    if (errorMessage.includes("HTTP 403")) {
      return {
        success: false,
        error: "Access denied - site may block automated requests",
      };
    }

    if (errorMessage.includes("HTTP 404")) {
      return {
        success: false,
        error: "Article not found",
      };
    }

    if (
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError")
    ) {
      return {
        success: false,
        error: "Could not reach the website",
      };
    }

    return {
      success: false,
      error: `Extraction failed: ${errorMessage}`,
    };
  }
}
