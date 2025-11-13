import type { TelephonyProvider } from "@shared/schema";
import { TwilioProvider } from "./twilio-provider";
import { ZadarmaProvider } from "./zadarma-provider";

/**
 * Union type for all supported telephony providers
 */
export type AnyTelephonyProvider = TwilioProvider | ZadarmaProvider;

/**
 * Provider Factory
 * Creates the appropriate telephony provider instance based on provider type
 */
export class ProviderFactory {
  private static providerCache = new Map<string, AnyTelephonyProvider>();

  /**
   * Get or create a provider instance
   */
  static getProvider(provider: TelephonyProvider): AnyTelephonyProvider {
    // Check cache first
    if (this.providerCache.has(provider.id)) {
      return this.providerCache.get(provider.id)!;
    }

    // Create new provider instance based on provider type
    let providerInstance: AnyTelephonyProvider;

    switch (provider.provider) {
      case "twilio":
        providerInstance = new TwilioProvider(provider);
        break;
      
      case "telnyx":
        // TODO: Implement TelnyxProvider
        throw new Error("Telnyx provider not yet implemented");
      
      case "zadarma":
        providerInstance = new ZadarmaProvider(provider);
        break;
      
      case "custom":
        // TODO: Implement OpenSourceProvider (Asterisk/PJSIP)
        throw new Error("Custom provider not yet implemented");
      
      default:
        throw new Error(`Unknown provider type: ${provider.provider}`);
    }

    // Cache the instance
    this.providerCache.set(provider.id, providerInstance);
    
    return providerInstance;
  }

  /**
   * Clear provider from cache (useful when credentials change)
   */
  static invalidateProvider(providerId: string): void {
    this.providerCache.delete(providerId);
  }

  /**
   * Clear all providers from cache
   */
  static clearCache(): void {
    this.providerCache.clear();
  }
}
