import { prisma } from '@iwb/db';
import { hashApiKey, AppError } from '@iwb/shared';

/**
 * Validate API key and resolve tenant
 */
export async function validateApiKey(
  keyRaw: string
): Promise<{ tenantId: string; apiKeyId: string }> {
  if (!keyRaw) {
    throw AppError.invalidApiKey();
  }

  const keyHash = hashApiKey(keyRaw);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || apiKey.status === 'REVOKED') {
    throw AppError.invalidApiKey();
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    throw AppError.invalidApiKey();
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tenantId: apiKey.tenantId,
    apiKeyId: apiKey.id,
  };
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
