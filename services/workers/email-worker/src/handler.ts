import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { logger } from '@iwb/observability';
import { processEmailJob } from './processor';

/**
 * Email Worker Handler
 * Entry point for Lambda. Processes SQS messages containing email send jobs.
 * Implements partial batch failure pattern for resilience.
 */
export const handler = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  logger.info('Email worker received batch', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const jobPayload = JSON.parse(record.body);
      const correlationId =
        jobPayload.correlationId || record.messageId || 'unknown';

      const childLogger = logger.child({ correlationId });

      childLogger.info('Processing email job', {
        messageId: jobPayload.messageId,
        tenantId: jobPayload.tenantId,
      });

      await processEmailJob(jobPayload, childLogger);

      childLogger.info('Email job processed successfully', {
        messageId: jobPayload.messageId,
      });
    } catch (error) {
      logger.error('Failed to process email job', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : String(error),
        body: record.body,
      });

      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  logger.info('Email worker batch complete', {
    total: event.Records.length,
    failed: batchItemFailures.length,
    succeeded: event.Records.length - batchItemFailures.length,
  });

  return { batchItemFailures };
};
