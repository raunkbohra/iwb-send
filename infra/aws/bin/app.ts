#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { QueuesStack } from '../lib/stacks/queues-stack';
import { WorkersStack } from '../lib/stacks/workers-stack';
import { ApiGatewayStack } from '../lib/stacks/api-gateway-stack';
import { SnsStack } from '../lib/stacks/sns-stack';

const app = new cdk.App();

const region = 'ap-south-1';
const environment = {
  region: region,
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
};

// Create Queues Stack (all SQS FIFO queues)
const queuesStack = new QueuesStack(app, 'iWB-QueuesStack', {
  env: environment,
  description: 'iWB Send - SQS FIFO queues for message routing',
  stackName: 'iwb-queues',
});

// Create Workers Stack (all Lambda functions)
const workersStack = new WorkersStack(app, 'iWB-WorkersStack', {
  env: environment,
  queuesStack: queuesStack,
  description: 'iWB Send - Lambda workers for message processing',
  stackName: 'iwb-workers',
});

// Add dependency: workers stack depends on queues stack
workersStack.addDependency(queuesStack);

// Create API Gateway Stack (for webhook-ingest Lambda)
const apiGatewayStack = new ApiGatewayStack(app, 'iWB-ApiGatewayStack', {
  env: environment,
  webhookIngestFunction: workersStack.webhookIngestWorker.function,
  description: 'iWB Send - API Gateway for webhook ingestion',
  stackName: 'iwb-api-gateway',
});

// Add dependency: API Gateway depends on workers stack
apiGatewayStack.addDependency(workersStack);

// Create SNS Stack (for SES feedback)
const snsStack = new SnsStack(app, 'iWB-SnsStack', {
  env: environment,
  sesFeedbackFunction: workersStack.sesFeedbackWorker.function,
  description: 'iWB Send - SNS topic for SES bounce/complaint events',
  stackName: 'iwb-sns',
});

// Add dependency: SNS depends on workers stack
snsStack.addDependency(workersStack);

// Output queue URLs and Lambda ARNs
new cdk.CfnOutput(app, 'SmsHighQueueUrl', {
  value: queuesStack.smsQueues.highQueue.queueUrl,
  description: 'SMS High Priority Queue URL',
  exportName: 'iWB-SmsHighQueueUrl',
});

new cdk.CfnOutput(app, 'SmsBulkQueueUrl', {
  value: queuesStack.smsQueues.bulkQueue.queueUrl,
  description: 'SMS Bulk Queue URL',
  exportName: 'iWB-SmsBulkQueueUrl',
});

new cdk.CfnOutput(app, 'SmsWorkerArn', {
  value: workersStack.smsWorker.function.functionArn,
  description: 'SMS Worker Lambda ARN',
  exportName: 'iWB-SmsWorkerArn',
});

console.log('CDK App initialized with Queues and Workers stacks');
