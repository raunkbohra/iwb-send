import { prisma } from '@iwb/db';
import {
  Channel,
  SqsJobPayload,
  AppError,
  MessageStatus,
  EventType,
} from '@iwb/shared';
import { Logger } from '@iwb/observability';
import { SmartRoutingEngine } from '@iwb/routing';
import { ProviderRegistry } from '@iwb/providers';
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
  logger: Logger
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
    logger.info('Message already processed, skipping', {
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
    logger.error('No route available for voice', {
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
      EventType.DELIVERY_FAILED
    );
    return;
  }

  const credentialKey = `iwb/provider/${routeResult.provider}/${job.tenantId}`;
  let credentials = credentialsCache.get(credentialKey);

  if (!credentials) {
    const secret = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: credentialKey })
    );
    credentials = JSON.parse(secret.SecretString || '{}');
    credentialsCache.set(credentialKey, credentials);
  }

  const provider = ProviderRegistry.getAdapter(routeResult.provider);
  let sendResult;

  try {
    sendResult = await provider.send(
      {
        to: message.to,
        from: message.from,
        content: message.content,
      },
      credentials
    );

    logger.info('Voice call initiated via provider', {
      messageId: job.messageId,
      provider: routeResult.provider,
    });
  } catch (error) {
    logger.error('Provider voice call failed', { messageId: job.messageId });

    await prisma.message.update({
      where: { id: job.messageId },
      data: {
        attemptCount: message.attemptCount + 1,
        failureCode: error instanceof AppError ? error.code : 'PROVIDER_ERROR',
      },
    });

    throw error;
  }

  await prisma.message.update({
    where: { id: job.messageId },
    data: {
      status: MessageStatus.SENT,
      provider: routeResult.provider,
      providerMessageId: sendResult.externalId,
      sentAt: new Date(),
      attemptCount: message.attemptCount + 1,
    },
  });

  await prisma.messageEvent.create({
    data: {
      messageId: job.messageId,
      tenantId: job.tenantId,
      type: EventType.SENT,
      provider: routeResult.provider,
      payload: { externalId: sendResult.externalId },
      occurredAt: new Date(),
    },
  });

  const walletAccount = await prisma.walletAccount.findUnique({
    where: { tenantId: job.tenantId },
  });

  if (!walletAccount) throw AppError.internalError();

  const debitAmount = sendResult.cost || BigInt(10000); // Voice calls cost more
  const newBalance = walletAccount.balanceUnits - debitAmount;

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

  logger.info('Voice job fully processed', { messageId: job.messageId });
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
