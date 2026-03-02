# iWB Send — AWS CDK Infrastructure

AWS CDK Infrastructure as Code for deploying iWB Send message processing workers to production.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ API (apps/api) @ api.iwbsend.com                         │
│ ↓ enqueue message job                                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ SQS FIFO Queues (5 channels × 2 priority levels)        │
│ ├─ SMS (high=30s, bulk=60s)                             │
│ ├─ Email (high=30s, bulk=60s)                           │
│ ├─ WhatsApp (high=30s, bulk=60s)                        │
│ ├─ Voice (high=30s, bulk=60s)                           │
│ └─ Webhook (high=30s, bulk=60s)                         │
│                                                           │
│ ↓ Lambda event source mapping                            │
│                                                           │
│ Lambda Workers (7 functions)                             │
│ ├─ sms-worker (SQS → send via Sparrow/Aakash/Telnyx)   │
│ ├─ email-worker (SQS → send via SES)                    │
│ ├─ wa-worker (SQS → send via Meta WA API)               │
│ ├─ voice-worker (SQS → initiate via Telnyx)             │
│ ├─ webhook-dispatch (SQS → POST to customer endpoint)   │
│ ├─ webhook-ingest (API Gateway → receive callbacks)     │
│ └─ ses-feedback (SNS → handle bounces/complaints)       │
│                                                           │
│ ↓ update database + enqueue next job                     │
│                                                           │
│ RDS PostgreSQL                                            │
│ (connection via RDS Proxy or direct + security group)   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Stacks

### QueuesStack
Creates all SQS FIFO queues organized by channel and priority:

| Channel    | High Queue         | Bulk Queue          | Config                    |
|------------|-------------------|---------------------|---------------------------|
| SMS        | `iwb-sms-high`    | `iwb-sms-bulk`      | 30s visibility, 3 retries |
| Email      | `iwb-email-high`  | `iwb-email-bulk`    | 30s visibility, 3 retries |
| WhatsApp   | `iwb-wa-high`     | `iwb-wa-bulk`       | 30s visibility, 3 retries |
| Voice      | `iwb-voice-high`  | `iwb-voice-bulk`    | 30s visibility, 3 retries |
| Webhook    | `iwb-webhook-high`| `iwb-webhook-bulk`  | 30s visibility, 3 retries |

**Features:**
- FIFO queues with `MessageGroupId = tenantId` (strict tenant isolation)
- Content-based deduplication (idempotency keys)
- Dead-letter queues (14-day retention)
- Long-polling (20s ReceiveWaitTime)
- DLQ routing after maxReceiveCount exceeded

### WorkersStack
Creates 7 Lambda functions with proper IAM roles and SQS event sources:

| Worker                 | Memory | Timeout | Concurrency | Event Source          |
|------------------------|--------|---------|-------------|----------------------|
| sms-worker             | 512 MB | 60s     | default     | SMS high queue        |
| email-worker           | 512 MB | 60s     | default     | Email high queue      |
| wa-worker              | 512 MB | 60s     | default     | WA high queue         |
| voice-worker           | 512 MB | 30s     | 100 (res)   | Voice high queue      |
| webhook-dispatch       | 256 MB | 60s     | default     | Webhook high queue    |
| webhook-ingest         | 256 MB | 30s     | default     | API Gateway (stub)    |
| ses-feedback           | 256 MB | 30s     | default     | SNS (stub)            |

**IAM Permissions:**
- CloudWatch Logs (PutLogEvents)
- AWS Secrets Manager (GetSecretValue for iwb/provider/*)
- SQS (ReceiveMessage, ChangeMessageVisibility, DeleteMessage)
- RDS (DescribeDBInstances, rds-db:connect)

**Environment:**
- `NODE_ENV=production`
- `AWS_REGION=ap-south-1`
- Channel-specific vars (CHANNEL=SMS, etc.)

## Setup

### Prerequisites
```bash
# Install Node.js 20.x
node --version  # v20.x.x

# Install AWS CLI v2 and configure credentials
aws configure

# Install pnpm
pnpm install
```

### Build Workers
Before deploying CDK, build all worker code:

```bash
cd /path/to/repo
pnpm --filter "@iwb/sms-worker" run build
pnpm --filter "@iwb/email-worker" run build
# ... repeat for all workers
```

Or use turbo:
```bash
pnpm turbo run build --filter "services/workers/*"
```

### Synth & Deploy

```bash
cd infra/aws

# Install CDK dependencies
pnpm install

# Synthesize CloudFormation template
pnpm cdk:synth

# Deploy to AWS (requires credentials + account)
pnpm cdk:deploy

# View outputs
aws cloudformation describe-stacks --stack-name iwb-queues
aws cloudformation describe-stacks --stack-name iwb-workers
```

## Configuration

### Environment Variables
- `CDK_DEFAULT_ACCOUNT`: AWS account ID (auto-detected or set explicitly)
- `CDK_DEFAULT_REGION`: Region (default: ap-south-1)
- `AWS_PROFILE`: AWS CLI profile (optional)

### Context Values (cdk.json)
```json
{
  "context": {
    "environment": "production",
    "region": "ap-south-1",
    "domain": "api.iwbsend.com",
    "webhookDomain": "hooks.iwbsend.com"
  }
}
```

## Monitoring & Debugging

### CloudWatch Logs
```bash
# View SMS Worker logs
aws logs tail /aws/lambda/iwb-sms-worker --follow

# View SQS DLQ messages
aws sqs receive-message --queue-url <DLQ_URL>
```

### Lambda Metrics
```bash
# View invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=iwb-sms-worker \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### SQS Queue Monitoring
```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url <QUEUE_URL> \
  --attribute-names ApproximateNumberOfMessages
```

## Costs

**Rough monthly estimate (10M messages/month):**
- SQS: ~$10 (FIFO $0.50/million requests)
- Lambda: ~$200 (512MB, 60s avg, 10M invocations)
- RDS: ~$50-200 (depending on DB size + network)
- **Total: ~$250-400/month for infrastructure**

## Troubleshooting

### Workers not receiving messages
1. Check SQS queue has messages: `aws sqs receive-message --queue-url <URL>`
2. Check Lambda logs: `aws logs tail /aws/lambda/iwb-sms-worker --follow`
3. Verify IAM role has SQS permissions
4. Check Lambda function has SQS event source mapping: `aws lambda list-event-source-mappings --function-name iwb-sms-worker`

### Worker failures
1. Check failure logs in CloudWatch
2. Verify Secrets Manager has credentials: `aws secretsmanager list-secrets --query 'SecretList[?Name==`iwb/provider/*`]'`
3. Check database connectivity (security group rules)
4. Verify worker handler exports correct `handler` function

### Credentials not found
1. Verify Secrets Manager secret exists: `aws secretsmanager get-secret-value --secret-id iwb/provider/TELNYX/<tenant-id>`
2. Check Lambda IAM role has `secretsmanager:GetSecretValue` permission
3. Verify ARN pattern in IAM policy: `arn:aws:secretsmanager:*:*:secret:iwb/provider/*`

## Next Steps

**To be implemented in Batch 4.5:**
- [ ] API Gateway for webhook-ingest Lambda
- [ ] SNS topic for SES bounce/complaint notifications
- [ ] RDS Proxy for connection pooling
- [ ] VPC configuration + security groups
- [ ] CloudWatch alarms for worker failures
- [ ] X-Ray tracing for distributed tracing
- [ ] Auto-scaling policies for Lambda concurrency
- [ ] Cost optimization (reserved capacity, spot instances)

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda SQS Event Source](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [SQS FIFO Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html)
- [Lambda IAM Permissions](https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html)
