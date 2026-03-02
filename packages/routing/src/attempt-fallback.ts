/**
 * Layer D: Attempt fallback
 * On retry, select next-best candidate (removing previous failure)
 */
export class AttemptFallback {
  /**
   * Get fallback candidate, excluding the one that just failed
   */
  selectFallback(
    candidates: Array<{ id: string; score: number }>,
    failedId: string
  ): { id: string; score: number } | null {
    const remaining = candidates.filter((c) => c.id !== failedId);
    if (remaining.length === 0) {
      return null;
    }

    // Return highest-scoring remaining
    return remaining.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }
}
