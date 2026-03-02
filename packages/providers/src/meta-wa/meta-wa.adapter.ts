import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * Meta WhatsApp Cloud API adapter
 * HTTP REST API with Bearer token auth
 */
export class MetaWaAdapter implements ProviderAdapter {
  readonly provider = 'META_WA';
  readonly channel = Channel.WHATSAPP;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as {
        accessToken: string;
        phoneNumberId: string;
        businessAccountId: string;
      };

      const response = await axios.post(
        `https://graph.instagram.com/v18.0/${creds.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: input.to,
          type: 'text',
          text: { body: input.content },
        },
        {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
          timeout: 10000,
        }
      );

      if (response.data?.messages?.[0]?.id) {
        return {
          success: true,
          providerMessageId: response.data.messages[0].id,
          cost: 2000, // $0.002 per message
        };
      }

      return {
        success: false,
        errorCode: response.data?.error?.code || 'SEND_FAILED',
        errorMessage: response.data?.error?.message || 'Failed to send',
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
      const creds = credentials as { accessToken: string; businessAccountId: string };
      const response = await axios.get(
        `https://graph.instagram.com/v18.0/${creds.businessAccountId}`,
        {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
          timeout: 5000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    return !!(
      creds.accessToken &&
      typeof creds.accessToken === 'string' &&
      creds.phoneNumberId &&
      typeof creds.phoneNumberId === 'string'
    );
  }
}
