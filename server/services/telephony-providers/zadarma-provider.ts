/**
 * Zadarma Provider (Smart Wrapper)
 * Intelligently routes to REST API or SIP provider based on credentials
 * - If apiKey/apiSecret provided → use REST API
 * - If sipUsername/sipPassword provided → use SIP
 */

import type { TelephonyProvider as TelephonyProviderType } from '@shared/schema';
import { ZadarmaRESTProvider } from './zadarma-rest-provider';
import { ZadarmaSIPProvider } from './zadarma-sip-provider';

interface ZadarmaRESTCredentials {
  apiKey: string;
  apiSecret: string;
}

interface ZadarmaSIPCredentials {
  sipUsername: string;
  sipPassword: string;
  sipDomain?: string;
}

type ZadarmaCredentials = ZadarmaRESTCredentials | ZadarmaSIPCredentials;

/**
 * Smart Zadarma provider that auto-detects which implementation to use
 */
export class ZadarmaProvider {
  private implementation: ZadarmaRESTProvider | ZadarmaSIPProvider;

  constructor(provider: TelephonyProviderType) {
    const creds = provider.credentials as ZadarmaCredentials;

    // Auto-detect which implementation to use based on credentials
    if ('apiKey' in creds && 'apiSecret' in creds && creds.apiKey && creds.apiSecret) {
      console.log('[ZadarmaProvider] Using REST API implementation');
      this.implementation = new ZadarmaRESTProvider(provider);
    } else if ('sipUsername' in creds && 'sipPassword' in creds && creds.sipUsername && creds.sipPassword) {
      console.log('[ZadarmaProvider] Using SIP implementation');
      this.implementation = new ZadarmaSIPProvider(provider);
    } else {
      throw new Error(
        'Zadarma provider requires either (apiKey + apiSecret) for REST API or (sipUsername + sipPassword) for SIP'
      );
    }
  }

  /**
   * Initiate an outbound call
   */
  async initiateCall(options: {
    from: string;
    to: string;
    url?: string;
    statusCallback?: string;
    statusCallbackMethod?: string;
    record?: boolean;
  }): Promise<{
    providerCallId: string;
    status: string;
    direction: "inbound" | "outbound";
  }> {
    return this.implementation.initiateCall(options);
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    return this.implementation.endCall(callSid);
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid: string): Promise<any> {
    return this.implementation.getCallDetails(callSid);
  }

  /**
   * Cleanup when provider is destroyed
   */
  destroy(): void {
    if ('destroy' in this.implementation && typeof this.implementation.destroy === 'function') {
      this.implementation.destroy();
    }
  }
}
