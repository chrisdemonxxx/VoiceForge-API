import twilio from "twilio";
import type { TelephonyProvider } from "@shared/schema";

export interface CallOptions {
  from: string;
  to: string;
  url: string; // TwiML callback URL
  statusCallback?: string;
  statusCallbackMethod?: "GET" | "POST";
  record?: boolean;
}

export interface CallResult {
  providerCallId: string;
  status: string;
  direction: "inbound" | "outbound";
}

/**
 * Twilio Telephony Provider
 * Handles actual call initiation, management, and webhooks through Twilio API
 */
export class TwilioProvider {
  private client: twilio.Twilio;
  private accountSid: string;
  private authToken: string;

  constructor(provider: TelephonyProvider) {
    const creds = provider.credentials as { accountSid?: string; authToken?: string } | null;
    
    if (!creds?.accountSid || !creds?.authToken) {
      throw new Error("Twilio credentials missing: accountSid and authToken required");
    }

    this.accountSid = creds.accountSid;
    this.authToken = creds.authToken;
    this.client = twilio(this.accountSid, this.authToken);
  }

  /**
   * Initiate an outbound call through Twilio
   */
  async initiateCall(options: CallOptions): Promise<CallResult> {
    try {
      const call = await this.client.calls.create({
        from: options.from,
        to: options.to,
        url: options.url,
        statusCallback: options.statusCallback,
        statusCallbackMethod: options.statusCallbackMethod || "POST",
        record: options.record || false,
      });

      return {
        providerCallId: call.sid,
        status: call.status,
        direction: call.direction as "inbound" | "outbound",
      };
    } catch (error: any) {
      console.error("[TwilioProvider] Call initiation failed:", error.message);
      throw new Error(`Twilio call failed: ${error.message}`);
    }
  }

  /**
   * Get call details from Twilio
   */
  async getCallDetails(callSid: string) {
    try {
      const call = await this.client.calls(callSid).fetch();
      
      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error: any) {
      console.error("[TwilioProvider] Failed to fetch call details:", error.message);
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid: string): Promise<void> {
    try {
      await this.client.calls(callSid).update({ status: "completed" });
    } catch (error: any) {
      console.error("[TwilioProvider] Failed to end call:", error.message);
      throw error;
    }
  }

  /**
   * Generate TwiML for handling inbound/outbound calls
   */
  static generateTwiML(config: {
    message?: string;
    streamUrl?: string;
    recordingEnabled?: boolean;
  }): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (config.message) {
      twiml.say({ voice: "alice" }, config.message);
    }

    if (config.streamUrl) {
      // Stream audio to WebSocket for real-time processing
      const connect = twiml.connect();
      connect.stream({ url: config.streamUrl });
    }

    if (config.recordingEnabled) {
      twiml.record({
        maxLength: 3600, // 1 hour max
        transcribe: false,
        playBeep: false,
      });
    }

    return twiml.toString();
  }

  /**
   * Validate Twilio webhook signature for security
   */
  static validateWebhookSignature(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, any>
  ): boolean {
    return twilio.validateRequest(authToken, signature, url, params);
  }
}
