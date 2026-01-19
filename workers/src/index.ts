// Clarify RSS Sync API Worker

import { syncPull, syncPush } from "./sync";
import { fetchAndParseFeed, discoverFeeds } from "./feed-fetcher";
import { extractArticleContent } from "./article-extractor";
import type { Env, SyncPullRequest, SyncPushRequest } from "./types";
import { checkRateLimit, getClientId, RATE_LIMITS, type RateLimitConfig } from "./rate-limiter";

/**
 * Get CORS headers based on environment
 * In production, restricts to specific frontend domains
 */
function getCorsHeaders(env: Env): Record<string, string> {
  // Use environment variable for allowed origins, default to localhost for development
  const allowedOrigin = env.ALLOWED_ORIGIN || "http://localhost:3000";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function handleOptions(env: Env): Response {
  return new Response(null, {
    headers: getCorsHeaders(env),
  });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env),
    },
  });
}

/**
 * Handle errors
 */
function errorResponse(message: string, env: Env, status = 500): Response {
  return jsonResponse({ error: message }, env, status);
}

/**
 * Validate URL format
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parse JSON body with error handling
 */
async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
}

/**
 * Apply rate limiting to a request
 * Returns a 429 response if rate limit exceeded, null otherwise
 */
function applyRateLimit(
  request: Request,
  env: Env,
  config: RateLimitConfig
): Response | null {
  const clientId = getClientId(request);
  const result = checkRateLimit(clientId, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          ...getCorsHeaders(env),
        },
      }
    );
  }

  return null;
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(env);
    }

    try {
      // Route: POST /api/sync/pull
      if (url.pathname === "/api/sync/pull" && request.method === "POST") {
        const rateLimitResponse = applyRateLimit(request, env, RATE_LIMITS.sync);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await parseJsonBody<SyncPullRequest>(request);
        if (!body) {
          return errorResponse("Invalid JSON body", env, 400);
        }
        const result = await syncPull(body, env);
        return jsonResponse(result, env);
      }

      // Route: POST /api/sync/push
      if (url.pathname === "/api/sync/push" && request.method === "POST") {
        const rateLimitResponse = applyRateLimit(request, env, RATE_LIMITS.sync);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await parseJsonBody<SyncPushRequest>(request);
        if (!body) {
          return errorResponse("Invalid JSON body", env, 400);
        }
        const result = await syncPush(body, env);
        return jsonResponse(result, env);
      }

      // Route: GET /api/health (health check)
      if (url.pathname === "/api/health" && request.method === "GET") {
        // No rate limiting for health checks
        return jsonResponse({ status: "ok", timestamp: Date.now() }, env);
      }

      // Route: POST /api/feeds/parse (parse RSS feed)
      if (url.pathname === "/api/feeds/parse" && request.method === "POST") {
        const rateLimitResponse = applyRateLimit(request, env, RATE_LIMITS.feedParse);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await parseJsonBody<{ url: string }>(request);
        if (!body) {
          return errorResponse("Invalid JSON body", env, 400);
        }
        if (!body.url) {
          return errorResponse("URL required", env, 400);
        }
        if (!isValidUrl(body.url)) {
          return errorResponse("Invalid URL format", env, 400);
        }
        try {
          const feedData = await fetchAndParseFeed(body.url);
          return jsonResponse(feedData, env);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : "Failed to parse feed",
            env,
            400
          );
        }
      }

      // Route: POST /api/feeds/discover (discover feeds from URL)
      if (url.pathname === "/api/feeds/discover" && request.method === "POST") {
        const rateLimitResponse = applyRateLimit(request, env, RATE_LIMITS.feedParse);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await parseJsonBody<{ url: string }>(request);
        if (!body) {
          return errorResponse("Invalid JSON body", env, 400);
        }
        if (!body.url) {
          return errorResponse("URL required", env, 400);
        }
        if (!isValidUrl(body.url)) {
          return errorResponse("Invalid URL format", env, 400);
        }
        const feeds = await discoverFeeds(body.url);
        return jsonResponse({ feeds }, env);
      }

      // Route: POST /api/articles/extract (extract full article content)
      if (url.pathname === "/api/articles/extract" && request.method === "POST") {
        const rateLimitResponse = applyRateLimit(request, env, RATE_LIMITS.articleExtract);
        if (rateLimitResponse) return rateLimitResponse;

        const body = await parseJsonBody<{ articleId: string; url: string }>(request);
        if (!body) {
          return errorResponse("Invalid JSON body", env, 400);
        }
        if (!body.url) {
          return errorResponse("URL required", env, 400);
        }
        if (!body.articleId) {
          return errorResponse("Article ID required", env, 400);
        }
        if (!isValidUrl(body.url)) {
          return errorResponse("Invalid URL format", env, 400);
        }

        const result = await extractArticleContent(body.url);
        return jsonResponse({
          success: result.success,
          content: result.content,
          title: result.title,
          error: result.error,
        }, env);
      }

      // Route: GET / (root)
      if (url.pathname === "/" && request.method === "GET") {
        return jsonResponse({
          name: "Clarify RSS Sync API",
          version: "1.0.0",
          endpoints: [
            "POST /api/sync/pull",
            "POST /api/sync/push",
            "POST /api/feeds/parse",
            "POST /api/feeds/discover",
            "POST /api/articles/extract",
            "GET /api/health",
          ],
        }, env);
      }

      // 404 Not Found
      return errorResponse("Not found", env, 404);
    } catch (error) {
      // Log error for debugging but don't expose details to client
      console.error("Worker error:", error);
      return errorResponse("Internal server error", env);
    }
  },
};

export default handler;
