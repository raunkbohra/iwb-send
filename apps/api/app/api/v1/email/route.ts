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

    // Auth
    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) throw AppError.invalidApiKey();

    const authResult = await validateApiKey(apiKeyRaw);
    if (!authResult) throw AppError.invalidApiKey();

    const { tenantId } = authResult;

    // Parse
    const body = await request.json();
    const { to, from, subject, html, text, idempotencyKey } = body;

    if (!to || !subject) {
      throw AppError.invalidRequest({ message: 'Missing required fields' });
    }

    // Check rate limit
    if (!checkRateLimit(tenantId)) {
      throw AppError.rateLimitExceeded();
    }

    // Check balance
    await checkBalance(tenantId, BigInt(100));

    // Create message
    const message = await prisma.message.create({
      data: {
        tenantId,
        channel: Channel.EMAIL,
        purpose: Purpose.TRANSACTIONAL,
        to,
        from: from || null,
        content: { subject, html, text },
        status: 'QUEUED',
        idempotencyKey: idempotencyKey || null,
        costUnits: BigInt(100),
        metadata: { correlationId },
      },
    });

    // Enqueue
    await enqueueSendJob({
      messageId: message.id,
      tenantId,
      channel: Channel.EMAIL,
      purpose: Purpose.TRANSACTIONAL,
      priority: 'BULK',
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
