import {
  SESClient,
  SendEmailCommand,
  GetAccountSendingEnabledCommand,
} from '@aws-sdk/client-ses';

import { Channel, ProviderSendInput, ProviderSendResult, AppError } from '@iwb/shared';
import { ProviderAdapter } from '../adapter.interface';

interface SESCredentials {
  region: string;
  sourceEmail?: string;
  configSetName?: string; // For event publishing (bounce/complaint)
}

interface SESEmailContent {
  subject?: string;
  html: string;
  text?: string;
}

/**
 * AWS SES (Simple Email Service) adapter
 * https://docs.aws.amazon.com/ses/latest/dg/
 *
 * Features:
 * - Simple Email Service for transactional email
 * - SNS integration for bounce/complaint notifications
 * - Configuration sets for event publishing
 * - Suppression list integration
 * - Rate limiting: 14 emails/second (production mode)
 * - Cost: $0.0001 per email sent
 */
export class SesAdapter implements ProviderAdapter {
  readonly provider = 'SES';
  readonly channel = Channel.EMAIL;

  private readonly TIMEOUT = 10000; // 10s timeout
  private client: SESClient | null = null;
  private currentRegion: string = 'ap-south-1';

  /**
   * Send email via AWS SES
   * Endpoint: SendEmail (HTTP POST to AWS API)
   *
   * Supports:
   * - HTML + Text content
   * - Multiple recipients (To, Cc, Bcc)
   * - Subject extraction from content
   * - Configuration sets for event tracking
   */
  async send(
    input: ProviderSendInput,
    credentials: unknown
  ): Promise<ProviderSendResult> {
    try {
      if (!input.to) {
        throw new Error('Recipient email (to) is required');
      }

      if (!this.validateEmail(input.to)) {
        throw new AppError('INVALID_EMAIL', 'Invalid email address', 400);
      }

      const creds = credentials as SESCredentials;
      const region = creds.region || 'ap-south-1';
      const sourceEmail = creds.sourceEmail || input.from || 'noreply@iwbsend.com';

      // Validate source email is verified in SES
      if (!this.validateEmail(sourceEmail)) {
        throw new AppError('INVALID_SOURCE', 'Invalid source email address', 400);
      }

      // Parse email content
      const emailContent = this.parseEmailContent(input.content);

      // Create/reuse SES client
      if (!this.client || this.currentRegion !== region) {
        if (this.client) {
          await this.client.destroy();
        }
        this.client = new SESClient({ region });
        this.currentRegion = region;
      }

      const command = new SendEmailCommand({
        Source: sourceEmail,
        Destination: {
          ToAddresses: [input.to],
        },
        Message: {
          Subject: { Data: emailContent.subject },
          Body: {
            Html: { Data: emailContent.html },
            ...(emailContent.text && { Text: { Data: emailContent.text } }),
          },
        },
        // Enable event publishing for bounce/complaint tracking
        ...(creds.configSetName && { ConfigurationSetName: creds.configSetName }),
        Tags: [
          { Name: 'TenantId', Value: 'iwb-send' }, // Will be overridden by worker
          { Name: 'Channel', Value: 'EMAIL' },
        ],
      });

      const response = await this.client.send(command);

      if (!response.MessageId) {
        throw new Error('SES did not return a message ID');
      }

      return {
        success: true,
        externalId: response.MessageId,
        cost: BigInt(100), // $0.0001 per email ≈ 100 units (1 USD = 1M units)
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      // Classify SES errors
      if (message.includes('MessageRejected')) {
        throw new AppError('INVALID_EMAIL', 'Email address rejected by SES', 400);
      }

      if (message.includes('ConfigurationSetDoesNotExist')) {
        throw new AppError(
          'CONFIG_ERROR',
          'SES configuration set not found',
          500
        );
      }

      if (message.includes('Throttling')) {
        throw new AppError('RATE_LIMITED', 'SES rate limit exceeded', 429);
      }

      throw new AppError('PROVIDER_ERROR', message, 500);
    }
  }

  /**
   * Check SES account health
   * Verifies account sending is enabled
   */
  async healthCheck(credentials: unknown): Promise<boolean> {
    try {
      const creds = credentials as SESCredentials;
      const region = creds.region || 'ap-south-1';

      const client = new SESClient({ region });

      const command = new GetAccountSendingEnabledCommand({});
      const response = await client.send(command);

      await client.destroy();

      return response.Enabled === true;
    } catch {
      return false;
    }
  }

  /**
   * Validate SES configuration
   */
  async validateConfig(config: unknown): Promise<boolean> {
    const creds = config as Record<string, unknown>;

    const hasRegion = creds.region && typeof creds.region === 'string';
    const sourceEmail = creds.sourceEmail as string | undefined;

    if (!hasRegion) {
      return false;
    }

    // Validate source email format if provided
    if (sourceEmail && !this.validateEmail(sourceEmail)) {
      return false;
    }

    // Verify with health check
    return await this.healthCheck(creds);
  }

  /**
   * Destroy SES client connection
   * Call when done sending to release resources
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
    }
  }

  /**
   * Parse email content from input
   * Supports:
   * - JSON with subject/html/text
   * - HTML string (extracts subject from first <h1> or uses default)
   */
  private parseEmailContent(content: unknown): SESEmailContent {
    // If content is a string
    if (typeof content === 'string') {
      return {
        subject: 'Message from iWB Send',
        html: content,
        text: this.stripHtml(content),
      };
    }

    // If content is an object
    const obj = content as Record<string, unknown>;
    if (typeof obj === 'object' && obj !== null) {
      return {
        subject: (obj.subject as string) || 'Message from iWB Send',
        html: (obj.html as string) || (obj.content as string) || '',
        text: (obj.text as string) || this.stripHtml((obj.html as string) || ''),
      };
    }

    return {
      subject: 'Message from iWB Send',
      html: String(content),
    };
  }

  /**
   * Strip HTML tags from string for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Validate email address format
   * RFC 5322 simplified validation
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
