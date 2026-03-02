import { prisma } from '@iwb/db';
import { Channel, Purpose, RATE_LIMITS } from '@iwb/shared';

import { AttemptFallback } from './attempt-fallback';
import { CandidateSelector } from './candidate-selector';
import { ComplianceGate } from './compliance-gate';
import { CountryResolver } from './country-resolver';
import { HealthScorer } from './health-scorer';
import { Throttle } from './throttle';

export interface SelectProviderParams {
  tenantId: string;
  channel: Channel;
  purpose: Purpose;
  to: string; // Phone or email
  attemptNumber: number; // 1, 2, 3... for fallback
  lastFailedProviderId?: string; // Provider that failed on previous attempt
}

export interface SelectProviderResult {
  providerAccountId: string;
  provider: string;
}

/**
 * Smart Routing Engine - 5 layers
 * Orchestrates all routing logic
 */
export class SmartRoutingEngine {
  private complianceGate = new ComplianceGate();
  private candidateSelector = new CandidateSelector();
  private healthScorer = new HealthScorer();
  private attemptFallback = new AttemptFallback();
  private throttle = new Throttle();

  async selectProvider(params: SelectProviderParams): Promise<SelectProviderResult | null> {
    const {
      tenantId,
      channel,
      to,
      attemptNumber,
      lastFailedProviderId,
    } = params;

    // Layer A: Compliance gate
    const compliance = await this.complianceGate.canRoute({
      tenantId,
      channel,
      purpose: params.purpose,
      to,
    });

    if (!compliance.allowed) {
      return null;
    }

    // Layer B: Candidate selector
    const countryCode = new CountryResolver().resolve(to);
    const candidates = await this.candidateSelector.selectCandidates({
      tenantId,
      channel,
      countryCode,
    });

    if (candidates.length === 0) {
      return null;
    }

    // Layer C: Health scorer
    const scores = await this.healthScorer.scoreProviders(
      candidates.map((c) => c.providerAccountId)
    );

    let scored = candidates
      .map((c) => ({
        id: c.providerAccountId,
        score: scores.get(c.providerAccountId) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    // Layer D: Attempt fallback
    if (attemptNumber > 1 && lastFailedProviderId) {
      const fallback = this.attemptFallback.selectFallback(scored, lastFailedProviderId);
      if (!fallback) {
        return null;
      }
      scored = [fallback];
    }

    const selected = scored[0];
    if (!selected) {
      return null;
    }

    // Layer E: Throttle
    const rateLimit = RATE_LIMITS[channel as keyof typeof RATE_LIMITS];
    const limit = rateLimit ? rateLimit.perSecond : 10;

    if (!this.throttle.isAllowed(tenantId, selected.id, limit)) {
      return null; // Rate limited
    }

    // Fetch provider details
    const account = await prisma.providerAccount.findUnique({
      where: { id: selected.id },
    });

    if (!account) {
      return null;
    }

    return {
      providerAccountId: selected.id,
      provider: account.provider,
    };
  }
}

export const routingEngine = new SmartRoutingEngine();
