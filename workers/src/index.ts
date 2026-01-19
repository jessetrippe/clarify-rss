// Clarify RSS Sync API Worker

import { syncPull, syncPush } from "./sync";
import { fetchAndParseFeed, discoverFeeds } from "./feed-fetcher";
import type { Env, SyncPullRequest, SyncPushRequest } from "./types";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Will be restricted to specific domain in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * Handle OPTIONS requests (CORS preflight)
 */
function handleOptions(): Response {
  return new Response(null, {
    headers: corsHeaders,
  });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/**
 * Handle errors
 */
function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions();
    }

    try {
      // Route: POST /api/sync/pull
      if (url.pathname === "/api/sync/pull" && request.method === "POST") {
        const body = (await request.json()) as SyncPullRequest;
        const result = await syncPull(body, env);
        return jsonResponse(result);
      }

      // Route: POST /api/sync/push
      if (url.pathname === "/api/sync/push" && request.method === "POST") {
        const body = (await request.json()) as SyncPushRequest;
        const result = await syncPush(body, env);
        return jsonResponse(result);
      }

      // Route: GET /api/health (health check)
      if (url.pathname === "/api/health" && request.method === "GET") {
        return jsonResponse({ status: "ok", timestamp: Date.now() });
      }

      // Route: POST /api/feeds/parse (parse RSS feed)
      if (url.pathname === "/api/feeds/parse" && request.method === "POST") {
        const body = (await request.json()) as { url: string };
        if (!body.url) {
          return errorResponse("URL required", 400);
        }
        try {
          const feedData = await fetchAndParseFeed(body.url);
          return jsonResponse(feedData);
        } catch (error) {
          return errorResponse(
            error instanceof Error ? error.message : "Failed to parse feed",
            400
          );
        }
      }

      // Route: POST /api/feeds/discover (discover feeds from URL)
      if (url.pathname === "/api/feeds/discover" && request.method === "POST") {
        const body = (await request.json()) as { url: string };
        if (!body.url) {
          return errorResponse("URL required", 400);
        }
        const feeds = await discoverFeeds(body.url);
        return jsonResponse({ feeds });
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
            "GET /api/health",
          ],
        });
      }

      // 404 Not Found
      return errorResponse("Not found", 404);
    } catch (error) {
      console.error("Worker error:", error);
      return errorResponse(
        error instanceof Error ? error.message : "Internal server error"
      );
    }
  },
};

export default handler;
