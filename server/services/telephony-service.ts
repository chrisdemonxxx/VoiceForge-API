import type { TelephonyProvider, Call, InsertCall } from "@shared/schema";
import { storage } from "../storage";
import type { PythonBridge } from "../python-bridge";
import type { HFSpacesClient } from "../hf-spaces-client";

// ML Client type can be either PythonBridge or HFSpacesClient
type MLClient = PythonBridge | HFSpacesClient;
import { ProviderFactory } from "./telephony-providers/provider-factory";

export interface CallSession {
  id: string;
  callId: string;
  providerId: string;
  from: string;
  to: string;
  direction: "inbound" | "outbound";
  status: "queued" | "ringing" | "in-progress" | "completed" | "failed";
  startedAt?: Date;
  endedAt?: Date;
  flowId?: string;
  audioBuffer: Buffer[];
  metadata: Record<string, any>;
}

export interface TelephonyConfig {
  sipServer?: string;
  sipUsername?: string;
  sipPassword?: string;
  stunServers?: string[];
  turnServers?: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
}

/**
 * Open-Source Telephony Service
 * Manages voice calls using WebRTC and integrates with voice AI pipeline
 */
export class TelephonyService {
  private activeSessions = new Map<string, CallSession>();
  private pythonBridge: MLClient;

  constructor(pythonBridge: MLClient) {
    this.pythonBridge = pythonBridge;
  }

  /**
   * Initialize a new outbound call
   */
  async initiateCall(options: {
    providerId: string;
    from: string;
    to: string;
    flowId?: string;
    campaignId?: string;
  }): Promise<CallSession> {
    const sessionId = this.generateSessionId();
    
    // Get provider from database
    const provider = await storage.getTelephonyProvider(options.providerId);
    if (!provider) {
      throw new Error(`Telephony provider ${options.providerId} not found`);
    }

    if (!provider.active) {
      throw new Error(`Telephony provider ${provider.name} is not active`);
    }

    // Create call record in database with initial status
    const call = await storage.createCall({
      providerId: options.providerId,
      campaignId: options.campaignId,
      flowId: options.flowId,
      direction: "outbound",
      from: options.from,
      to: options.to,
      status: "queued",
      metadata: {},
    });

    try {
      // Get provider instance and initiate actual call
      const providerInstance = ProviderFactory.getProvider(provider);
      
      // Generate callback URL for TwiML
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      
      const callbackUrl = `${baseUrl}/api/telephony/twiml/${sessionId}`;
      const statusCallbackUrl = `${baseUrl}/api/telephony/status/${call.id}`;

      const result = await providerInstance.initiateCall({
        from: options.from,
        to: options.to,
        url: callbackUrl,
        statusCallback: statusCallbackUrl,
        record: true,
      });

      // Update call record with provider call ID
      await storage.updateCall(call.id, {
        providerCallId: result.providerCallId,
        status: "ringing",
      });

      // Create active session
      const session: CallSession = {
        id: sessionId,
        callId: call.id,
        providerId: options.providerId,
        from: options.from,
        to: options.to,
        direction: "outbound",
        status: "ringing",
        flowId: options.flowId,
        audioBuffer: [],
        metadata: {
          providerCallId: result.providerCallId,
        },
      };

      this.activeSessions.set(sessionId, session);

      console.log(`[TelephonyService] Call initiated: ${result.providerCallId}`);
      
      return session;
    } catch (error: any) {
      // Update call record to failed status
      await storage.updateCall(call.id, {
        status: "failed",
        metadata: { error: error.message },
      });
      
      throw error;
    }
  }

  /**
   * Handle incoming call
   */
  async handleIncomingCall(options: {
    providerId: string;
    from: string;
    to: string;
    providerCallId?: string;
  }): Promise<CallSession> {
    const sessionId = this.generateSessionId();
    
    // Create call record
    const call = await storage.createCall({
      providerId: options.providerId,
      providerCallId: options.providerCallId,
      direction: "inbound",
      from: options.from,
      to: options.to,
      status: "ringing",
      metadata: {},
    });

    // Create active session
    const session: CallSession = {
      id: sessionId,
      callId: call.id,
      providerId: options.providerId,
      from: options.from,
      to: options.to,
      direction: "inbound",
      status: "ringing",
      audioBuffer: [],
      metadata: {},
    };

    this.activeSessions.set(sessionId, session);

    return session;
  }

