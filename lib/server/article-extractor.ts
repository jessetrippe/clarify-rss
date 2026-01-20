import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { decodeHtmlEntities, getTextLength } from "@/lib/html-utils";

export interface ExtractionResult {
  success: boolean;
  content?: string;
  title?: string;
  excerpt?: string;
  error?: string;
}

const MIN_CONTENT_LENGTH = 100;
const PREFERRED_CONTENT_LENGTH = 800;

type ExtractedContent = { content?: string; title?: string };
type TextExtraction = { text?: string; title?: string };

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToParagraphs(text: string): string {
  const parts = text
    .split(/\n{2,}|\r\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.map((part) => `<p>${escapeHtml(part)}</p>`).join("");
}

function isLikelyContentText(text: string): boolean {
  if (!text || text.length < 200) return false;
  if (text.includes("data:image") || text.includes("base64,")) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 80) return false;
  const spaceRatio = words.join(" ").length / text.length;
  if (spaceRatio < 0.6) return false;
  const hasSentence = /[.!?]\s/.test(text);
  return hasSentence;
}

function isLikelyParagraphText(text: string): boolean {
  if (!text || text.length < 80) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 12;
}

function collectTextFromRichNode(node: unknown): string[] {
  if (!node) return [];
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(collectTextFromRichNode);
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (record.type === "paragraph") {
      return collectTextFromRichNode(record.children);
    }
    if (typeof record.text === "string") return [record.text];
    return Object.values(record).flatMap(collectTextFromRichNode);
  }
  return [];
}

function extractTextFromNextData(document: Document): TextExtraction {
  const script = document.querySelector('script#__NEXT_DATA__');
  if (!script || !script.textContent) return {};

  try {
    const data = JSON.parse(script.textContent);
    const texts: string[] = [];
    const paragraphParts: string[] = [];

    const visit = (node: unknown) => {
      if (typeof node === "string") {
        if (isLikelyContentText(node)) texts.push(node);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node && typeof node === "object") {
        const record = node as Record<string, unknown>;
        const directTextKeys = ["body", "content", "articleBody", "description", "excerpt"];
        for (const key of directTextKeys) {
          const value = record[key];
          if (typeof value === "string" && isLikelyContentText(value)) {
            texts.push(value);
          }
        }
        if (record.type === "paragraph") {
          const paragraphText = collectTextFromRichNode(record.children).join("");
          if (isLikelyParagraphText(paragraphText)) {
            paragraphParts.push(paragraphText.trim());
          } else if (isLikelyContentText(paragraphText)) {
            texts.push(paragraphText);
          }
        }
        Object.values(record).forEach(visit);
      }
    };

    visit(data);

    const joinedParagraphs =
      paragraphParts.length >= 3 ? paragraphParts.join("\n\n") : undefined;
    const bestText = texts.sort((a, b) => b.length - a.length)[0];
    const finalText =
      joinedParagraphs && joinedParagraphs.length > (bestText?.length || 0)
        ? joinedParagraphs
        : bestText;
    const title =
      (data?.props?.pageProps?.seo?.title as string | undefined) ||
      (data?.props?.pageProps?.seo?.headline as string | undefined);
    return { text: finalText, title };
  } catch {
    return {};
  }
}

