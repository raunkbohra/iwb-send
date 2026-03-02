import { SNSEvent, SNSEventRecord } from 'aws-lambda';
import { prisma } from '@iwb/db';
import { logger } from '@iwb/observability';
import { MessageStatus } from '@iwb/shared';

/**
 * SES Feedback Handler
 * SNS trigger for SES bounce and complaint notifications
 * Updates suppression list and message status
 */
export const handler = async (event: SNSEvent): Promise<void> => {
  logger.info('SES feedback received', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const correlationId = record.Sns.MessageId;
      const childLogger = logger.child({ correlationId });

      await processSESNotification(record, childLogger);

      childLogger.info('SES notification processed');
    } catch (error) {
      logger.error('Failed to process SES notification', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

/**
 * Process SES bounce or complaint notification
 * SES sends JSON in the SNS Message field
 */
async function processSESNotification(
  record: SNSEventRecord,
  logger: any
): Promise<void> {
  const messageStr = record.Sns.Message;
  const notification = JSON.parse(messageStr);
  const notificationType = notification.notificationType; // Bounce, Complaint, Delivery, Send

  logger.info('Processing SES notification', {
    type: notificationType,
    messageId: notification.mail?.messageId,
  });

  if (notificationType === 'Bounce') {
    await processBounce(notification, logger);
  } else if (notificationType === 'Complaint') {
    await processComplaint(notification, logger);
  } else if (notificationType === 'Delivery') {
    await processDelivery(notification, logger);
  } else {
    logger.info('Skipping notification type', { type: notificationType });
  }
}

/**
 * Handle Bounce notification
 * Adds email to suppression list, marks message as FAILED
 * Bounce types: Undetermined, Permanent, Transient
 */
async function processBounce(
  notification: any,
  logger: any
): Promise<void> {
  const bounce = notification.bounce;
  const bounceType = bounce.bounceType; // Permanent, Transient, Undetermined
  const bounceSubType = bounce.bounceSubType;
  const timestamp = bounce.timestamp;

  // Process permanent bounces (invalid addresses)
  if (bounceType === 'Permanent') {
    for (const recipient of bounce.bouncedRecipients || []) {
      const email = recipient.emailAddress;
      const reason = `Permanent bounce: ${recipient.diagnosticCode || bounceSubType}`;

      logger.info('Adding to suppression list', {
        email,
        reason,
        bounceSubType: recipient.status,
      });

      // Add to suppression list
      await prisma.suppressionList.upsert({
        where: {
          email_tenantId: {
            email,
            tenantId: null, // Global suppression
          },
        },
        update: {
          reason,
          source: 'SES_BOUNCE',
        },
        create: {
          email,
          reason,
          source: 'SES_BOUNCE',
          tenantId: null,
        },
      });

      // Find and fail associated messages
      const messages = await prisma.message.findMany({
        where: {
          to: email,
          status: { in: [MessageStatus.QUEUED, MessageStatus.SENT] },
          createdAt: {
            gte: new Date(new Date(timestamp).getTime() - 5 * 60000), // 5 min window
          },
        },
      });

      for (const message of messages) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.FAILED,
            failureCode: 'PERMANENT_BOUNCE',
            failureReason: reason,
          },
        });
      }
    }
  } else if (bounceType === 'Transient') {
    logger.info('Transient bounce, will retry later', {
      recipients: bounce.bouncedRecipients?.map((r: any) => r.emailAddress),
    });
  }
}

/**
 * Handle Complaint notification
 * Adds email to suppression list with complaint flag
 */
async function processComplaint(
  notification: any,
  logger: any
): Promise<void> {
  const complaint = notification.complaint;
  const complaintFeedbackType = complaint.complaintFeedbackType; // abuse, fraud, auth-failure, etc.

  for (const recipient of complaint.complainedRecipients || []) {
    const email = recipient.emailAddress;
    const reason = `Complaint: ${complaintFeedbackType || 'spam'}`;

    logger.info('Adding to suppression list (complaint)', {
      email,
      feedbackType: complaintFeedbackType,
    });

    // Add to suppression list
    await prisma.suppressionList.upsert({
      where: {
        email_tenantId: {
          email,
          tenantId: null,
        },
      },
      update: {
        reason,
        source: 'SES_COMPLAINT',
      },
      create: {
        email,
        reason,
        source: 'SES_COMPLAINT',
        tenantId: null,
      },
    });

    // Find and fail associated messages
    const messages = await prisma.message.findMany({
      where: {
        to: email,
        status: { in: [MessageStatus.QUEUED, MessageStatus.SENT] },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    for (const message of messages) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.FAILED,
          failureCode: 'COMPLAINT',
          failureReason: reason,
        },
      });
    }
  }
}

/**
 * Handle Delivery notification
 * Marks messages as DELIVERED
 */
async function processDelivery(
  notification: any,
  logger: any
): Promise<void> {
  const delivery = notification.delivery;
  const recipients = delivery.recipients || [];

  logger.info('SES delivery confirmed', {
    recipientCount: recipients.length,
  });

  // Find and update messages to DELIVERED
  for (const recipient of recipients) {
    const email = recipient;

    const message = await prisma.message.findFirst({
      where: {
        to: email,
        status: MessageStatus.SENT,
        provider: 'SES',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (message) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      logger.info('Message marked as delivered', {
        messageId: message.id,
        email,
      });
    }
  }
}
