import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ChannelQueues } from '../constructs/channel-queues';

export interface QueuesStackProps extends StackProps {}

/**
 * Queues Stack
 * Creates all SQS queues for the system:
 * - SMS (high + bulk)
 * - Email (high + bulk)
 * - WhatsApp (high + bulk)
 * - Voice (high + bulk)
 * - Webhook dispatch (high + bulk)
 *
 * Each channel gets:
 * - HIGH priority queue: 30s visibility, 3 max retries → DLQ
 * - BULK priority queue: 60s visibility, 5 max retries → DLQ
 */
export class QueuesStack extends Stack {
  public readonly smsQueues: ChannelQueues;
  public readonly emailQueues: ChannelQueues;
  public readonly waQueues: ChannelQueues;
  public readonly voiceQueues: ChannelQueues;
  public readonly webhookQueues: ChannelQueues;

  constructor(scope: Construct, id: string, props?: QueuesStackProps) {
    super(scope, id, props);

    // SMS Queues
    this.smsQueues = new ChannelQueues(this, 'SmsQueues', {
      queueNamePrefix: 'iwb-sms',
      isFifo: true,
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 3,
    });

    // Email Queues
    this.emailQueues = new ChannelQueues(this, 'EmailQueues', {
      queueNamePrefix: 'iwb-email',
      isFifo: true,
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 3,
    });

    // WhatsApp Queues
    this.waQueues = new ChannelQueues(this, 'WhatsAppQueues', {
      queueNamePrefix: 'iwb-whatsapp',
      isFifo: true,
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 3,
    });

    // Voice Queues
    this.voiceQueues = new ChannelQueues(this, 'VoiceQueues', {
      queueNamePrefix: 'iwb-voice',
      isFifo: true,
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 3,
    });

    // Webhook Dispatch Queues
    this.webhookQueues = new ChannelQueues(this, 'WebhookQueues', {
      queueNamePrefix: 'iwb-webhook',
      isFifo: true,
      visibilityTimeoutSeconds: 30,
      maxReceiveCount: 3,
    });
  }
}
