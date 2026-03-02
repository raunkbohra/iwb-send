import { prisma } from '@iwb/db';
import { Channel } from '@iwb/shared';

/**
 * Layer B: Candidate selector
 * Queries routes table for eligible providers based on channel + country
 */
export class CandidateSelector {
  async selectCandidates(params: {
    tenantId: string;
    channel: Channel;
    countryCode: string;
  }): Promise<Array<{ providerAccountId: string; priority: number; weight: number }>> {
    const { tenantId, channel, countryCode } = params;

    // Query routes: country-specific first, then wildcard
    const routes = await prisma.route.findMany({
      where: {
        tenantId,
        channel,
        isActive: true,
        countryCode: { in: [countryCode, '*'] },
      },
      orderBy: [
        { countryCode: 'desc' }, // Country-specific first
        { priority: 'asc' }, // Higher priority first
      ],
      include: {
        providerAccount: {
          select: { id: true, status: true },
        },
      },
    });

    return routes
      .filter((r) => r.providerAccount.status === 'ACTIVE')
      .map((r) => ({
        providerAccountId: r.providerAccount.id,
        priority: r.priority,
        weight: r.weight,
      }));
  }
}
