/**
 * CloudWatch Embedded Metric Format (EMF) helpers
 * Used for custom metrics and monitoring
 */

interface MetricUnit {
  name: string;
  value: number;
  unit: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None';
}

interface EMFLog {
  _aws: {
    Timestamp: number;
    CloudWatchMetrics: Array<{
      Namespace: string;
      Dimensions: Array<string[]>;
      Metrics: Array<{ name: string; unit: string }>;
    }>;
  };
  [key: string]: unknown;
}

/**
 * Create a CloudWatch EMF log entry
 */
export function createMetricEntry(
  namespace: string,
  dimensions: Record<string, string>,
  metrics: MetricUnit[]
): EMFLog {
  return {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: [Object.keys(dimensions)],
          Metrics: metrics.map((m) => ({
            name: m.name,
            unit: m.unit,
          })),
        },
      ],
    },
    ...dimensions,
    ...Object.fromEntries(metrics.map((m) => [m.name, m.value])),
  };
}

/**
 * Log a message queue metric
 */
export function logQueueMetric(
  tenantId: string,
  channel: string,
  messageCount: number,
  processingTimeMs: number
) {
  const entry = createMetricEntry('iWBSend/Queue', { tenantId, channel }, [
    { name: 'MessageCount', value: messageCount, unit: 'Count' },
    { name: 'ProcessingTime', value: processingTimeMs, unit: 'Milliseconds' },
  ]);
  console.log(JSON.stringify(entry));
}

/**
 * Log a send success metric
 */
export function logSendSuccess(
  tenantId: string,
  channel: string,
  costUnits: number,
  processingTimeMs: number
) {
  const entry = createMetricEntry('iWBSend/Send', { tenantId, channel, status: 'success' }, [
    { name: 'Cost', value: costUnits, unit: 'None' },
    { name: 'ProcessingTime', value: processingTimeMs, unit: 'Milliseconds' },
  ]);
  console.log(JSON.stringify(entry));
}

/**
 * Log a send failure metric
 */
export function logSendFailure(
  tenantId: string,
  channel: string,
  failureCode: string,
  processingTimeMs: number
) {
  const entry = createMetricEntry('iWBSend/Send', { tenantId, channel, status: 'failure' }, [
    { name: 'FailureCount', value: 1, unit: 'Count' },
    { name: 'ProcessingTime', value: processingTimeMs, unit: 'Milliseconds' },
  ]);
  console.log(JSON.stringify(entry));
}

/**
 * Log a wallet transaction
 */
export function logWalletTransaction(
  tenantId: string,
  type: 'credit' | 'debit',
  amountUnits: bigint
) {
  const entry = createMetricEntry('iWBSend/Wallet', { tenantId, type }, [
    { name: 'Amount', value: Number(amountUnits), unit: 'None' },
  ]);
  console.log(JSON.stringify(entry));
}
