import { Channel, Provider } from '@iwb/shared';

import { AakashAdapter } from './aakash/aakash.adapter';
import { ProviderAdapter } from './adapter.interface';
import { MetaWaAdapter } from './meta-wa/meta-wa.adapter';
import { SesAdapter } from './ses/ses.adapter';
import { SparrowAdapter } from './sparrow/sparrow.adapter';
import { TelnyxSmsAdapter } from './telnyx/telnyx-sms.adapter';
import { TelnyxVoiceAdapter } from './telnyx/telnyx-voice.adapter';

/**
 * Registry of all provider adapters
 * Maps Provider + Channel to adapter instance
 */
export class ProviderRegistry {
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor() {
    // SMS providers
    this.register(new SparrowAdapter());
    this.register(new AakashAdapter());
    this.register(new TelnyxSmsAdapter());

    // Email providers
    this.register(new SesAdapter());

    // WhatsApp
    this.register(new MetaWaAdapter());

    // Voice
    this.register(new TelnyxVoiceAdapter());
  }

  private register(adapter: ProviderAdapter) {
    const key = `${adapter.provider}:${adapter.channel}`;
    this.adapters.set(key, adapter);
  }

  /**
   * Get adapter for provider + channel combination
   */
  getAdapter(provider: Provider | string, channel: Channel): ProviderAdapter | null {
    const key = `${provider}:${channel}`;
    return this.adapters.get(key) || null;
  }

  /**
   * Get all adapters for a channel
   */
  getAdaptersByChannel(channel: Channel): ProviderAdapter[] {
    return Array.from(this.adapters.values()).filter((a) => a.channel === channel);
  }

  /**
   * Get all registered providers
   */
  getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
