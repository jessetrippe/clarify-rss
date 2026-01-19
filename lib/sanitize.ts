// HTML sanitization utility using DOMPurify

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content for safe rendering
 * Strips dangerous tags and adds security attributes
 *
 * IMPORTANT: This function must only be called on the client side.
 * Server-side rendering should handle content differently.
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === "undefined") {
    // Server-side: return empty string (will be sanitized on client)
    // This is expected behavior for SSR - content renders on hydration
    return "";
  }

  // Configure DOMPurify with strict settings
  const config = {
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
      "figure",
      "figcaption",
    ],
    // Allow only safe attributes - explicitly list what's allowed
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "loading", "target", "rel"],
    // Forbid data: and javascript: URLs
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Don't allow data attributes which could contain malicious content
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  };

  // First pass: sanitize HTML
  let sanitized = DOMPurify.sanitize(html, config) as string;

  // Use DOMPurify hooks for safe attribute addition instead of regex
  // This avoids potential XSS from regex replacement on sanitized content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = sanitized;

  // Add lazy loading to images
  const images = tempDiv.querySelectorAll("img");
  images.forEach((img) => {
    img.setAttribute("loading", "lazy");
  });

  // Ensure all links open in new tab with security attributes
  const links = tempDiv.querySelectorAll("a");
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  // Final sanitization pass to ensure our modifications are safe
  return DOMPurify.sanitize(tempDiv.innerHTML, config) as string;
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
