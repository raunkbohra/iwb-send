import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { logger } from '@iwb/observability';
import { processVoiceJob } from './processor';

/**
 * Voice Worker Handler
 * Processes SQS messages containing voice call jobs (HIGH priority)
 */
export const handler = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  logger.info('Voice worker received batch', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const jobPayload = JSON.parse(record.body);
      const correlationId =
        jobPayload.correlationId || record.messageId || 'unknown';
      const childLogger = logger.child({ correlationId });

      childLogger.info('Processing voice job', {
        messageId: jobPayload.messageId,
      });

      await processVoiceJob(jobPayload, childLogger);

      childLogger.info('Voice job processed successfully', {
        messageId: jobPayload.messageId,
      });
    } catch (error) {
      logger.error('Failed to process voice job', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  logger.info('Voice worker batch complete', {
    total: event.Records.length,
    failed: batchItemFailures.length,
  });

  return { batchItemFailures };
};
