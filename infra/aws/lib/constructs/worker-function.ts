import { Construct } from 'constructs';
import {
  Function as LambdaFunction,
  Runtime,
  Code,
  Architecture,
} from 'aws-cdk-lib/aws-lambda';
import {
  Role,
  ServicePrincipal,
  PolicyStatement,
  Effect,
  ManagedPolicy,
} from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface WorkerFunctionProps {
  workerName: string;
  codePath: string;
  handler: string;
  timeout?: Duration;
  memorySize?: number;
  reservedConcurrentExecutions?: number;
  environment?: Record<string, string>;
  sqsQueue?: Queue;
  batchSize?: number;
}

/**
 * Creates a Lambda function for a worker with proper IAM, environment, and SQS event source
 * Supports both SQS and API Gateway triggers
 */
export class WorkerFunction extends Construct {
  public readonly function: LambdaFunction;
  public readonly role: Role;

  constructor(scope: Construct, id: string, props: WorkerFunctionProps) {
    super(scope, id);

    // Create IAM role for Lambda
    this.role = new Role(this, 'Role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Role for ${props.workerName} Lambda function`,
    });

    // Add basic Lambda execution policy
    this.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );

    // Add CloudWatch Logs policy
    this.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
        effect: Effect.ALLOW,
      })
    );

    // Add Secrets Manager read policy
    this.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: ['arn:aws:secretsmanager:*:*:secret:iwb/provider/*'],
        effect: Effect.ALLOW,
      })
    );

    // Add RDS proxy or direct DB access (stub - would use VPC + security group in prod)
    this.role.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['rds:DescribeDBInstances', 'rds-db:connect'],
        resources: ['*'],
        effect: Effect.ALLOW,
      })
    );

    // Create Lambda function
    this.function = new LambdaFunction(this, 'Function', {
      functionName: `iwb-${props.workerName}`,
      runtime: Runtime.NODEJS_20_X,
      handler: props.handler,
      code: Code.fromAsset(props.codePath),
      role: this.role,
      timeout: props.timeout || Duration.seconds(60),
      memorySize: props.memorySize || 512,
      reservedConcurrentExecutions: props.reservedConcurrentExecutions,
      architecture: Architecture.ARM_64, // Cost optimization
      environment: {
        NODE_ENV: 'production',
        AWS_REGION: 'ap-south-1',
        ...props.environment,
      },
      description: `Worker: ${props.workerName}`,
    });

    // Wire SQS event source if provided
    if (props.sqsQueue) {
      this.function.addEventSource(
        new SqsEventSource(props.sqsQueue, {
          batchSize: props.batchSize || 10,
          reportBatchItemFailures: true, // Enable partial batch failure
        })
      );

      // Add SQS permissions
      this.role.addToPrincipalPolicy(
        new PolicyStatement({
          actions: [
            'sqs:ReceiveMessage',
            'sqs:ChangeMessageVisibility',
            'sqs:GetQueueAttributes',
            'sqs:DeleteMessage',
          ],
          resources: [props.sqsQueue.queueArn],
          effect: Effect.ALLOW,
        })
      );
    }
  }
}
