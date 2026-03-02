import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * Sparrow SMS adapter for Nepal market
 * HTTP REST API
 */
export class SparrowAdapter implements ProviderAdapter {
  readonly provider = 'SPARROW';
  readonly channel = Channel.SMS;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as { apiKey: string; senderId: string };
      const response = await axios.post(
        'https://api.sparrowsms.com/v2/sms/',
        {
          token: creds.apiKey,
          from: input.from || creds.senderId,
          to: input.to,
          text: input.content,
        },
        { timeout: 10000 }
      );

      if (response.data?.response?.[0]?.status === 0) {
        return {
          success: true,
          providerMessageId: response.data.response[0].messageId,
          cost: 1000, // $0.001 per SMS
        };
      }

      return {
        success: false,
        errorCode: response.data?.response?.[0]?.status || 'UNKNOWN',
        errorMessage: response.data?.response?.[0]?.message || 'Failed to send',
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
      const creds = credentials as { apiKey: string };
      const response = await axios.get('https://api.sparrowsms.com/v2/status/', {
        params: { token: creds.apiKey },
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    return !!(creds.apiKey && typeof creds.apiKey === 'string');
  }
}
