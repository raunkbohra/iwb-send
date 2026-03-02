import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key (32 random bytes, base64)
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Generate a correlation ID for tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * Sign webhook payload with HMAC-SHA256
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signWebhookPayload(payload, secret);
  return expected === signature;
}
