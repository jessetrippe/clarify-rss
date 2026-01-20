/**
 * Simple in-memory rate limiter for serverless routes.
 *
 * PRODUCTION LIMITATIONS:
 * This implementation uses in-memory storage which has important limitations
 * in serverless environments:
 *
 * 1. State resets per function instance - Each serverless cold start creates a
 *    new instance with an empty rate limit store. Multiple concurrent requests
 *    may hit different instances, each with separate counters.
 *
 * 2. No cross-instance coordination - Requests routed to different instances
 *    don't share rate limit state, potentially allowing limits to be exceeded.
 *
 * 3. Suitable for: Single-user apps, low-traffic apps, development/testing,
 *    or as a "best effort" rate limiter that catches most abuse.
 *
 * 4. Not suitable for: High-traffic apps, strict rate limiting requirements,
 *    or multi-user apps where abuse prevention is critical.
 *
 * ALTERNATIVES FOR PRODUCTION SCALE:
 * - Use Supabase: Store rate limit counters in the database
 * - Use Redis: External state store (e.g., Upstash Redis on Vercel/Netlify)
 * - Use edge rate limiting: Cloudflare, Netlify Edge, or Vercel Edge Config
 * - Use API gateway rate limiting: AWS API Gateway, Kong, etc.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60000;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientId(request: Request): string {
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("X-Real-IP");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export const RATE_LIMITS = {
  default: {
    windowMs: 60000,
    maxRequests: 100,
  },
  feedParse: {
    windowMs: 60000,
    maxRequests: 30,
  },
  sync: {
    windowMs: 60000,
    maxRequests: 60,
  },
  articleExtract: {
    windowMs: 60000,
    maxRequests: 20,
  },
} as const;
