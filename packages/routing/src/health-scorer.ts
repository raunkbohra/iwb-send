import { prisma } from '@iwb/db';

/**
 * Layer C: Health scorer
 * Scores candidates by health_score, recent success rate, latency
 */
export class HealthScorer {
  async scoreProviders(
    providerAccountIds: string[]
  ): Promise<Map<string, number>> {
    const accounts = await prisma.providerAccount.findMany({
      where: { id: { in: providerAccountIds } },
      select: {
        id: true,
        healthScore: true,
        consecutiveFailures: true,
      },
    });

    const scores = new Map<string, number>();

    for (const account of accounts) {
      // Base score is health_score (0-100)
      let score = account.healthScore;

      // Penalize for consecutive failures
      score = Math.max(0, score - account.consecutiveFailures * 5);

      scores.set(account.id, score);
    }

    return scores;
  }
}
