/**
 * Simple in-memory rate limiter for Cloudflare Workers
 *
 * Note: This is a basic implementation suitable for single-worker deployments.
 * For production with multiple workers, use Cloudflare's Rate Limiting or
 * implement distributed rate limiting with KV/Durable Objects.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (cleared on worker restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

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
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (e.g., IP address or client ID)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  // Cleanup expired entries periodically
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired entry - allow and create new entry
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

  // Entry exists and not expired - check limit
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 * Uses CF-Connecting-IP header or falls back to a default
 */
export function getClientId(request: Request): string {
  // Cloudflare provides the real client IP in this header
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    return cfIp;
  }

  // Fallback headers
  const xForwardedFor = request.headers.get("X-Forwarded-For");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = request.headers.get("X-Real-IP");
  if (xRealIp) {
    return xRealIp;
  }

  // Default fallback
  return "unknown";
}

// Default rate limit configurations
export const RATE_LIMITS = {
  // General API endpoints: 100 requests per minute
  default: {
    windowMs: 60000,
    maxRequests: 100,
  },
  // Feed parsing: 30 requests per minute (more expensive operation)
  feedParse: {
    windowMs: 60000,
    maxRequests: 30,
  },
  // Sync endpoints: 60 requests per minute
  sync: {
    windowMs: 60000,
    maxRequests: 60,
  },
} as const;
