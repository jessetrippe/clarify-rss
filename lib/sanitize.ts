// HTML sanitization utility using DOMPurify

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content for safe rendering
 * Strips dangerous tags and adds security attributes
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: return empty string (will be sanitized on client)
    return "";
  }

  // Configure DOMPurify
  const config: DOMPurify.Config = {
    // Allow only safe tags
    ALLOWED_TAGS: [
      "p",
      "br",
      "a",
      "img",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "div",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ],
    // Allow safe attributes
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
    // Add target and rel to links
    ADD_ATTR: ["target", "rel"],
  };

  // Sanitize HTML
  let sanitized = DOMPurify.sanitize(html, config);

  // Post-process: add lazy loading to images
  sanitized = sanitized.replace(/<img /g, '<img loading="lazy" ');

  // Post-process: ensure all links open in new tab with security attributes
  sanitized = sanitized.replace(
    /<a /g,
    '<a target="_blank" rel="noopener noreferrer" '
  );

  return sanitized;
}

/**
 * Convert HTML to plain text for copy content feature
 * Strips all HTML tags and formats as readable plain text
 */
export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: basic strip
    return html.replace(/<[^>]*>/g, "").trim();
  }

  // Create a temporary div to leverage browser's text extraction
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove script and style elements
  const scripts = temp.querySelectorAll("script, style");
  scripts.forEach((el) => el.remove());

  // Get text content
  let text = temp.textContent || temp.innerText || "";

  // Clean up whitespace
  text = text
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Multiple newlines to double newline
    .replace(/[ \t]+/g, " ") // Multiple spaces to single space
    .trim();

  return text;
}
