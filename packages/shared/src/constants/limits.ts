/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  SMS: {
    perSecond: 100,
    perMinute: 3000,
    perHour: 50000,
  },
  EMAIL: {
    perSecond: 50,
    perMinute: 1000,
    perHour: 10000,
  },
  WHATSAPP: {
    perSecond: 10,
    perMinute: 500,
    perHour: 5000,
  },
  VOICE: {
    perSecond: 5,
    perMinute: 100,
    perHour: 1000,
  },
};

/**
 * Retry configuration per channel
 */
export const RETRY_CONFIG = {
  SMS: {
    maxAttempts: 3,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  },
  EMAIL: {
    maxAttempts: 5,
    baseDelayMs: 30000,
    maxDelayMs: 300000,
    backoffMultiplier: 2,
  },
  WHATSAPP: {
    maxAttempts: 3,
    baseDelayMs: 10000,
    maxDelayMs: 120000,
    backoffMultiplier: 2,
  },
  VOICE: {
    maxAttempts: 2,
    baseDelayMs: 5000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
};

/**
 * Daily limits (per-tenant)
 */
export const DEFAULT_DAILY_LIMITS = {
  SMS: 10000,
  EMAIL: 5000,
  WHATSAPP: 1000,
  VOICE: 500,
};

/**
 * SQS visibility timeout (seconds)
 */
export const SQS_VISIBILITY_TIMEOUT = {
  HIGH: 30,
  BULK: 60,
};

/**
 * Max receive count before moving to DLQ
 */
export const SQS_MAX_RECEIVE_COUNT = {
  HIGH: 3,
  BULK: 5,
};

/**
 * Lambda timeouts (seconds)
 */
export const LAMBDA_TIMEOUT = {
  WORKER: 300, // 5 minutes
  WEBHOOK_DISPATCH: 60,
  WEBHOOK_INGEST: 30,
};
