// Article ID generation utility
// Generates stable, unique IDs for articles across feed refreshes

/**
 * Generates a stable article ID using the following priority:
 * 1. GUID (if provided by feed)
 * 2. Link URL (if available)
 * 3. Hash of (feedId + title + publishedAt)
 *
 * This ensures articles maintain the same ID across feed refreshes
 * and prevents duplicate articles from being created.
 */
export function generateArticleId(params: {
  feedId: string;
  guid?: string;
  url?: string;
  title: string;
  publishedAt?: Date;
}): string {
  const { feedId, guid, url, title, publishedAt } = params;

  // Priority 1: Use GUID if available
  if (guid) {
    return `guid:${guid}`;
  }

  // Priority 2: Use URL if available
  if (url) {
    return `url:${url}`;
  }

  // Priority 3: Generate hash from feedId + title + publishedAt
  const timestamp = publishedAt ? publishedAt.getTime() : 0;
  const hashInput = `${feedId}:${title}:${timestamp}`;
  return `hash:${simpleHash(hashInput)}`;
}

/**
 * Simple hash function for generating article IDs
 * Based on djb2 algorithm
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to positive hex string
  return (hash >>> 0).toString(36);
}
