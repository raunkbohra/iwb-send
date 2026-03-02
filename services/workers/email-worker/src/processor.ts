import { prisma } from '@iwb/db';
import {
  Channel,
  SqsJobPayload,
  AppError,
  MessageStatus,
  EventType,
} from '@iwb/shared';
import { logger } from '@iwb/observability';
import { SmartRoutingEngine } from '@iwb/routing';
import { providerRegistry } from '@iwb/providers';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});
const credentialsCache = new Map<string, unknown>();

/**
 * Process a single Email send job
 * Implements idempotency, routing, provider invocation, DB updates, and wallet ledger
 */
export async function processEmailJob(
  job: SqsJobPayload,
  childLogger: any
): Promise<void> {
  // 1. Fetch message + tenant from DB
  const message = await prisma.message.findUnique({
    where: { id: job.messageId },
    include: {
      tenant: true,
      template: true,
    },
  });

  if (!message) {
    childLogger.warn('Message not found', { messageId: job.messageId });
    throw new Error(`Message ${job.messageId} not found`);
  }

  if (message.tenantId !== job.tenantId) {
    childLogger.error('Tenant mismatch', {
      messageId: job.messageId,
      expected: job.tenantId,
      actual: message.tenantId,
    });
    throw AppError.internalError();
  }

  // 2. Check idempotency: skip if already sent/delivered
  if (
    message.status === MessageStatus.SENT ||
    message.status === MessageStatus.DELIVERED
  ) {
    childLogger.info('Message already processed, skipping', {
      messageId: job.messageId,
      status: message.status,
    });
    return;
  }

  // 3. Run SmartRoutingEngine to select provider
  const routing = new SmartRoutingEngine();
  const routeResult = await routing.selectProvider({
    tenantId: job.tenantId,
    channel: Channel.EMAIL,
    purpose: job.purpose,
    to: message.to,
    attemptNumber: message.attemptCount + 1,
  });

  if (!routeResult) {
    childLogger.error('No route available for Email', {
      messageId: job.messageId,
      to: message.to,
      attempts: message.attemptCount,
    });

    // Mark message as FAILED
    await prisma.message.update({
      where: { id: job.messageId },
      data: {
        status: MessageStatus.FAILED,
        failureCode: 'NO_ROUTE',
        failureReason: 'No Email provider available for recipient',
      },
    });

    // Fire webhook-dispatch job (notification of failure)
    await enqueueWebhookDispatchJob(
      job.messageId,
      job.tenantId,
      EventType.FAILED
    );

    return;
  }

  // 4. Fetch provider credentials from Secrets Manager
  const credentialKey = `iwb/provider/${routeResult.provider}/${job.tenantId}`;
  let credentials = credentialsCache.get(credentialKey);

  if (!credentials) {
    try {
      const secret = await secretsClient.send(
        new GetSecretValueCommand({
          SecretId: credentialKey,
        })
      );
      credentials = JSON.parse(secret.SecretString || '{}');
      credentialsCache.set(credentialKey, credentials);
    } catch (error) {
      childLogger.error('Failed to fetch provider credentials', {
        messageId: job.messageId,
        provider: routeResult.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      throw AppError.internalError();
    }
  }

  // 5. Get provider adapter and call send()
  const provider = providerRegistry.getAdapter(
    routeResult.provider,
    Channel.EMAIL
  );
  if (!provider) {
    throw AppError.internalError();
  }

  let sendResult;

  try {
    sendResult = await provider.send(
      {
        to: message.to,
        from: message.from || '',
        content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
      },
      credentials
    );

    childLogger.info('Email sent via provider', {
      messageId: job.messageId,
      provider: routeResult.provider,
      providerMessageId: sendResult.externalId,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    childLogger.error('Provider send failed', {
      messageId: job.messageId,
      provider: routeResult.provider,
      error: error.message,
    });

    // Increment attempt count
    await prisma.message.update({
      where: { id: job.messageId },
      data: {
        attemptCount: message.attemptCount + 1,
        failureCode: err instanceof AppError ? err.code : 'PROVIDER_ERROR',
        failureReason: error.message,
      },
    });

    throw error;
  }

  // 6. Update message: status=SENT, provider_message_id, attempt_count++
  const updateData: Parameters<typeof prisma.message.update>[0]['data'] = {
    status: MessageStatus.SENT,
    provider: routeResult.provider,
    sentAt: new Date(),
    attemptCount: message.attemptCount + 1,
  };
  
  if (sendResult.externalId) {
    updateData.providerMessageId = sendResult.externalId;
  }

  await prisma.message.update({
    where: { id: job.messageId },
    data: updateData,
  });

  // 7. Append message_event (SENT)
  const eventPayload: any = {};
  if (sendResult.externalId) {
    eventPayload.externalId = sendResult.externalId;
  }
  if (sendResult.cost) {
    eventPayload.cost = sendResult.cost;
  }

  await prisma.messageEvent.create({
    data: {
      messageId: job.messageId,
      tenantId: job.tenantId,
      type: EventType.SENT,
      provider: routeResult.provider,
      payload: eventPayload,
      occurredAt: new Date(),
    },
  });

  // 8. Debit wallet (ledger entry)
  const walletAccount = await prisma.walletAccount.findUnique({
    where: { tenantId: job.tenantId },
  });

  if (!walletAccount) {
    childLogger.error('Wallet account not found', { tenantId: job.tenantId });
    throw AppError.internalError();
  }

  let debitAmount: bigint;
  if (typeof sendResult.cost === 'bigint') {
    debitAmount = sendResult.cost;
  } else if (typeof sendResult.cost === 'number') {
    debitAmount = BigInt(sendResult.cost);
  } else {
    debitAmount = BigInt(1000); // Default to 1 unit
  }

  const newBalance = walletAccount.balanceUnits - debitAmount;

  if (newBalance < 0n) {
    childLogger.warn('Insufficient balance after debit', {
      messageId: job.messageId,
      current: walletAccount.balanceUnits,
      debit: debitAmount,
    });
  }

  await prisma.walletLedgerEntry.create({
    data: {
      tenantId: job.tenantId,
      walletAccountId: walletAccount.id,
      type: 'DEBIT',
      amountUnits: debitAmount,
      balanceAfter: newBalance,
      description: `Email sent via ${routeResult.provider}`,
      referenceType: 'MESSAGE',
      referenceId: job.messageId,
    },
  });

  // Update wallet balance
  await prisma.walletAccount.update({
    where: { id: walletAccount.id },
    data: { balanceUnits: newBalance },
  });

  // 9. Enqueue webhook-dispatch job for delivery notification
  await enqueueWebhookDispatchJob(job.messageId, job.tenantId, EventType.SENT);

  childLogger.info('Email job fully processed', {
    messageId: job.messageId,
    provider: routeResult.provider,
    cost: sendResult.cost,
  });
}

/**
 * Helper: Enqueue a webhook dispatch job
 * TODO: Wire to SQS in Batch 4
 */
async function enqueueWebhookDispatchJob(
  messageId: string,
  tenantId: string,
  eventType: EventType
): Promise<void> {
  // Stub: Will integrate SQS in Batch 4
  console.log(
    `[STUB] Webhook dispatch job queued: ${messageId} - ${eventType}`
  );
}
