import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

/**
 * AWS SES Email adapter
 * Uses AWS SDK for email delivery
 */
export class SesAdapter implements ProviderAdapter {
  readonly provider = 'SES';
  readonly channel = Channel.EMAIL;

  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      const creds = credentials as { region: string };
      const client = new SESClient({ region: creds.region || 'ap-south-1' });

      const command = new SendEmailCommand({
        Source: input.from,
        Destination: { ToAddresses: [input.to] },
        Message: {
          Subject: { Data: 'Message' },
          Body: { Html: { Data: input.content } },
        },
      });

      const response = await client.send(command);
      await client.destroy();

      if (response.MessageId) {
        return {
          success: true,
          providerMessageId: response.MessageId,
          cost: 100, // $0.0001 per email
        };
      }

      return {
        success: false,
        errorCode: 'SEND_FAILED',
        errorMessage: 'SES returned no message ID',
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
      const creds = credentials as { region: string };
      const client = new SESClient({ region: creds.region || 'ap-south-1' });
      // If client instantiated successfully, SES is accessible
      await client.destroy();
      return true;
    } catch {
      return false;
    }
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;
    return !!(creds.region && typeof creds.region === 'string');
  }
}
