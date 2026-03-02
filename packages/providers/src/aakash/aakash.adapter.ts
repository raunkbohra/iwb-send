import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult, AppError } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

interface AakashCredentials {
  auth_token: string;
}

interface AakashSendResponse {
  status: string;
  data?: Array<{
    messageId: string;
    mobile: string;
    network: 'NTC' | 'Ncell' | string;
    creditDeducted: number;
    deliveryStatus: string;
  }>;
  error?: string;
}

interface AakashCreditResponse {
  status: string;
  data?: {
    availableCredit: number;
    currency: string;
  };
  error?: string;
}

/**
 * Aakash SMS API v4 adapter for Nepal market
 * Supports single and batch SMS sending
 * API Docs: https://bitbucket.org/aakashsms/api/src/v4/
 * Contact: info@aakashtech.com.np, +977-1-4411294
 */
export class AakashAdapter implements ProviderAdapter {
  readonly provider = 'AAKASH';
  readonly channel = Channel.SMS;

  private readonly API_BASE = 'https://sms.aakashsms.com';
  private readonly SEND_ENDPOINT = '/sms/v4/send-user';
  private readonly CREDIT_ENDPOINT = '/sms/v4/user-account-balance';
  private readonly TIMEOUT = 15000; // 15s timeout for SMS delivery

  /**
   * Send SMS via Aakash API v4
   * Endpoint: POST /sms/v4/send-user
   * Header: auth-token
   * Body: { to: string[], text: string }
   */
  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      if (!input.to) {
        throw new Error('Recipient phone number (to) is required');
      }

      const creds = credentials as AakashCredentials;
      if (!creds.auth_token) {
        throw new Error('Aakash auth_token is required');
      }

      // Normalize phone to E.164 format (remove leading 0 if present, ensure + prefix)
      const normalizedPhone = this.normalizePhone(input.to);

      // Aakash API v4 accepts arrays for flexible batch sending
      const response = await axios.post<AakashSendResponse>(
        `${this.API_BASE}${this.SEND_ENDPOINT}`,
        {
          to: [normalizedPhone], // Array for batch support
          text: input.content,
        },
        {
          headers: {
            'auth-token': creds.auth_token,
            'Content-Type': 'application/json',
          },
          timeout: this.TIMEOUT,
        }
      );

      // Handle response
      if (response.data?.status === 'success' && response.data?.data?.[0]) {
        const messageData = response.data.data[0];
        const costUnits = this.calculateCost(messageData.creditDeducted);

        return {
          success: true,
          externalId: messageData.messageId,
          cost: BigInt(costUnits),
        };
      }

      // Handle error response
      const errorMsg =
        response.data?.error ||
        response.data?.status ||
        'Failed to send SMS via Aakash';

      // Check for specific error conditions
      if (errorMsg.includes('balance')) {
        throw new AppError('INSUFFICIENT_BALANCE', 'Not enough balance', 402);
      }

      if (errorMsg.includes('invalid')) {
        throw new AppError('INVALID_PHONE', 'Invalid phone number', 400);
      }

      throw new Error(errorMsg);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Classify error
      if (message.includes('balance')) {
        throw new AppError('INSUFFICIENT_BALANCE', message, 402);
      }

      if (message.includes('token') || message.includes('auth')) {
        throw new AppError('AUTH_FAILED', 'Authentication failed', 401);
      }

      throw new AppError('PROVIDER_ERROR', message, 500);
    }
  }

  /**
   * Check provider health and account balance
   */
  async healthCheck(credentials: unknown): Promise<boolean> {
    try {
      const creds = credentials as AakashCredentials;
      if (!creds.auth_token) {
        return false;
      }

      // Check balance as health indicator
      const response = await axios.post<AakashCreditResponse>(
        `${this.API_BASE}${this.CREDIT_ENDPOINT}`,
        {},
        {
          headers: {
            'auth-token': creds.auth_token,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      return (
        response.status === 200 &&
        response.data?.status === 'success' &&
        response.data?.data?.availableCredit !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate Aakash credentials
   */
  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    const hasAuthToken = creds.auth_token && typeof creds.auth_token === 'string';

    if (!hasAuthToken) {
      return false;
    }

    // Optionally verify with API
    return await this.healthCheck(creds);
  }

  /**
   * Get available credit balance
   * Useful for pre-flight checks
   */
  async getBalance(credentials: unknown): Promise<number | null> {
    try {
      const creds = credentials as AakashCredentials;
      const response = await axios.post<AakashCreditResponse>(
        `${this.API_BASE}${this.CREDIT_ENDPOINT}`,
        {},
        {
          headers: {
            'auth-token': creds.auth_token,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      return response.data?.data?.availableCredit || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   * Aakash expects: +977XXXXXXXXXX (Nepal)
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
        // Otherwise assume already has country code
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Convert Aakash credit cost to system units (micro-units)
   * Aakash reports creditDeducted as decimal (e.g., 0.50 for 50 paisa)
   * 1 USD = 1,000,000 units
   * Assuming 1 credit ≈ 1 NPR ≈ 0.0075 USD
   */
  private calculateCost(creditDeducted: number): number {
    // 1 NPR ≈ 0.0075 USD ≈ 7,500 units
    // So 1 credit = 7,500 units
    const nprToUnits = 7500;
    return Math.round(creditDeducted * nprToUnits);
  }
}
