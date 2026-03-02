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
 * Process a single voice call job
 * Voice calls are HIGH priority (30s visibility timeout)
 */
export async function processVoiceJob(
  job: SqsJobPayload,
  childLogger: any
): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: job.messageId },
    include: { tenant: true, template: true },
  });

  if (!message) {
    throw new Error(`Message ${job.messageId} not found`);
  }

  if (message.tenantId !== job.tenantId) {
    throw AppError.internalError();
  }

  if (
    message.status === MessageStatus.SENT ||
    message.status === MessageStatus.DELIVERED
  ) {
    childLogger.info('Message already processed, skipping', {
      messageId: job.messageId,
    });
    return;
  }

  const routing = new SmartRoutingEngine();
  const routeResult = await routing.selectProvider({
    tenantId: job.tenantId,
    channel: Channel.VOICE,
    purpose: job.purpose,
    to: message.to,
    attemptNumber: message.attemptCount + 1,
  });

  if (!routeResult) {
    childLogger.error('No route available for voice', {
      messageId: job.messageId,
    });

    await prisma.message.update({
      where: { id: job.messageId },
      data: {
        status: MessageStatus.FAILED,
        failureCode: 'NO_ROUTE',
        failureReason: 'No voice provider available',
      },
    });

    await enqueueWebhookDispatchJob(
      job.messageId,
      job.tenantId,
      EventType.FAILED
    );
    return;
  }

  const credentialKey = `iwb/provider/${routeResult.provider}/${job.tenantId}`;
  let credentials = credentialsCache.get(credentialKey);

  if (!credentials) {
    try {
      const secret = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: credentialKey })
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

  const provider = providerRegistry.getAdapter(routeResult.provider, Channel.VOICE);
  if (!provider) {
    throw AppError.internalError();
  }

  let sendResult;

  try {
    // For voice calls, content is the message script/text
    let contentStr = '';
    if (typeof message.content === 'string') {
      contentStr = message.content;
    } else if (typeof message.content === 'object' && message.content !== null) {
      contentStr = JSON.stringify(message.content);
    }

    sendResult = await provider.send(
      {
        to: message.to,
        from: message.from || '',
        content: contentStr,
      },
      credentials
    );

    childLogger.info('Voice call initiated via provider', {
      messageId: job.messageId,
      provider: routeResult.provider,
      externalId: sendResult.externalId,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    childLogger.error('Provider voice call failed', {
      messageId: job.messageId,
      provider: routeResult.provider,
      error: errorMsg,
    });

    await prisma.message.update({
      where: { id: job.messageId },
      data: {
        attemptCount: message.attemptCount + 1,
        failureCode: error instanceof AppError ? error.code : 'PROVIDER_ERROR',
        failureReason: errorMsg,
      },
    });

    throw error;
  }

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

  // Create event payload with properly typed JSON
  const eventPayload: any = {};
  if (sendResult.externalId) {
    eventPayload.externalId = sendResult.externalId;
  }
  if (sendResult.cost) {
    eventPayload.cost = typeof sendResult.cost === 'bigint' 
      ? sendResult.cost.toString() 
      : sendResult.cost;
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
    debitAmount = BigInt(10000); // Default for voice calls
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
      description: `Voice call via ${routeResult.provider}`,
      referenceType: 'MESSAGE',
      referenceId: job.messageId,
    },
  });

  await prisma.walletAccount.update({
    where: { id: walletAccount.id },
    data: { balanceUnits: newBalance },
  });

  await enqueueWebhookDispatchJob(
    job.messageId,
    job.tenantId,
    EventType.SENT
  );

  childLogger.info('Voice job fully processed', {
    messageId: job.messageId,
    provider: routeResult.provider,
    cost: sendResult.cost,
  });
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
