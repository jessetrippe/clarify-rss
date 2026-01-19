import type { Feed } from "./types";

export function getFeedOrigin(feed: Feed): string | undefined {
  try {
    return new URL(feed.url).origin;
  } catch {
    return undefined;
  }
}

function getDuckDuckGoFaviconUrl(feed: Feed): string | undefined {
  try {
    const { hostname } = new URL(feed.url);
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  } catch {
    return undefined;
  }
}

function getGoogleFaviconUrl(feed: Feed): string | undefined {
  try {
    const origin = new URL(feed.url).origin;
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(origin)}`;
  } catch {
    return undefined;
  }
}

function getOriginFaviconUrl(feed: Feed): string | undefined {
  const origin = getFeedOrigin(feed);
  return origin ? `${origin}/favicon.ico` : undefined;
}

export function getFeedIconCandidates(feed: Feed): string[] {
  const candidates = [
    feed.iconUrl,
    getDuckDuckGoFaviconUrl(feed),
    getGoogleFaviconUrl(feed),
    getOriginFaviconUrl(feed),
  ].filter(Boolean) as string[];

  return [...new Set(candidates)];
}
