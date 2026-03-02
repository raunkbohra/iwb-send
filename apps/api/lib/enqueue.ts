import { Channel, Purpose } from '@iwb/shared';

/**
 * Enqueue a send job to SQS
 * For MVP, this is a stub - replace with actual SQS client in production
 */
export async function enqueueSendJob(params: {
  messageId: string;
  tenantId: string;
  channel: Channel;
  purpose: Purpose;
  priority: 'HIGH' | 'BULK';
  correlationId: string;
}): Promise<void> {
  // TODO: Implement SQS enqueue
  // For now, just log the job
  console.log('Enqueued job:', JSON.stringify(params, null, 2));
}
