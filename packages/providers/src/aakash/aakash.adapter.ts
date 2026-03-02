import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * Aakash SMS adapter for Nepal market
 * HTTP REST API
 */
export class AakashAdapter implements ProviderAdapter {
  readonly provider = 'AAKASH';
  readonly channel = Channel.SMS;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as { username: string; password: string };
      const response = await axios.post(
        'https://sms.aakashsms.com/sms/send',
        {
          username: creds.username,
          password: creds.password,
          from: input.from,
          to: input.to,
          text: input.content,
        },
        { timeout: 10000 }
      );

      if (response.data?.success) {
        return {
          success: true,
          providerMessageId: response.data.id,
          cost: 1000, // $0.001 per SMS
        };
      }

      return {
        success: false,
        errorCode: 'SEND_FAILED',
        errorMessage: response.data?.message || 'Failed to send',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errorCode: 'PROVIDER_ERROR',
        errorMessage: message,
      };
    }
  }

  async healthCheck(credentials: unknown): Promise<boolean> {
    try {
      const creds = credentials as { username: string; password: string };
      const response = await axios.get('https://sms.aakashsms.com/status', {
        params: {
          username: creds.username,
          password: creds.password,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    return !!(
      creds.username &&
      typeof creds.username === 'string' &&
      creds.password &&
      typeof creds.password === 'string'
    );
  }
}
