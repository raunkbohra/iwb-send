import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@iwb/db';
import { AppError } from '@iwb/shared';
import { validateApiKey, extractApiKey } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) throw AppError.invalidApiKey();

    const { tenantId } = await validateApiKey(apiKeyRaw);

    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        events: true,
      },
    });

    if (!message) {
      throw AppError.invalidRequest({ message: 'Message not found' });
    }

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    const err = error instanceof AppError ? error : AppError.internalError();
    return NextResponse.json(
      { success: false, error: err.toJSON() },
      { status: err.statusCode }
    );
  }
}
