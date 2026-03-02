import { hashApiKey } from '@iwb/shared';
import { prisma } from '@iwb/db';

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Validate API key and return tenant ID
 */
export async function validateApiKey(
  rawKey: string
): Promise<{ tenantId: string; scopes: string[] } | null> {
  try {
    const keyHash = hashApiKey(rawKey);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        status: 'ACTIVE',
      },
      select: {
        tenantId: true,
        scopes: true,
      },
    });

    if (!apiKey) return null;

    return {
      tenantId: apiKey.tenantId,
      scopes: Array.isArray(apiKey.scopes) ? apiKey.scopes : [],
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

/**
 * Check if API key has required scope
 */
export function hasScope(
  scopes: string[],
  requiredScope: string
): boolean {
  return scopes.includes(requiredScope) || scopes.includes('*');
}
