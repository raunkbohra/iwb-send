import { SqsJobPayload, Channel, Purpose } from '@iwb/shared';
import { generateCorrelationId } from '@iwb/shared';

/**
 * Enqueue a message to SQS for processing
 * TODO (Batch 4): Wire up actual SQS client
 */
export async function enqueueSendJob(params: {
  messageId: string;
  tenantId: string;
  channel: Channel;
  purpose: Purpose;
  priority: 'HIGH' | 'BULK';
}): Promise<{ messageId: string; status: 'queued' }> {
  const { messageId, tenantId, channel, purpose, priority } = params;

  const payload: SqsJobPayload = {
    messageId,
    tenantId,
    channel,
    purpose,
    priority,
    correlationId: generateCorrelationId(),
  };

  // TODO: Send to SQS
  // const queueUrl = priority === 'HIGH'
  //   ? process.env[`SQS_${channel}_HIGH_QUEUE_URL`]
  //   : process.env[`SQS_${channel}_BULK_QUEUE_URL`];
  // await sqs.sendMessage({
  //   QueueUrl: queueUrl,
  //   MessageBody: JSON.stringify(payload),
  //   MessageGroupId: tenantId, // For FIFO
  // });

  console.log('Enqueued:', payload);

  return { messageId, status: 'queued' };
}
