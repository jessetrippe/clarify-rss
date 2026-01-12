// OPML export utility for feed portability

import type { Feed } from "./types";

/**
 * Generate OPML XML from feeds and trigger download
 */
export async function exportOPML(feeds: Feed[]): Promise<void> {
  const opmlContent = generateOPML(feeds);

  // Create blob and download
  const blob = new Blob([opmlContent], { type: "text/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clarify-rss-feeds-${new Date().toISOString().split("T")[0]}.opml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate OPML XML string from feeds
 */
function generateOPML(feeds: Feed[]): string {
  const now = new Date().toUTCString();

  const outlines = feeds
    .map(
      (feed) =>
        `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" />`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Clarify RSS Feeds</title>
    <dateCreated>${now}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
