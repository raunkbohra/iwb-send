/**
 * Format micro-units to display string (e.g., "1.50 USD")
 */
export function formatUnits(units: bigint | number, currency = 'USD'): string {
  const num = typeof units === 'bigint' ? Number(units) : units;
  const dollars = (num / 1_000_000).toFixed(2);
  return `${dollars} ${currency}`;
}

/**
 * Convert dollars to micro-units (1 USD = 1,000,000 units)
 */
export function dollarsToUnits(dollars: number): bigint {
  return BigInt(Math.round(dollars * 1_000_000));
}

/**
 * Convert micro-units to dollars
 */
export function unitsToDisplay(units: bigint | number): number {
  const num = typeof units === 'bigint' ? Number(units) : units;
  return num / 1_000_000;
}

/**
 * Get cost per message for a channel (in micro-units)
 * These are approximations; actual costs come from provider
 */
export function getEstimatedCost(channel: string): bigint {
  const costs: Record<string, bigint> = {
    SMS: BigInt(1_000), // $0.001
    EMAIL: BigInt(100), // $0.0001
    WHATSAPP: BigInt(500), // $0.0005
    VOICE: BigInt(10_000), // $0.01
  };
  return costs[channel] || BigInt(0);
}
