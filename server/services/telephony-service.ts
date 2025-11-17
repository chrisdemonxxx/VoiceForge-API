import type { TelephonyProvider, Call, InsertCall } from "@shared/schema";
import { storage } from "../storage";
import { StreamingPipeline, type StreamingPipelineConfig } from "./streaming-pipeline";
import { EventEmitter } from "events";

// ML Client type - no longer used, kept for type compatibility
type MLClient = any;
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
  streamingPipeline?: StreamingPipeline;
  audioOutputCallback?: (audio: Buffer) => void | Promise<void>;
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
  private streamingPipelineConfig?: StreamingPipelineConfig;

  constructor(pythonBridge: MLClient, streamingPipelineConfig?: StreamingPipelineConfig) {
    this.pythonBridge = pythonBridge;
    this.streamingPipelineConfig = streamingPipelineConfig;
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

      // Initialize streaming pipeline if configured
      if (this.streamingPipelineConfig) {
        await this.initializeStreamingPipeline(session);
      }

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

    // Initialize streaming pipeline if configured
    if (this.streamingPipelineConfig) {
      await this.initializeStreamingPipeline(session);
    }

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
   * Routes audio through ElevenLabs-like streaming pipeline (if configured) or legacy pipeline
   */
  async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<Buffer | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Call session ${sessionId} not found`);
    }

    // Buffer audio for processing
    session.audioBuffer.push(audioChunk);

    // Use streaming pipeline if available
    if (session.streamingPipeline && session.streamingPipeline.active) {
      try {
        // Send audio to streaming pipeline (non-blocking)
        await session.streamingPipeline.processIncomingAudio(audioChunk);
        // Audio response will be sent via audioOutputCallback
        return null; // Streaming pipeline handles output asynchronously
      } catch (error: any) {
        console.error(`[TelephonyService] Streaming pipeline error:`, error.message);
        return null;
      }
    }

    // Fallback to legacy pipeline if streaming pipeline not available
    if (!this.pythonBridge) {
      console.warn(`[TelephonyService] No ML client available for audio processing`);
      return null;
    }

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

    // Stop streaming pipeline if active
    if (session.streamingPipeline) {
      session.streamingPipeline.stop();
      session.streamingPipeline = undefined;
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
   * Initialize streaming pipeline for a call session
   */
  private async initializeStreamingPipeline(session: CallSession): Promise<void> {
    if (!this.streamingPipelineConfig) {
      return;
    }

    try {
      const pipeline = new StreamingPipeline(this.streamingPipelineConfig);

      // Setup audio output callback
      pipeline.on('audio', async (ulawAudio: Buffer) => {
        if (session.audioOutputCallback) {
          await session.audioOutputCallback(ulawAudio);
        }
      });

      // Setup event handlers
      pipeline.on('transcript', (text: string) => {
        console.log(`[TelephonyService] Transcript [${session.id}]: ${text}`);
        session.metadata.lastTranscript = text;
      });

      pipeline.on('llm_token', (text: string) => {
        // Optional: log LLM tokens
      });

      pipeline.on('llm_done', (fullText: string) => {
        console.log(`[TelephonyService] LLM Response [${session.id}]: ${fullText}`);
        session.metadata.lastLLMResponse = fullText;
      });

      pipeline.on('error', (error: Error) => {
        console.error(`[TelephonyService] Pipeline error [${session.id}]:`, error);
      });

      // Start pipeline
      await pipeline.start();
      session.streamingPipeline = pipeline;

      console.log(`[TelephonyService] Streaming pipeline initialized for session ${session.id}`);
    } catch (error: any) {
      console.error(`[TelephonyService] Failed to initialize streaming pipeline:`, error);
      // Continue without streaming pipeline
    }
  }

  /**
   * Set audio output callback for a session
   */
  setAudioOutputCallback(sessionId: string, callback: (audio: Buffer) => void | Promise<void>): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.audioOutputCallback = callback;
    }
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
   * Create a session manually (for direct calls that bypass initiateCall)
   */
  createSession(session: CallSession): void {
    this.activeSessions.set(session.id, session);
    
    // Initialize streaming pipeline if configured
    if (this.streamingPipelineConfig) {
      this.initializeStreamingPipeline(session).catch((error: any) => {
        console.error(`[TelephonyService] Failed to initialize streaming pipeline for direct call:`, error);
      });
    }
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
