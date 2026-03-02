import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WorkerFunction } from '../constructs/worker-function';
import { QueuesStack } from './queues-stack';
import path from 'path';

export interface WorkersStackProps extends StackProps {
  queuesStack: QueuesStack;
}

/**
 * Workers Stack
 * Creates all 7 Lambda worker functions and wires them to their SQS queues
 *
 * Wiring:
 * - sms-worker → SMS queues (high + bulk)
 * - email-worker → Email queues (high + bulk)
 * - wa-worker → WhatsApp queues (high + bulk)
 * - voice-worker → Voice queues (high + bulk)
 * - webhook-dispatch → Webhook queues (high + bulk)
 * - webhook-ingest → API Gateway (not wired here)
 * - ses-feedback → SNS (not wired here)
 */
export class WorkersStack extends Stack {
  public readonly smsWorker: WorkerFunction;
  public readonly emailWorker: WorkerFunction;
  public readonly waWorker: WorkerFunction;
  public readonly voiceWorker: WorkerFunction;
  public readonly webhookDispatchWorker: WorkerFunction;
  public readonly webhookIngestWorker: WorkerFunction;
  public readonly sesFeedbackWorker: WorkerFunction;

  constructor(scope: Construct, id: string, props: WorkersStackProps) {
    super(scope, id, props);

    const workersPath = path.join(__dirname, '../../../../services/workers');

    // SMS Worker (wired to SMS queues)
    this.smsWorker = new WorkerFunction(this, 'SmsWorker', {
      workerName: 'sms-worker',
      codePath: path.join(workersPath, 'sms-worker/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      memorySize: 512,
      environment: {
        CHANNEL: 'SMS',
      },
      sqsQueue: props.queuesStack.smsQueues.highQueue,
      batchSize: 10,
    });

    // Email Worker (wired to Email queues)
    this.emailWorker = new WorkerFunction(this, 'EmailWorker', {
      workerName: 'email-worker',
      codePath: path.join(workersPath, 'email-worker/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      memorySize: 512,
      environment: {
        CHANNEL: 'EMAIL',
      },
      sqsQueue: props.queuesStack.emailQueues.highQueue,
      batchSize: 10,
    });

    // WhatsApp Worker (wired to WA queues)
    this.waWorker = new WorkerFunction(this, 'WaWorker', {
      workerName: 'wa-worker',
      codePath: path.join(workersPath, 'wa-worker/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(60),
      memorySize: 512,
      environment: {
        CHANNEL: 'WHATSAPP',
      },
      sqsQueue: props.queuesStack.waQueues.highQueue,
      batchSize: 10,
    });

    // Voice Worker (wired to Voice queues, HIGH priority)
    this.voiceWorker = new WorkerFunction(this, 'VoiceWorker', {
      workerName: 'voice-worker',
      codePath: path.join(workersPath, 'voice-worker/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(30), // Voice calls are time-sensitive
      memorySize: 512,
      reservedConcurrentExecutions: 100, // Voice calls need high concurrency
      environment: {
        CHANNEL: 'VOICE',
      },
      sqsQueue: props.queuesStack.voiceQueues.highQueue,
      batchSize: 5, // Lower batch size for faster processing
    });

    // Webhook Dispatch Worker (wired to Webhook queues)
    this.webhookDispatchWorker = new WorkerFunction(
      this,
      'WebhookDispatchWorker',
      {
        workerName: 'webhook-dispatch',
        codePath: path.join(workersPath, 'webhook-dispatch/dist'),
        handler: 'index.handler',
        timeout: Duration.seconds(60),
        memorySize: 256, // Webhook dispatch is lightweight
        environment: {
          WEBHOOK_TIMEOUT: '10000', // 10s timeout for HTTP calls
        },
        sqsQueue: props.queuesStack.webhookQueues.highQueue,
        batchSize: 10,
      }
    );

    // Webhook Ingest (API Gateway → Lambda, not wired here)
    this.webhookIngestWorker = new WorkerFunction(this, 'WebhookIngestWorker', {
      workerName: 'webhook-ingest',
      codePath: path.join(workersPath, 'webhook-ingest/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        WEBHOOK_INGEST: 'true',
      },
      // No SQS queue - triggered by API Gateway
    });

    // SES Feedback (SNS → Lambda, not wired here)
    this.sesFeedbackWorker = new WorkerFunction(this, 'SesFeedbackWorker', {
      workerName: 'ses-feedback',
      codePath: path.join(workersPath, 'ses-feedback/dist'),
      handler: 'index.handler',
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        SES_FEEDBACK: 'true',
      },
      // No SQS queue - triggered by SNS
    });
  }
}
