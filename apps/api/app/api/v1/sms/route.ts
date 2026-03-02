import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@iwb/db';
import { Channel, Purpose, AppError, generateCorrelationId } from '@iwb/shared';
import { validateApiKey, extractApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkBalance, debitWallet } from '@/lib/wallet';
import { enqueueSendJob } from '@/lib/enqueue';

export async function POST(request: NextRequest) {
  try {
    const correlationId = generateCorrelationId();

    // Authenticate
    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) {
      throw AppError.invalidApiKey();
    }

    const { tenantId } = await validateApiKey(apiKeyRaw);

    // Parse body
    const body = await request.json();
    const { to, from, content, templateId, idempotencyKey, metadata } = body;

    if (!to) {
      throw AppError.invalidRequest({ message: 'Missing required field: to' });
    }

    // Check rate limit
    checkRateLimit(tenantId, Channel.SMS);

    // Check wallet balance
    await checkBalance(tenantId, Channel.SMS);

    // Validate idempotency key (if provided)
    if (idempotencyKey) {
      const existing = await prisma.message.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: true,
            data: {
              messageId: existing.id,
              status: existing.status,
              createdAt: existing.createdAt,
            },
          },
          { status: 200 }
        );
      }
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        tenantId,
        channel: Channel.SMS,
        purpose: Purpose.TRANSACTIONAL,
        to,
        from,
        templateId,
        content,
        status: 'QUEUED',
        idempotencyKey,
        costUnits: BigInt(1000), // Estimated
        metadata,
      },
    });

    // Enqueue to SQS
    await enqueueSendJob({
      messageId: message.id,
      tenantId,
      channel: Channel.SMS,
      purpose: Purpose.TRANSACTIONAL,
      priority: 'BULK',
    });

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        status: 'queued',
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    const err = error instanceof AppError ? error : AppError.internalError();
    return NextResponse.json(
      { success: false, error: err.toJSON() },
      { status: err.statusCode }
    );
  }
}
