import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult, AppError } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

interface SparrowCredentials {
  apiKey: string;
  senderId?: string;
}

interface SparrowSendResponse {
  response: Array<{
    messageId: string;
    status: number; // 0 = success, other = error
    message: string;
  }>;
}

interface SparrowBalanceResponse {
  balance: number;
  currency: string;
}

/**
 * Sparrow SMS adapter for Nepal market
 * API: https://api.sparrowsms.com/v2/
 * Contact: support@sparrowsms.com
 *
 * Status codes:
 * 0 = Success
 * 1 = Invalid token
 * 2 = Invalid phone number
 * 3 = Not enough balance
 * 4 = Queue full
 * etc.
 */
export class SparrowAdapter implements ProviderAdapter {
  readonly provider = 'SPARROW';
  readonly channel = Channel.SMS;

  private readonly API_BASE = 'https://api.sparrowsms.com/v2';
  private readonly SEND_ENDPOINT = '/sms';
  private readonly BALANCE_ENDPOINT = '/balance';
  private readonly STATUS_ENDPOINT = '/status';
  private readonly TIMEOUT = 15000; // 15s timeout

  /**
   * Send SMS via Sparrow API v2
   * POST /v2/sms
   * Params: token, from, to, text
   */
  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      if (!input.to) {
        throw new Error('Recipient phone number (to) is required');
      }

      const creds = credentials as SparrowCredentials;
      if (!creds.apiKey) {
        throw new Error('Sparrow API key is required');
      }

      // Normalize phone to E.164 format
      const normalizedPhone = this.normalizePhone(input.to);

      const response = await axios.post<SparrowSendResponse>(
        `${this.API_BASE}${this.SEND_ENDPOINT}`,
        {
          token: creds.apiKey,
          from: input.from || creds.senderId || 'Sparrow',
          to: normalizedPhone,
          text: input.content,
        },
        { timeout: this.TIMEOUT }
      );

      // Handle response
      const messageData = response.data?.response?.[0];
      if (!messageData) {
        throw new Error('Invalid response format from Sparrow API');
      }

      if (messageData.status === 0) {
        // Success
        const costUnits = this.calculateCost(); // Default cost
        return {
          success: true,
          externalId: messageData.messageId,
          cost: BigInt(costUnits),
        };
      }

      // Handle specific error codes
      const errorMsg = messageData.message || `Error code: ${messageData.status}`;

      if (messageData.status === 1) {
        throw new AppError('INVALID_TOKEN', 'Invalid API token', 401);
      }

      if (messageData.status === 2) {
        throw new AppError('INVALID_PHONE', 'Invalid phone number', 400);
      }

      if (messageData.status === 3) {
        throw new AppError('INSUFFICIENT_BALANCE', 'Not enough balance', 402);
      }

      if (messageData.status === 4) {
        throw new AppError('QUEUE_FULL', 'Queue full, try again later', 429);
      }

      throw new Error(errorMsg);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Classify errors
      if (message.includes('balance')) {
        throw new AppError('INSUFFICIENT_BALANCE', message, 402);
      }

      if (message.includes('token') || message.includes('auth')) {
        throw new AppError('AUTH_FAILED', message, 401);
      }

      if (message.includes('phone')) {
        throw new AppError('INVALID_PHONE', message, 400);
      }

      throw new AppError('PROVIDER_ERROR', message, 500);
    }
  }

  /**
   * Check provider health via status endpoint
   * GET /v2/status
   */
  async healthCheck(credentials: unknown): Promise<boolean> {
    try {
      const creds = credentials as SparrowCredentials;
      if (!creds.apiKey) {
        return false;
      }

      const response = await axios.get(`${this.API_BASE}${this.STATUS_ENDPOINT}`, {
        params: { token: creds.apiKey },
        timeout: 5000,
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Validate Sparrow credentials
   */
  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    const hasApiKey = creds.apiKey && typeof creds.apiKey === 'string';

    if (!hasApiKey) {
      return false;
    }

    // Verify with API
    return await this.healthCheck(creds);
  }

  /**
   * Get account balance
   * GET /v2/balance
   */
  async getBalance(credentials: unknown): Promise<number | null> {
    try {
      const creds = credentials as SparrowCredentials;
      const response = await axios.get<SparrowBalanceResponse>(
        `${this.API_BASE}${this.BALANCE_ENDPOINT}`,
        {
          params: { token: creds.apiKey },
          timeout: 5000,
        }
      );

      return response.data?.balance || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize phone to E.164 format
   * Sparrow accepts: +977XXXXXXXXXX (Nepal)
   */
  private normalizePhone(phone: string): string {
    // Remove any non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with 0 (Nepal), convert to +977
    if (normalized.startsWith('0')) {
      normalized = '+977' + normalized.substring(1);
    }

    // If doesn't have +, assume Nepal +977
    if (!normalized.startsWith('+')) {
      // If 10 digits, assume Nepal mobile
      if (normalized.length === 10) {
        normalized = '+977' + normalized;
      } else {
        // Otherwise prepend +
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Calculate cost for SMS
   * Sparrow default: ~0.5 NPR per SMS ≈ 3,750 units
   */
  private calculateCost(): number {
    // 1 NPR ≈ 0.0075 USD ≈ 7,500 units
    // 0.5 NPR per SMS = 3,750 units
    return 3750;
  }
}
