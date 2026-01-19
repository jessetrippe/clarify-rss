import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export interface ExtractionResult {
  success: boolean;
  content?: string;
  title?: string;
  excerpt?: string;
  error?: string;
}

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

export async function extractArticleContent(
  url: string
): Promise<ExtractionResult> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return {
        success: false,
        error: "Invalid URL protocol",
      };
    }

    const response = await fetchWithBrowserHeaders(url);
    const html = await response.text();

    if (!html || html.length < 100) {
      return {
        success: false,
        error: "Page content too short or empty",
      };
    }

    const { document } = parseHTML(html);
    const reader = new Readability(document, {
      keepClasses: false,
      disableJSONLD: true,
    });

    const article = reader.parse();

    if (!article || !article.content) {
      return {
        success: false,
        error: "Could not extract article content",
      };
    }

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
