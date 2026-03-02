import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@iwb/db';
import { AppError } from '@iwb/shared';
import { validateApiKey, extractApiKey } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKeyRaw = extractApiKey(authHeader);
    if (!apiKeyRaw) throw AppError.invalidApiKey();

    const { tenantId } = await validateApiKey(apiKeyRaw);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const status = url.searchParams.get('status');
    const channel = url.searchParams.get('channel');

    const skip = (page - 1) * pageSize;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (channel) where.channel = channel;

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    const total = await prisma.message.count({ where });

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.ceil(total / pageSize),
        hasMore: skip + pageSize < total,
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
