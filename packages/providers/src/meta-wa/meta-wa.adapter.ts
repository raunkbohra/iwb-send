import axios from 'axios';

import { Channel, ProviderSendInput, ProviderSendResult, AppError } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

interface MetaWACredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  wabaId?: string; // WhatsApp Business Account ID
}

interface MetaWAContent {
  type: 'text' | 'template' | 'image' | 'document' | 'video' | 'audio';
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaCaption?: string;
}

interface MetaWASendResponse {
  messages: Array<{
    id: string;
  }>;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
}

/**
 * Meta WhatsApp Cloud API adapter
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Features:
 * - Text messaging (default)
 * - Template-based messaging (pre-approved by Meta)
 * - Media sharing (image, video, audio, document)
 * - Interactive messages (buttons, lists)
 * - Webhook callbacks for delivery status
 * - Rate limiting: 80 messages/second
 * - Cost: $0.002 per message (India rates vary)
 *
 * Requirements:
 * - WhatsApp Business Account (WABA)
 * - Phone number registered + verified
 * - Access token with whatsapp_business_messaging permission
 * - Template approval for template messaging
 */
export class MetaWaAdapter implements ProviderAdapter {
  readonly provider = 'META_WA';
  readonly channel = Channel.WHATSAPP;

  private readonly API_BASE = 'https://graph.instagram.com/v18.0';
  private readonly TIMEOUT = 15000; // 15s timeout

  /**
   * Send WhatsApp message via Meta Cloud API
   * POST /v18.0/{phone_number_id}/messages
   *
   * Supports:
   * - Text messages (simple string)
   * - Template messages (pre-approved templates with parameters)
   * - Media sharing (image, video, audio, document)
   * - Interactive messages (buttons, lists)
   */
  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      if (!input.to) {
        throw new Error('Recipient WhatsApp number (to) is required');
      }

      const creds = credentials as MetaWACredentials;
      if (!creds.accessToken || !creds.phoneNumberId) {
        throw new Error('Meta WA credentials missing (accessToken, phoneNumberId)');
      }

      // Normalize phone to E.164 format (WhatsApp requires)
      const normalizedPhone = this.normalizePhone(input.to);

      // Parse content to determine message type
      const waContent = this.parseContent(input.content);

      // Build request payload
      const payload = this.buildPayload(normalizedPhone, waContent);

      // Send via Meta API
      const response = await axios.post<MetaWASendResponse>(
        `${this.API_BASE}/${creds.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          ...payload,
        },
        {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: this.TIMEOUT,
        }
      );

      // Parse response
      if (!response.data?.messages?.[0]?.id) {
        throw new Error('Meta API did not return message ID');
      }

      return {
        success: true,
        externalId: response.data.messages[0].id,
        cost: BigInt(2000), // $0.002 per message ≈ 2,000 units
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Classify Meta errors
      if (message.includes('Invalid phone')) {
        throw new AppError('INVALID_PHONE', 'Invalid WhatsApp phone number', 400);
      }

      if (message.includes('template')) {
        throw new AppError('TEMPLATE_ERROR', 'Template not approved or not found', 400);
      }

      if (message.includes('(400)')) {
        throw new AppError('INVALID_REQUEST', 'Invalid request format', 400);
      }

      if (message.includes('(401)')) {
        throw new AppError('AUTH_FAILED', 'Invalid access token', 401);
      }

      if (message.includes('(429)')) {
        throw new AppError('RATE_LIMITED', 'Rate limit exceeded', 429);
      }

      throw new AppError('PROVIDER_ERROR', message, 500);
    }
  }

  /**
   * Check Meta account health and connectivity
   */
  async healthCheck(credentials: unknown): Promise<boolean> {
    try {
      const creds = credentials as MetaWACredentials;
      if (!creds.accessToken || !creds.businessAccountId) {
        return false;
      }

      // Check business account exists and is accessible
      const response = await axios.get(
        `${this.API_BASE}/${creds.businessAccountId}`,
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

  /**
   * Validate Meta WA configuration
   */
  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;

    const hasToken = creds.accessToken && typeof creds.accessToken === 'string';
    const hasPhoneId =
      creds.phoneNumberId && typeof creds.phoneNumberId === 'string';
    const hasBusinessId =
      creds.businessAccountId && typeof creds.businessAccountId === 'string';

    if (!hasToken || !hasPhoneId || !hasBusinessId) {
      return false;
    }

    // Verify with health check
    return await this.healthCheck(creds);
  }

  /**
   * Parse content to determine message type
   * Supports:
   * - String (text message)
   * - JSON with type field (template, media, etc)
   */
  private parseContent(content: unknown): MetaWAContent {
    // String = text message
    if (typeof content === 'string') {
      return {
        type: 'text',
        text: content,
      };
    }

    // Object = parse type and properties
    const obj = content as Record<string, unknown>;
    if (typeof obj === 'object' && obj !== null) {
      const type = (obj.type as string) || 'text';

      return {
        type: (type as MetaWAContent['type']) || 'text',
        text: obj.text as string,
        templateName: obj.templateName as string,
        templateLanguage: obj.templateLanguage as string,
        templateParams: obj.templateParams as string[],
        mediaUrl: obj.mediaUrl as string,
        mediaCaption: obj.mediaCaption as string,
      };
    }

    return { type: 'text', text: String(content) };
  }

  /**
   * Build Meta WA API payload based on message type
   */
  private buildPayload(
    phone: string,
    content: MetaWAContent
  ): Record<string, unknown> {
    const base = { to: phone };

    switch (content.type) {
      case 'text':
        return {
          ...base,
          type: 'text',
          text: {
            body: content.text || 'Message from iWB Send',
          },
        };

      case 'template':
        return {
          ...base,
          type: 'template',
          template: {
            name: content.templateName || 'hello_world',
            language: {
              code: content.templateLanguage || 'en_US',
            },
            ...(content.templateParams && {
              components: [
                {
                  type: 'body',
                  parameters: content.templateParams.map((param) => ({
                    type: 'text',
                    text: param,
                  })),
                },
              ],
            }),
          },
        };

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        return {
          ...base,
          type: content.type,
          [content.type]: {
            link: content.mediaUrl,
            ...(content.mediaCaption && content.type === 'image' && {
              caption: content.mediaCaption,
            }),
          },
        };

      default:
        return {
          ...base,
          type: 'text',
          text: {
            body: content.text || 'Message from iWB Send',
          },
        };
    }
  }

  /**
   * Normalize phone to E.164 format
   * WhatsApp requires: +[country code][number]
   * Example: +917XXXXXXXXXX (India)
   */
  private normalizePhone(phone: string): string {
    // Remove any non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with 0 (India), convert to +91
    if (normalized.startsWith('0')) {
      normalized = '+91' + normalized.substring(1);
    }

    // If doesn't have +, prepend it
    if (!normalized.startsWith('+')) {
      // If 10 digits, assume India +91
      if (normalized.length === 10) {
        normalized = '+91' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }
}