  /**
   * Update call status
   */
  async updateCallStatus(sessionId: string, status: CallSession["status"]): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Call session ${sessionId} not found`);
    }

    session.status = status;

    // Update timestamps
    if (status === "in-progress" && !session.startedAt) {
      session.startedAt = new Date();
    } else if (["completed", "failed"].includes(status) && !session.endedAt) {
      session.endedAt = new Date();
    }

    // Update database
    const updates: any = { status };
    if (session.startedAt) updates.startedAt = session.startedAt;
    if (session.endedAt) {
      updates.endedAt = session.endedAt;
      if (session.startedAt) {
        updates.duration = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
      }
    }

    await storage.updateCall(session.callId, updates);
  }

  /**
   * Process audio chunk from call
   * Routes audio to STT → VLLM → TTS pipeline
   */
  async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<Buffer | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Call session ${sessionId} not found`);
    }

    // Buffer audio for processing
    session.audioBuffer.push(audioChunk);

    try {
      // Send to STT for transcription
      const transcriptionResult = await this.pythonBridge.processSTTChunk({
        chunk: audioChunk.toString("base64"),
        sequence: session.audioBuffer.length - 1,
        language: "en",
        return_partial: false,
      });

      if (!transcriptionResult.text || transcriptionResult.text.trim() === "") {
        return null; // No speech detected
      }

      // Process through VLLM agent if flow is configured
      let agentResponse = transcriptionResult.text;
      if (session.flowId) {
        const vllmResult = await this.pythonBridge.callVLLM({
          message: transcriptionResult.text,
          session_id: sessionId,
          mode: "assistant",
        });
        agentResponse = vllmResult.response || transcriptionResult.text;
      }

      // Convert response to speech
      const ttsAudioBuffer = await this.pythonBridge.callTTS({
        text: agentResponse,
        model: "chatterbox",
        speed: 1.0,
      });

      // Return audio response
      return ttsAudioBuffer;
    } catch (error: any) {
      console.error(`[TelephonyService] Audio processing error:`, error.message);
      return null;
    }
  }

  /**
   * End a call session
   */
  async endCall(sessionId: string, reason?: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return; // Already ended or doesn't exist
    }

    await this.updateCallStatus(sessionId, "completed");
    
    // Update metadata with end reason
    if (reason) {
      session.metadata.endReason = reason;
      await storage.updateCall(session.callId, {
        metadata: session.metadata,
      });
    }

    // Clean up session
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): CallSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CallSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get WebRTC ICE servers configuration
   */
  static getIceServers(config?: TelephonyConfig): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      // Google's public STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    // Add custom STUN servers
    if (config?.stunServers) {
      iceServers.push(...config.stunServers.map(url => ({ urls: url })));
    }

    // Add TURN servers for NAT traversal
    if (config?.turnServers) {
      iceServers.push(...config.turnServers);
    }

    return iceServers;
  }

  /**
   * Generate SDP offer for WebRTC connection
   */
  static generateSdpOffer(config?: TelephonyConfig): any {
    return {
      iceServers: TelephonyService.getIceServers(config),
      iceTransportPolicy: "all",
      bundlePolicy: "balanced",
      rtcpMuxPolicy: "require",
    };
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  static formatPhoneNumber(phoneNumber: string, defaultCountryCode = "+1"): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");
    
    // If no leading +, add default country code
    if (phoneNumber.startsWith("+")) {
      return phoneNumber;
    }
    
    // Handle US numbers (10 digits)
    if (digits.length === 10) {
      return `${defaultCountryCode}${digits}`;
    }
    
    // Handle numbers with country code already included
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    
    return `${defaultCountryCode}${digits}`;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
