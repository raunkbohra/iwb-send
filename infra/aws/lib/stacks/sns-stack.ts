import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Topic, Subscription, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { ConfigurationSet } from 'aws-cdk-lib/aws-ses';
import { Construct } from 'constructs';

export interface SnsStackProps extends StackProps {
  sesFeedbackFunction: Function;
  sesConfigSetName?: string;
}

/**
 * SNS Stack
 * Creates SNS topic for SES bounce/complaint notifications
 *
 * Flow:
 * 1. SES sends bounce/complaint → SNS topic (via ConfigurationSet)
 * 2. SNS topic → Lambda (ses-feedback)
 * 3. Lambda processes bounce/complaint → update message status + suppression list
 *
 * Message types:
 * - Bounce (hard/soft)
 * - Complaint
 * - Delivery
 * - Send
 * - Open
 * - Click
 * - Reject
 */
export class SnsStack extends Stack {
  public readonly sesFeedbackTopic: Topic;

  constructor(scope: Construct, id: string, props: SnsStackProps) {
    super(scope, id, props);

    // Create SNS topic for SES events
    this.sesFeedbackTopic = new Topic(this, 'SesFeedbackTopic', {
      topicName: 'iwb-ses-feedback',
      displayName: 'iWB Send SES Feedback (Bounce/Complaint)',
    });

    // Subscribe Lambda to topic
    this.sesFeedbackTopic.addSubscription(
      new LambdaSubscription(props.sesFeedbackFunction, {
        // Filter only bounce and complaint events
        filterPolicy: {
          eventType: SubscriptionFilter.stringFilter({
            allowlist: ['Bounce', 'Complaint'],
          }),
        },
      })
    );

    // Grant Lambda permission to be invoked by SNS
    props.sesFeedbackFunction.addPermission('AllowSnsInvoke', {
      principal: new (require('aws-cdk-lib/aws-iam').ServicePrincipal)('sns.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: this.sesFeedbackTopic.topicArn,
    });

    // Output topic ARN for SES ConfigurationSet binding
    new CfnOutput(this, 'SesFeedbackTopicArn', {
      value: this.sesFeedbackTopic.topicArn,
      exportName: 'iwb-ses-feedback-topic-arn',
      description: 'SNS topic ARN for SES bounce/complaint events',
    });

    new CfnOutput(this, 'SesFeedbackTopicName', {
      value: this.sesFeedbackTopic.topicName,
      exportName: 'iwb-ses-feedback-topic-name',
      description: 'SNS topic name for SES ConfigurationSet binding',
    });
  }
}
