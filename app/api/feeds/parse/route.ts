import { requireUser, jsonError, jsonResponse } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/request";
import { RATE_LIMITS } from "@/lib/server/rate-limiter";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { fetchAndParseFeed } from "@/lib/server/feed-fetcher";
import { validateUrl } from "@/lib/validation";
import { handlePreflight } from "@/lib/server/cors";

export const runtime = "nodejs";

export async function OPTIONS(request: Request): Promise<Response> {
  return handlePreflight(request);
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof Response) {
    return auth;
  }

  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.feedParse);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await parseJsonBody<{ url: string }>(request);
  if (!body) {
    return jsonError(request, "Invalid JSON body", 400);
  }
  if (!body.url) {
    return jsonError(request, "URL required", 400);
  }

  try {
    const validatedUrl = validateUrl(body.url);
    const feedData = await fetchAndParseFeed(validatedUrl);
    return jsonResponse(request, feedData);
  } catch (error) {
    return jsonError(
      request,
      error instanceof Error ? error.message : "Failed to parse feed",
      400
    );
  }
}
