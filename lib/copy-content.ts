// Copy Content utility - the core feature of Clarify RSS

import { htmlToPlainText } from "./sanitize";
import { uiLogger } from "./logger";

/**
 * Copy article content to clipboard
 * Format: Title + URL + Plain text body
 */
export async function copyArticleContent(params: {
  title: string;
  url?: string;
  content?: string;
  summary?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { title, url, content, summary } = params;

  // Check if Clipboard API is available
  if (!navigator.clipboard) {
    return {
      success: false,
      error: "Clipboard API not available. Please use a modern browser with HTTPS.",
    };
  }

  try {
    // Build the copy content
    const parts: string[] = [];

    // Add title
    parts.push(title);
    parts.push(""); // Blank line

    // Add URL if available
    if (url) {
      parts.push(`Source: ${url}`);
      parts.push(""); // Blank line
    }

    // Add content (convert HTML to plain text)
    if (content) {
      const plainText = htmlToPlainText(content);
      parts.push(plainText);
    } else if (summary) {
      // Fallback to summary if no content
      const plainText = htmlToPlainText(summary);
      parts.push(plainText);
    } else {
      parts.push("(No content available)");
    }

    // Join all parts
    const textToCopy = parts.join("\n");

    // Copy to clipboard
    await navigator.clipboard.writeText(textToCopy);

    return { success: true };
  } catch (error) {
    uiLogger.error("Failed to copy content:", error);

    // Check for permission denied
    if (error instanceof Error && error.name === "NotAllowedError") {
      return {
        success: false,
        error: "Permission denied. Please allow clipboard access.",
      };
    }

    return {
      success: false,
      error: "Failed to copy content. Please try again.",
    };
  }
}
