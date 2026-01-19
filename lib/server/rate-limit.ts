import { checkRateLimit, getClientId, type RateLimitConfig } from "@/lib/server/rate-limiter";

export function applyRateLimit(
  request: Request,
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
        },
      }
    );
  }

  return null;
}
