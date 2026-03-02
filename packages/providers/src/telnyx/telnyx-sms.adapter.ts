import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * Telnyx SMS adapter for global SMS coverage
 * HTTP REST API with Bearer token auth
 */
export class TelnyxSmsAdapter implements ProviderAdapter {
  readonly provider = 'TELNYX';
  readonly channel = Channel.SMS;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as { apiKey: string };
      const response = await axios.post(
        'https://api.telnyx.com/v2/messages',
        {
          from: input.from,
          to: input.to,
          text: input.content,
        },
        {
          headers: { Authorization: `Bearer ${creds.apiKey}` },
          timeout: 10000,
        }
      );

      if (response.data?.data?.id) {
        return {
          success: true,
          externalId: response.data.data.id,
          cost: 3000, // $0.003 per SMS (premium provider)
        };
      }

      return {
        success: false,
        errorCode: 'SEND_FAILED',
        errorMessage: response.data?.errors?.[0]?.title || 'Failed to send',
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
      const response = await axios.get('https://api.telnyx.com/v2/messaging_profiles', {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
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