function findLongestHtmlString(value: unknown): string | undefined {
  let best: string | undefined;

  const visit = (node: unknown) => {
    if (typeof node === "string") {
      if (node.includes("<p") && node.includes("</p>") && node.length > (best?.length || 0)) {
        best = node;
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node && typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };

  visit(value);
  return best;
}

function extractFromNextData(document: Document): ExtractedContent {
  const script = document.querySelector('script#__NEXT_DATA__');
  if (!script || !script.textContent) return {};

  try {
    const data = JSON.parse(script.textContent);
    const content = findLongestHtmlString(data);
    const title =
      (data?.props?.pageProps?.seo?.title as string | undefined) ||
      (data?.props?.pageProps?.seo?.headline as string | undefined);
    return { content, title };
  } catch {
    return {};
  }
}

function extractFromJsonLd(document: Document): ExtractedContent {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  let bestBody: string | undefined;
  let bestTitle: string | undefined;

  for (const script of scripts) {
    if (!script.textContent) continue;
    try {
      const data = JSON.parse(script.textContent);
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;
        const body = (item as { articleBody?: string; description?: string }).articleBody
          || (item as { description?: string }).description;
        const title = (item as { headline?: string; name?: string }).headline
          || (item as { name?: string }).name;
        if (body && body.length > (bestBody?.length || 0)) {
          bestBody = body;
          bestTitle = title || bestTitle;
        }
      }
    } catch {
      continue;
    }
  }

  if (!bestBody) return {};
  return { content: textToParagraphs(bestBody), title: bestTitle };
}

function extractFromArticleElement(document: Document): ExtractedContent {
  // Try semantic elements first, then common WordPress/CMS content containers
  const selectors = [
    "article",
    "main",
    ".post-content",
    ".entry-content",
    ".article-content",
    ".post-body",
    ".content-area",
    '[class*="post-container"]',
    '[class*="article-body"]',
  ];

  let container: Element | null = null;
  for (const selector of selectors) {
    container = document.querySelector(selector);
    if (container) break;
  }

  if (!container) return {};

  const paragraphs = Array.from(container.querySelectorAll("p"))
    .map((p) => p.textContent?.replace(/\s+/g, " ").trim() || "")
    .filter((text) => text.length >= 40);

  // Lower threshold to 2 paragraphs for shorter articles
  if (paragraphs.length < 2) return {};

  return { content: textToParagraphs(paragraphs.join("\n\n")) };
}

function extractParagraphsWithRegex(html: string): string[] {
  // Simple regex-based extraction as a fallback when DOM parsing fails
  // Find the earliest "end of content" marker and cut there
  const cutoffPatterns = [
    /<(?:div|section)[^>]*(?:id|class)="[^"]*comments?[-_]?(?:section|area|list)/i,
    /<h\d[^>]*>\s*(?:Leave a reply|Comments|Related Posts)/i,
    /id="respond"/i,
  ];

  let cutoffPoint = html.length;
  for (const pattern of cutoffPatterns) {
    const match = html.search(pattern);
    // Only cut if match is in the latter half of the document (avoid header matches)
    if (match > html.length / 3 && match < cutoffPoint) {
      cutoffPoint = match;
    }
  }

  const contentArea = html.slice(0, cutoffPoint);

  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let match;

  while ((match = paragraphRegex.exec(contentArea)) !== null) {
    // Strip inner HTML tags and normalize whitespace
    const text = decodeHtmlEntities(
      match[1].replace(/<[^>]*>/g, " ")
    )
      .replace(/\s+/g, " ")
      .trim();

    if (text.length >= 30) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
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

    // Limit content size to prevent abuse and reduce storage costs
    const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2MB
    if (html.length > MAX_CONTENT_LENGTH) {
      return {
        success: false,
        error: "Page content too large",
      };
    }

    if (!html || html.length < 100) {
      return {
        success: false,
        error: "Page content too short or empty",
      };
    }

    const candidates: ExtractedContent[] = [];

    // Try DOM-based parsing, but fall back to regex if it fails (e.g., canvas errors)
    let document: Document | null = null;
    try {
      document = parseHTML(html).document;
    } catch {
      // parseHTML failed, will use regex fallback below
    }

    // DOM-based extraction methods (only if parseHTML succeeded)
    if (document) {
      // Readability can fail on some pages (e.g., canvas-related errors with images)
      try {
        const reader = new Readability(document, {
          keepClasses: false,
          disableJSONLD: true,
        });
        const article = reader.parse();
        if (article?.content) {
          const content = article.content;
          const title = article.title || undefined;
          candidates.push({ content, title });
        }
      } catch {
        // Readability failed
      }

      try {
        candidates.push(extractFromNextData(document));
      } catch {
        // extractFromNextData failed
      }

      try {
        const nextText = extractTextFromNextData(document);
        if (nextText.text) {
          candidates.push({ content: textToParagraphs(nextText.text), title: nextText.title });
        }
      } catch {
        // extractTextFromNextData failed
      }

      try {
        candidates.push(extractFromArticleElement(document));
      } catch {
        // extractFromArticleElement failed
      }

      try {
        candidates.push(extractFromJsonLd(document));
      } catch {
        // extractFromJsonLd failed
      }
    }

    // Regex-based fallback (works even if DOM parsing failed)
    try {
      const paragraphs = extractParagraphsWithRegex(html);
      if (paragraphs.length >= 1) {
        candidates.push({ content: textToParagraphs(paragraphs.join("\n\n")) });
      }
    } catch {
      // Regex extraction failed
    }

    const best = candidates
      .filter((candidate) => candidate.content)
      .sort((a, b) => getTextLength(b.content) - getTextLength(a.content))[0];

    const content = best?.content;
    const title = best?.title;

    if (!content) {
      return {
        success: false,
        error: "Could not extract article content",
      };
    }

    const finalLength = getTextLength(content);
    if (finalLength < MIN_CONTENT_LENGTH) {
      return {
        success: false,
        error: "Extracted content too short",
      };
    }

    return {
      success: true,
      content,
      title,
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
