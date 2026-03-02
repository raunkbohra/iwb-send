import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { prisma } from '@iwb/db';
import { logger } from '@iwb/observability';
import { createHmac } from 'crypto';

/**
 * Webhook Dispatch Handler
 * Consumes SQS events and POSTs to customer webhook endpoints
 * Handles retries with exponential backoff via webhook_deliveries table
 */
export const handler = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: Array<{ itemIdentifier: string; reason?: string }> = [];

  logger.info('Webhook dispatch received batch', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const jobPayload = JSON.parse(record.body);
      const correlationId =
        jobPayload.correlationId || record.messageId || 'unknown';
      const childLogger = logger.child({ correlationId });

      childLogger.info('Processing webhook dispatch', {
        deliveryId: jobPayload.deliveryId,
      });

      await dispatchWebhook(jobPayload, childLogger);

      childLogger.info('Webhook dispatched successfully', {
        deliveryId: jobPayload.deliveryId,
      });
    } catch (error) {
      logger.error('Failed to dispatch webhook', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
        reason:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  logger.info('Webhook dispatch batch complete', {
    total: event.Records.length,
    failed: batchItemFailures.length,
  });

  return { batchItemFailures };
};

/**
 * Dispatch a webhook to customer endpoint
 * Fetches delivery record + webhook endpoint details
 * Signs payload with HMAC-SHA256
 * POSTs to endpoint with retry metadata
 */
async function dispatchWebhook(jobPayload: any, logger: any): Promise<void> {
  const { deliveryId, messageId, eventType } = jobPayload;

  // Fetch webhook delivery record
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      endpoint: true,
      message: { include: { events: true } } },
  });

  if (!delivery) {
    logger.warn('Webhook delivery record not found', { deliveryId });
    return;
  }

  if (!delivery.endpoint) {
    logger.warn('Webhook endpoint not found', { endpointId: delivery.endpointId });
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        lastError: 'Webhook endpoint not found',
      },
    });
    return;
  }

  // Build payload: message + event
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data: {
      messageId: delivery.message.id,
      tenantId: delivery.message.tenantId,
      channel: delivery.message.channel,
      to: delivery.message.to,
      status: delivery.message.status,
      sentAt: delivery.message.sentAt,
      events: delivery.message.events,
    },
  };

  const payloadJson = JSON.stringify(payload);
  const secret = delivery.endpoint.secretHash;
  const signature = createHmac('sha256', secret)
    .update(payloadJson)
    .digest('hex');

  logger.info('Dispatching webhook', {
    deliveryId,
    endpoint: delivery.endpoint.url,
    signature: signature.substring(0, 8) + '...',
  });

  try {
    const response = await fetch(delivery.endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IWB-Signature': signature,
        'X-IWB-Event': eventType,
        'User-Agent': 'iWB Send/1.0',
      },
      body: payloadJson,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (response.ok) {
      logger.info('Webhook delivered successfully', {
        deliveryId,
        statusCode: response.status,
      });

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          attemptCount: delivery.attemptCount + 1,
        },
      });

      return;
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error('Webhook delivery failed', {
      deliveryId,
      attemptCount: delivery.attemptCount,
      error: errorMsg,
    });

    // Check if we should retry
    const maxAttempts = 5;
    const nextAttemptAt = new Date(
      Date.now() + Math.pow(2, delivery.attemptCount + 1) * 60000
    ); // exponential backoff

    if (delivery.attemptCount < maxAttempts) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'RETRY_PENDING',
          attemptCount: delivery.attemptCount + 1,
          lastError: errorMsg,
          nextAttemptAt,
        },
      });

      // TODO: Re-enqueue with nextAttemptAt timestamp
      logger.info('Webhook scheduled for retry', {
        deliveryId,
        nextAttemptAt,
      });
    } else {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          attemptCount: delivery.attemptCount + 1,
          lastError: errorMsg,
        },
      });

      logger.error('Webhook delivery exhausted retries', { deliveryId });
    }

    throw error;
  }
}
