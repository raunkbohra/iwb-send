import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { logger } from '@iwb/observability';
import { processWaJob } from './processor';

/**
 * WhatsApp Worker Handler
 * Processes SQS messages containing WhatsApp send jobs
 */
export const handler = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  logger.info('WhatsApp worker received batch', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const jobPayload = JSON.parse(record.body);
      const correlationId =
        jobPayload.correlationId || record.messageId || 'unknown';
      const childLogger = logger.child({ correlationId });

      childLogger.info('Processing WhatsApp job', {
        messageId: jobPayload.messageId,
      });

      await processWaJob(jobPayload, childLogger);

      childLogger.info('WhatsApp job processed successfully', {
        messageId: jobPayload.messageId,
      });
    } catch (error) {
      logger.error('Failed to process WhatsApp job', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  logger.info('WhatsApp worker batch complete', {
    total: event.Records.length,
    failed: batchItemFailures.length,
  });

  return { batchItemFailures };
};
