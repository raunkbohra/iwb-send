import { AppError, RATE_LIMITS } from '@iwb/shared';

/**
 * In-memory rate limiter (MVP)
 * TODO (Batch 4.5): Replace with Upstash Redis
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  tenantId: string,
  channel: string,
  limit: number = RATE_LIMITS[channel as keyof typeof RATE_LIMITS]?.perSecond || 10
): boolean {
  const key = `${tenantId}:${channel}`;
  const now = Date.now();

  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    // New bucket
    buckets.set(key, { count: 1, resetAt: now + 1000 });
    return true;
  }

  if (bucket.count >= limit) {
    throw AppError.rateLimitExceeded();
  }

  bucket.count++;
  return true;
}

// Cleanup old buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, 30000); // Every 30 seconds
