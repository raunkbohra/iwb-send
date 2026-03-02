import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { logger } from '@iwb/observability';
import { processSmsJob } from './processor';

/**
 * SMS Worker Handler
 * Entry point for Lambda. Processes SQS messages containing SMS send jobs.
 * Implements partial batch failure pattern for resilience.
 */
export const handler = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  logger.info('SMS worker received batch', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const jobPayload = JSON.parse(record.body);
      const correlationId =
        jobPayload.correlationId || record.messageId || 'unknown';

      const childLogger = logger.child({ correlationId });

      childLogger.info('Processing SMS job', {
        messageId: jobPayload.messageId,
        tenantId: jobPayload.tenantId,
      });

      await processSmsJob(jobPayload, childLogger);

      childLogger.info('SMS job processed successfully', {
        messageId: jobPayload.messageId,
      });
    } catch (error) {
      logger.error('Failed to process SMS job', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
        body: record.body,
      });

      // Add to batch failures so Lambda retries later
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  logger.info('SMS worker batch complete', {
    total: event.Records.length,
    failed: batchItemFailures.length,
    succeeded: event.Records.length - batchItemFailures.length,
  });

  return { batchItemFailures };
};
