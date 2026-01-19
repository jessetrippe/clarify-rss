import { requireUser, jsonError } from "@/lib/server/auth";
import { parseJsonBody } from "@/lib/server/request";
import { RATE_LIMITS } from "@/lib/server/rate-limiter";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { discoverFeeds } from "@/lib/server/feed-fetcher";
import { validateUrl } from "@/lib/validation";

export const runtime = "nodejs";

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
    return jsonError("Invalid JSON body", 400);
  }
  if (!body.url) {
    return jsonError("URL required", 400);
  }

  try {
    const validatedUrl = validateUrl(body.url);
    const feeds = await discoverFeeds(validatedUrl);
    return Response.json({ feeds });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to discover feeds",
      400
    );
  }
}
