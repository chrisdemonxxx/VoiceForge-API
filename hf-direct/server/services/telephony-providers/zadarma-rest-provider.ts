/**
 * Zadarma REST API Provider
 * Implements Zadarma REST API integration for calls
 * https://zadarma.com/en/support/api/
 */

import crypto from 'crypto';
import type { TelephonyProvider as TelephonyProviderType, CallDirection } from '@shared/schema';

interface ZadarmaCredentials {
  apiKey: string;
  apiSecret: string;
}

interface CallResponse {
  callId: string;
  status: 'initiated' | 'ringing' | 'answered' | 'busy' | 'no-answer' | 'failed' | 'completed';
}

export class ZadarmaRESTProvider {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.zadarma.com/v1';

  constructor(provider: TelephonyProviderType) {
    const creds = provider.credentials as ZadarmaCredentials;
    
    if (!creds.apiKey || !creds.apiSecret) {
      throw new Error('Zadarma provider requires apiKey and apiSecret');
    }

    // Trim credentials to remove any accidental whitespace
    this.apiKey = creds.apiKey.trim();
    this.apiSecret = creds.apiSecret.trim();
  }

  /**
   * Generate Zadarma API signature
   * Algorithm: base64(hmac_sha1(method + params + md5(params), secret))
   * See: https://zadarma.com/en/support/api/
   */
  private generateSignature(method: string, params: Record<string, any> = {}): string {
    // Step 1: Sort parameters alphabetically and build query string
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Step 2: Generate MD5 hash of query string
    const md5Hash = crypto.createHash('md5').update(sortedParams).digest('hex');
    
    // Step 3: Create signature string: method + params + md5(params)
    const signString = method + sortedParams + md5Hash;
    
    // Step 4: HMAC-SHA1 with secret key
    const hmac = crypto.createHmac('sha1', this.apiSecret);
    hmac.update(signString);
    
    // Step 5: Base64 encode
    return hmac.digest('base64');
  }

  /**
   * Make authenticated request to Zadarma API
   */
  private async makeRequest(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const signature = this.generateSignature(endpoint, params);
    
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `${this.apiKey}:${signature}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zadarma API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Initiate outbound call via Zadarma API
   */
  async makeCall(
    from: string,
    to: string,
    callbackUrl: string
  ): Promise<CallResponse> {
    try {
      console.log(`[Zadarma] Initiating call from ${from} to ${to}`);

      const response = await this.makeRequest('/request/callback/', {
        from: from,
        to: to,
        predicted: callbackUrl
      });

      if (response.status !== 'success') {
        throw new Error(`Zadarma call failed: ${response.message || 'Unknown error'}`);
      }

      console.log(`[Zadarma] Call initiated successfully`);

      return {
        callId: response.call_id || `zadarma-${Date.now()}`,
        status: 'initiated'
      };
    } catch (error: any) {
      console.error('[Zadarma] Call initiation error:', error.message);
      throw new Error(`Failed to initiate Zadarma call: ${error.message}`);
    }
  }

  /**
   * Answer inbound call
   */
  async answerCall(
    callId: string,
    twimlUrl: string
  ): Promise<void> {
    // Zadarma handles inbound calls via webhooks
    // No explicit answer API needed - configured in account settings
    console.log(`[Zadarma] Inbound call ${callId} will be handled via webhook`);
  }

  /**
   * Hangup call
   */
  async hangupCall(callId: string): Promise<void> {
    try {
      await this.makeRequest('/request/hangup/', {
        call_id: callId
      });
      console.log(`[Zadarma] Hung up call ${callId}`);
    } catch (error: any) {
      console.error(`[Zadarma] Hangup error:`, error.message);
      throw error;
    }
  }

  /**
   * Validate Zadarma webhook signature
   * Zadarma signs webhooks with MD5(params + secret)
   */
  static validateWebhookSignature(
    apiSecret: string,
    signature: string,
    params: Record<string, any>
  ): boolean {
    try {
      // Sort params and concatenate
      const sortedParams = Object.keys(params)
        .filter(key => key !== 'signature' && key !== 'zd_echo') // Exclude signature itself
        .sort()
        .map(key => `${key}${params[key]}`)
        .join('');
      
      const expectedSignature = crypto
        .createHash('md5')
        .update(sortedParams + apiSecret)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('[Zadarma] Signature validation error:', error);
      return false;
    }
  }

  /**
   * Generate ZSML (Zadarma Scenario Markup Language) for call flow
   * Similar to TwiML but Zadarma-specific
   */
  static generateZSML(options: {
    message?: string;
    streamUrl?: string;
    recordingEnabled?: boolean;
  }): string {
    const { message, streamUrl, recordingEnabled } = options;

    let zsml = '<?xml version="1.0" encoding="UTF-8"?>\n<pbx>\n';

    // Play greeting message if provided
    if (message) {
      zsml += `  <say>${message}</say>\n`;
    }

    // Enable recording if requested
    if (recordingEnabled) {
      zsml += '  <record/>\n';
    }

    // Add media stream for real-time audio if provided
    if (streamUrl) {
      // Note: Zadarma may require custom integration for real-time streaming
      // This is a placeholder - check Zadarma docs for actual implementation
      zsml += `  <stream url="${streamUrl}"/>\n`;
    }

    zsml += '</pbx>';

    return zsml;
  }

  /**
   * Get account balance (for monitoring)
   */
  async getBalance(): Promise<number> {
    try {
      const response = await this.makeRequest('/info/balance/');
      return parseFloat(response.balance || '0');
    } catch (error) {
      console.error('[Zadarma] Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStats(callId: string): Promise<any> {
    try {
      const response = await this.makeRequest('/statistics/pbx/', {
        call_id: callId
      });
      return response;
    } catch (error) {
      console.error('[Zadarma] Failed to get call stats:', error);
      return null;
    }
  }
}
