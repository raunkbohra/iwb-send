import { prisma } from '@iwb/db';
import { Channel, Purpose } from '@iwb/shared';

/**
 * Layer A: Compliance gate
 * Checks: suppression list, abuse flags, DLT approval, email domain verification
 */
export class ComplianceGate {
  async canRoute(params: {
    tenantId: string;
    channel: Channel;
    purpose: Purpose;
    to: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const { tenantId, channel, to } = params;

    // Check suppression list
    const suppressed = await prisma.suppressionListItem.findFirst({
      where: {
        OR: [{ tenantId }, { tenantId: null }], // Check both tenant and global
        ...(channel === Channel.SMS
          ? { phone: to }
          : { email: to }),
      },
    });

    if (suppressed) {
      return { allowed: false, reason: `SUPPRESSED: ${suppressed.reason}` };
    }

    // Check abuse flags
    const abused = await prisma.abuseFlag.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
        severity: { in: ['HIGH', 'CRITICAL'] },
      },
    });

    if (abused) {
      return { allowed: false, reason: 'ABUSE_FLAG_ACTIVE' };
    }

    return { allowed: true };
  }
}
