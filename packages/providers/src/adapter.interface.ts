import { Channel, ProviderSendInput, ProviderSendResult } from '@iwb/shared';

/**
 * Interface that all provider adapters must implement
 */
export interface ProviderAdapter {
  readonly provider: string;
  readonly channel: Channel;

  /**
   * Send a message via this provider
   */
  send(input: ProviderSendInput, credentials: unknown): Promise<ProviderSendResult>;

  /**
   * Check if provider account is healthy
   */
  healthCheck(credentials: unknown): Promise<boolean>;

  /**
   * Validate that credentials are well-formed
   */
  validateConfig(config: unknown): Promise<boolean>;
}
