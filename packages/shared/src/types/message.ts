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
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  cost?: number; // Micro-units
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
