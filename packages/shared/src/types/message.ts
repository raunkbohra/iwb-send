import { Channel, Purpose } from '../enums/channel';

/**
 * Minimal payload that goes into SQS.
 * Worker fetches full message details from DB using messageId.
 */
export interface SqsJobPayload {
  messageId: string;
  tenantId: string;
  channel: Channel;
  purpose: Purpose;
  priority: 'HIGH' | 'BULK';
  correlationId: string;
}

/**
 * Result returned from provider adapter after sending
 */
export interface ProviderSendResult {
  success: boolean;
  externalId?: string; // Provider's message ID
  errorCode?: string;
  errorMessage?: string;
  cost?: bigint | number; // Micro-units (1 USD = 1,000,000 units)
}

/**
 * Input to provider adapter send() method
 */
export interface ProviderSendInput {
  to: string; // Phone or email
  from: string; // Sender ID or from address
  content: string; // Message body
  metadata?: Record<string, unknown>;
}

/**
 * Message retry configuration per channel
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}
