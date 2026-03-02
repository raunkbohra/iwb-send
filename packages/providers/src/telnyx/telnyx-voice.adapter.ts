import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * Telnyx Voice API adapter
 * HTTP REST API for initiating outbound calls
 */
export class TelnyxVoiceAdapter implements ProviderAdapter {
  readonly provider = 'TELNYX';
  readonly channel = Channel.VOICE;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as { apiKey: string; connectionId: string };
      const response = await axios.post(
        'https://api.telnyx.com/v2/calls',
        {
          to: input.to,
          from: input.from,
          connection_id: creds.connectionId,
          custom_headers: [
            {
              name: 'X-Custom-Header',
              value: 'IWB-Send',
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${creds.apiKey}` },
          timeout: 10000,
        }
      );

      if (response.data?.data?.id) {
        return {
          success: true,
          providerMessageId: response.data.data.id,
          cost: 50000, // $0.05 per call (estimate)
        };
      }

      return {
        success: false,
        errorCode: 'CALL_FAILED',
        errorMessage: response.data?.errors?.[0]?.title || 'Failed to initiate call',
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
      const response = await axios.get('https://api.telnyx.com/v2/connections', {
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
    return !!(
      creds.apiKey &&
      typeof creds.apiKey === 'string' &&
      creds.connectionId &&
      typeof creds.connectionId === 'string'
    );
  }
}
