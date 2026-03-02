import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@iwb/db';
import { Channel, Purpose, AppError } from '@iwb/shared';
import { validateApiKey, extractApiKey } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkBalance } from '@/lib/wallet';
import { enqueueSendJob } from '@/lib/enqueue';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) throw AppError.invalidApiKey();

    const { tenantId } = await validateApiKey(apiKeyRaw);

    const body = await request.json();
    const { to, from, content, templateId, idempotencyKey } = body;

    if (!to) {
      throw AppError.invalidRequest({ message: 'Missing required field: to' });
    }

    checkRateLimit(tenantId, Channel.VOICE);
    await checkBalance(tenantId, Channel.VOICE);

    const message = await prisma.message.create({
      data: {
        tenantId,
        channel: Channel.VOICE,
        purpose: Purpose.TRANSACTIONAL,
        to,
        from,
        templateId,
        content,
        status: 'QUEUED',
        idempotencyKey,
        costUnits: BigInt(10000),
      },
    });

    await enqueueSendJob({
      messageId: message.id,
      tenantId,
      channel: Channel.VOICE,
      purpose: Purpose.TRANSACTIONAL,
      priority: 'HIGH',
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
