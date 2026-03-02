import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@iwb/db';
import { Channel, Purpose, AppError, generateCorrelationId } from '@iwb/shared';
import { validateApiKey, extractApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkBalance } from '@/lib/wallet';
import { enqueueSendJob } from '@/lib/enqueue';

export async function POST(request: NextRequest) {
  try {
    const correlationId = generateCorrelationId();

    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) throw AppError.invalidApiKey();

    const authResult = await validateApiKey(apiKeyRaw);
    if (!authResult) throw AppError.invalidApiKey();

    const { tenantId } = authResult;

    const body = await request.json();
    const { to, from, content, templateId, idempotencyKey } = body;

    if (!to) {
      throw AppError.invalidRequest({ message: 'Missing required field: to' });
    }

    if (!checkRateLimit(tenantId)) {
      throw AppError.rateLimitExceeded();
    }
    
    await checkBalance(tenantId, BigInt(10000));

    const message = await prisma.message.create({
      data: {
        tenantId,
        channel: Channel.VOICE,
        purpose: Purpose.TRANSACTIONAL,
        to,
        from: from || null,
        templateId: templateId || null,
        content: content,
        status: 'QUEUED',
        idempotencyKey: idempotencyKey || null,
        costUnits: BigInt(10000),
        metadata: { correlationId },
      },
    });

    await enqueueSendJob({
      messageId: message.id,
      tenantId,
      channel: Channel.VOICE,
      purpose: Purpose.TRANSACTIONAL,
      priority: 'HIGH',
      correlationId,
    });

    return NextResponse.json({
      success: true,
      data: { messageId: message.id, status: 'queued' },
    });
  } catch (error) {
    const err = error instanceof AppError ? error : AppError.internalError();
    return NextResponse.json(
      { success: false, error: err.toJSON() },
      { status: err.statusCode }
    );
  }
}
