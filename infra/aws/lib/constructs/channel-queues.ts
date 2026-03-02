import { Construct } from 'constructs';
import {
  Queue,
  QueueProps,
  DeadLetterQueue,
} from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';

export interface ChannelQueuesProps {
  queueNamePrefix: string;
  isFifo: boolean;
  visibilityTimeoutSeconds: number;
  maxReceiveCount: number;
  messageRetentionPeriodSeconds?: number;
}

/**
 * Creates HIGH and BULK SQS queues for a single channel with DLQ
 * Pattern: Each channel (SMS, EMAIL, WA, VOICE) gets two queues:
 * - high: For transactional/OTP messages (30s visibility, 3 retries)
 * - bulk: For marketing/notification messages (60s visibility, 5 retries)
 */
export class ChannelQueues extends Construct {
  public readonly highQueue: Queue;
  public readonly bulkQueue: Queue;
  public readonly highDlq: Queue;
  public readonly bulkDlq: Queue;

  constructor(scope: Construct, id: string, props: ChannelQueuesProps) {
    super(scope, id);

    const { queueNamePrefix, isFifo, visibilityTimeoutSeconds, maxReceiveCount } = props;

    // Create DLQ for HIGH priority queue
    this.highDlq = new Queue(this, 'HighDLQ', {
      queueName: isFifo
        ? `${queueNamePrefix}-high-dlq.fifo`
        : `${queueNamePrefix}-high-dlq`,
      fifo: isFifo,
      contentBasedDeduplication: isFifo,
      retentionPeriod: Duration.days(14),
    });

    // Create DLQ for BULK priority queue
    this.bulkDlq = new Queue(this, 'BulkDLQ', {
      queueName: isFifo
        ? `${queueNamePrefix}-bulk-dlq.fifo`
        : `${queueNamePrefix}-bulk-dlq`,
      fifo: isFifo,
      contentBasedDeduplication: isFifo,
      retentionPeriod: Duration.days(14),
    });

    // Create HIGH priority queue (30s visibility, 3 max attempts)
    this.highQueue = new Queue(this, 'HighQueue', {
      queueName: isFifo ? `${queueNamePrefix}-high.fifo` : `${queueNamePrefix}-high`,
      fifo: isFifo,
      contentBasedDeduplication: isFifo,
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        queue: this.highDlq,
        maxReceiveCount: 3,
      },
      retentionPeriod: Duration.days(4), // SQS default
    });

    // Create BULK priority queue (60s visibility, 5 max attempts)
    this.bulkQueue = new Queue(this, 'BulkQueue', {
      queueName: isFifo ? `${queueNamePrefix}-bulk.fifo` : `${queueNamePrefix}-bulk`,
      fifo: isFifo,
      contentBasedDeduplication: isFifo,
      visibilityTimeout: Duration.seconds(60),
      receiveMessageWaitTime: Duration.seconds(20),
      deadLetterQueue: {
        queue: this.bulkDlq,
        maxReceiveCount: 5,
      },
      retentionPeriod: Duration.days(4),
    });
  }
}
