/**
 * Shared HTML utility functions
 */

/**
 * Decodes HTML entities in a string to their character equivalents.
 * Handles named entities (e.g., &amp;), decimal numeric entities (e.g., &#123;),
 * and hexadecimal numeric entities (e.g., &#x7B;).
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
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

  // Replace named entities
  for (const [entity, char] of Object.entries(namedEntities)) {
    result = result.split(entity).join(char);
  }

  // Replace decimal numeric entities (e.g., &#8217;)
  result = result.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(Number.parseInt(dec, 10))
  );

  // Replace hexadecimal numeric entities (e.g., &#x2019;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );

  return result;
}

/**
 * Extracts plain text length from HTML by stripping tags and normalizing whitespace.
 */
export function getTextLength(html?: string): number {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
}
