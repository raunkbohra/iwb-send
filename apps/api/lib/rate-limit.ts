/**
 * Simple in-memory token bucket rate limiter
 * For MVP only - replace with Redis in production
 */
const rateLimitStore = new Map<string, { tokens: number; lastRefill: number }>();

const CONFIG = {
  tokensPerSecond: 10,
  maxTokens: 100,
};

export function checkRateLimit(tenantId: string): boolean {
  const now = Date.now();
  let bucket = rateLimitStore.get(tenantId);

  if (!bucket) {
    bucket = { tokens: CONFIG.maxTokens, lastRefill: now };
    rateLimitStore.set(tenantId, bucket);
    return true;
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 1000;
  const newTokens = Math.min(
    CONFIG.maxTokens,
    bucket.tokens + elapsed * CONFIG.tokensPerSecond
  );

  bucket.tokens = newTokens;
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}
