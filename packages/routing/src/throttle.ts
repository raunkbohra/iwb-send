/**
 * Layer E: Throttle
 * Per-tenant, per-provider rate enforcement
 * Uses in-memory cache (could be upgraded to Redis)
 */

interface ThrottleKey {
  tenantId: string;
  providerId: string;
  windowStart: number;
}

export class Throttle {
  private counts: Map<string, number> = new Map();
  private windowMs = 60000; // 1-minute window

  /**
   * Check if request is allowed under rate limit
   */
  isAllowed(tenantId: string, providerId: string, limit: number): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const key = `${tenantId}:${providerId}:${windowStart}`;

    const current = this.counts.get(key) || 0;
    if (current >= limit) {
      return false;
    }

    this.counts.set(key, current + 1);

    // Cleanup old windows periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2;

    for (const [key] of this.counts) {
      const [, , windowStart] = key.split(':');
      if (parseInt(windowStart, 10) < cutoff) {
        this.counts.delete(key);
      }
    }
  }
}
