import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { prisma } from '@iwb/db';
import { logger } from '@iwb/observability';
import { EventType, MessageStatus } from '@iwb/shared';

/**
 * Webhook Ingest Handler
 * API Gateway Lambda @ hooks.iwbsend.com
 * Receives callbacks from providers: Telnyx (DLR), Meta WhatsApp, Sparrow, Aakash
 * Updates message status and fires webhook-dispatch jobs
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const correlationId = event.requestContext.requestId;
  const childLogger = logger.child({ correlationId });

  childLogger.info('Webhook ingest received', {
    path: event.path,
    provider: event.path.split('/')[2] || 'unknown',
  });

  try {
    const provider = event.path.split('/')[2]; // /webhooks/{provider}/

    if (!provider) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Provider not specified' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // Route to provider-specific processor
    switch (provider.toLowerCase()) {
      case 'telnyx':
        return await processTelnyxCallback(body, childLogger);
      case 'meta':
        return await processMetaCallback(body, childLogger);
      case 'sparrow':
        return await processSparrowCallback(body, childLogger);
      case 'aakash':
        return await processAakashCallback(body, childLogger);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown provider: ${provider}` }),
        };
    }
  } catch (error) {
    childLogger.error('Webhook ingest failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Process Telnyx DLR (Delivery Receipt) callback
 * Expected body: { data: { id: string, status: string } }
 */
async function processTelnyxCallback(
  body: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  const data = body.data || {};
  const externalId = data.id;
  const status = data.status; // delivered, failed, etc.

  const message = await prisma.message.findFirst({
    where: { providerMessageId: externalId },
  });

  if (!message) {
    logger.warn('Telnyx callback: message not found', { externalId });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // Map Telnyx status to our EventType
  let eventType = EventType.DELIVERY_FAILED;
  let messageStatus = MessageStatus.FAILED;

  if (status === 'delivered') {
    eventType = EventType.DELIVERED;
    messageStatus = MessageStatus.DELIVERED;
  }

  await prisma.messageEvent.create({
    data: {
      messageId: message.id,
      tenantId: message.tenantId,
      type: eventType,
      provider: 'TELNYX',
      payload: { status },
      occurredAt: new Date(),
    },
  });

  if (messageStatus !== message.status) {
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: messageStatus,
        deliveredAt:
          messageStatus === MessageStatus.DELIVERED ? new Date() : null,
      },
    });
  }

  logger.info('Telnyx callback processed', {
    messageId: message.id,
    status,
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

/**
 * Process Meta WhatsApp Status Callback
 * Expected body: { entry: [{ changes: [{ value: { statuses: [...] } }] }] }
 */
async function processMetaCallback(
  body: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  // Stub: Meta webhook structure is complex
  // TODO: Full implementation in Batch 4.5
  logger.info('[STUB] Meta callback received');

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

/**
 * Process Sparrow SMS DLR Callback
 */
async function processSparrowCallback(
  body: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  // Stub: Sparrow-specific callback format
  // TODO: Full implementation in Batch 4.5
  logger.info('[STUB] Sparrow callback received');

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

/**
 * Process Aakash SMS DLR Callback
 */
async function processAakashCallback(
  body: any,
  logger: any
): Promise<APIGatewayProxyResult> {
  // Stub: Aakash-specific callback format
  // TODO: Full implementation in Batch 4.5
  logger.info('[STUB] Aakash callback received');

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
}

async function enqueueWebhookDispatchJob(
  messageId: string,
  tenantId: string,
  eventType: EventType
): Promise<void> {
  console.log(
    `[STUB] Webhook dispatch job queued: ${messageId} - ${eventType}`
  );
}
