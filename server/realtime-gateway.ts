import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import type { 
  WSClientMessage, 
  WSServerMessage, 
  RealTimeSession 
} from "@shared/schema";
import { wsClientMessageSchema } from "@shared/schema";
import { mlClient } from "./ml-client";
import { storage } from "./storage";

// Real-time session management
class SessionManager {
  private sessions: Map<string, RealTimeSession> = new Map();
  
  createSession(apiKeyId: string, mode: "voice" | "text" | "hybrid"): RealTimeSession {
    const session: RealTimeSession = {
      id: uuidv4(),
      apiKeyId,
      mode,
      startedAt: new Date(),
      messagesProcessed: 0,
      avgLatency: 0,
      errorCount: 0,
    };
    this.sessions.set(session.id, session);
    return session;
  }
  
  getSession(id: string): RealTimeSession | undefined {
    return this.sessions.get(id);
  }
  
  updateSession(id: string, updates: Partial<RealTimeSession>): void {
    const session = this.sessions.get(id);
    if (session) {
      Object.assign(session, updates);
    }
  }
  
  endSession(id: string): RealTimeSession | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.endedAt = new Date();
      this.sessions.delete(id);
    }
    return session;
  }
  
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

// Connection metadata
interface ConnectionInfo {
  ws: WebSocket;
  sessionId?: string;
  apiKeyId?: string;
  lastActivity: Date;
  messageCount: number;
  config?: {
    mode: "voice" | "text" | "hybrid";
    sttEnabled: boolean;
    ttsEnabled: boolean;
    agentEnabled: boolean;
    agentMode: string;
    systemPrompt?: string;
    model: string;
    voice?: string;
    language: string;
  };
}

// Advanced metrics tracking
interface MetricsSample {
  timestamp: number;
  stt: number;
  agent: number;
  tts: number;
  e2e: number;
  queueDepth: number;
  activeConnections: number;
  errorStage?: 'stt' | 'agent' | 'tts' | null;
}

interface QualityFeedback {
  timestamp: number;
  category: 'stt_accuracy' | 'tts_quality' | 'latency' | 'overall';
  score: number;
  eventId: string;
}

// Real-time gateway for voice AI playground
export class RealTimeGateway {
  private wss: WebSocketServer;
  private sessions: SessionManager;
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private latencyTracking: Map<string, { start: number; stages: Record<string, number> }> = new Map();
  
  // Enhanced metrics storage
  private metricsHistory: MetricsSample[] = [];
  private qualityFeedback: QualityFeedback[] = [];
  private errorCounts: { stt: number; agent: number; tts: number } = { stt: 0, agent: 0, tts: 0 };
  private queueDepthHistory: Array<{ timestamp: number; depth: number }> = [];
  private readonly MAX_HISTORY_SIZE = 1000;
  
  constructor(httpServer: Server, path: string = "/ws/realtime") {
    this.wss = new WebSocketServer({ server: httpServer, path });
    this.sessions = new SessionManager();
    this.setupWebSocketServer();
  }
  
  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[RealTime] New connection established");
      
      // Initialize connection metadata
      this.connections.set(ws, {
        ws,
        lastActivity: new Date(),
        messageCount: 0,
      });
      
      // Handle incoming messages
      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSClientMessage;
          await this.handleClientMessage(ws, message);
        } catch (error: any) {
          console.error("[RealTime] Message handling error:", error);
          this.sendError(ws, "unknown", "MESSAGE_PARSE_ERROR", error.message, false);
        }
      });
      
      // Handle disconnection
      ws.on("close", () => {
        const conn = this.connections.get(ws);
        if (conn?.sessionId) {
          const session = this.sessions.endSession(conn.sessionId);
          console.log(`[RealTime] Session ${conn.sessionId} ended`, {
            duration: session ? (session.endedAt!.getTime() - session.startedAt.getTime()) / 1000 : 0,
            messages: session?.messagesProcessed || 0,
          });
        }
        this.connections.delete(ws);
        console.log("[RealTime] Connection closed");
      });
      
      // Handle errors
      ws.on("error", (error) => {
        console.error("[RealTime] WebSocket error:", error);
      });
    });
  }
  
  private async handleClientMessage(ws: WebSocket, message: WSClientMessage) {
    const conn = this.connections.get(ws);
    if (!conn) return;
    
    conn.lastActivity = new Date();
    conn.messageCount++;
    
    try {
      // Validate message schema
      wsClientMessageSchema.parse(message);
      
      switch (message.type) {
        case "init":
          await this.handleInit(ws, message);
          break;
        case "audio_chunk":
          await this.handleAudioChunk(ws, message);
          break;
        case "text_input":
          await this.handleTextInput(ws, message);
          break;
        case "pause":
        case "resume":
        case "end":
          await this.handleControl(ws, message);
          break;
        case "quality_feedback":
          await this.handleQualityFeedback(ws, message);
          break;
      }
    } catch (error: any) {
      console.error("[RealTime] Handler error:", error);
      this.sendError(ws, message.eventId, "HANDLER_ERROR", error.message, true);
    }
  }
  
  private async handleInit(ws: WebSocket, message: Extract<WSClientMessage, { type: "init" }>) {
    const conn = this.connections.get(ws);
    if (!conn) return;
    
    // Validate API key
    const apiKeyRecord = await storage.getApiKeyByKey(message.apiKey);
    
    if (!apiKeyRecord) {
      this.sendError(ws, message.eventId, "INVALID_API_KEY", "Invalid API key provided", false);
      ws.close(4001, "Invalid API key");
      return;
    }
    
    if (!apiKeyRecord.active) {
      this.sendError(ws, message.eventId, "INACTIVE_API_KEY", "API key is not active", false);
      ws.close(4002, "API key is not active");
      return;
    }
    
    // Create session with validated API key
    const session = this.sessions.createSession(apiKeyRecord.id, message.config.mode);
    conn.sessionId = session.id;
    conn.apiKeyId = apiKeyRecord.id;
    conn.config = message.config;
    
    console.log(`[RealTime] Session ${session.id} initialized`, {
      mode: message.config.mode,
      stt: message.config.sttEnabled,
      tts: message.config.ttsEnabled,
      agent: message.config.agentEnabled,
      agentMode: message.config.agentMode,
      apiKeyId: apiKeyRecord.id,
    });
    
    // Send ready acknowledgment
    this.sendMessage(ws, {
      type: "ready",
      eventId: message.eventId,
      sessionId: session.id,
      serverTimestamp: Date.now(),
    });
  }
  
  private async handleAudioChunk(ws: WebSocket, message: Extract<WSClientMessage, { type: "audio_chunk" }>) {
    const conn = this.connections.get(ws);
    if (!conn?.sessionId) {
      this.sendError(ws, message.eventId, "NO_SESSION", "Session not initialized", false);
      return;
    }
    
    // Track latency stages
    this.startLatencyTracking(message.eventId, message.timestamp);
    const networkLatency = Date.now() - message.timestamp;
    
    // Real STT processing using worker pool
    const sttProcessingStart = Date.now();
    let transcription = "Hello, this is a test message from the real-time lab";
    let sttProcessingTime = 0;
    
    try {
      // Process audio chunk through worker pool
      const sttResult = await mlClient.processSTTChunk({
        chunk: message.chunk,
        sequence: conn.messageCount,
        language: "en",
        return_partial: true,
      });
      
      sttProcessingTime = Date.now() - sttProcessingStart;
      
      // Send partial transcription if available
      if (sttResult.is_partial && sttResult.text && sttResult.vad_active) {
        this.sendMessage(ws, {
          type: "stt_partial",
          eventId: message.eventId,
          text: sttResult.text,
          confidence: sttResult.confidence,
          timestamp: Date.now(),
        });
      }
      
      // Send final STT result if we have complete transcription
      if (!sttResult.is_partial || sttResult.text.length > 10) {
        transcription = sttResult.text || transcription;
        
        this.sendMessage(ws, {
          type: "stt_final",
          eventId: message.eventId,
          text: transcription,
          confidence: sttResult.confidence || 0.95,
          language: sttResult.language || "en",
          duration: sttResult.duration || 1.5,
          latency: {
            capture: 20, // Estimated client capture time
            network: networkLatency,
            processing: sttProcessingTime,
            total: networkLatency + sttProcessingTime,
          },
        });
      }
      
    } catch (error: any) {
      console.error("[RealTime] STT processing error:", error);
      
      // Fallback to mock on error
      sttProcessingTime = Date.now() - sttProcessingStart;
      transcription = "Hello, this is a fallback transcription";
      
      this.sendMessage(ws, {
        type: "stt_final",
        eventId: message.eventId,
        text: transcription,
        confidence: 0.85,
        language: "en",
        duration: 1.5,
        latency: {
          capture: 20,
          network: networkLatency,
          processing: sttProcessingTime,
          total: networkLatency + sttProcessingTime,
        },
      });
    }
    
    // VLLM Agent response (if enabled)
    const agentProcessingStart = Date.now();
    let agentResponse = "";
    
    if (conn.config?.agentEnabled) {
      this.sendMessage(ws, {
        type: "agent_thinking",
        eventId: message.eventId,
        status: "Processing your request...",
      });
      
      try {
        // Call VLLM agent with the transcription
        const vllmResult = await mlClient.callVLLM({
          session_id: conn.sessionId,
          message: transcription,
          mode: conn.config?.agentMode || "assistant",
          system_prompt: conn.config?.systemPrompt,
        });
        
        agentResponse = vllmResult.response;
        
        this.sendMessage(ws, {
          type: "agent_reply",
          eventId: message.eventId,
          text: agentResponse,
          timestamp: Date.now(),
        });
      } catch (error: any) {
        console.error("[RealTime] VLLM agent error:", error);
        
        // Fallback response on error
        agentResponse = `I received your message: "${transcription}"`;
        
        this.sendMessage(ws, {
          type: "agent_reply",
          eventId: message.eventId,
          text: agentResponse,
          timestamp: Date.now(),
        });
      }
    }
    
    const agentProcessingTime = Date.now() - agentProcessingStart;
    
    // Real TTS generation with streaming (if enabled and agent responded)
    const ttsProcessingStart = Date.now();
    let firstChunkLatency = 0;
    let totalChunks = 0;
    
    if (conn.config?.ttsEnabled && agentResponse) {
      try {
        await mlClient.callTTSStreaming(
          {
            text: agentResponse,
            model: conn.config?.model || "chatterbox",
            voice: conn.config?.voice,
            speed: 1.0,
            chunk_duration_ms: 200,
          },
          (chunk) => {
            if (chunk.type === "error") {
              console.error("[RealTime] TTS streaming error:", chunk.message);
              return;
            }
            
            // Track first chunk latency
            if (chunk.sequence === 0) {
              firstChunkLatency = chunk.latency_ms || 0;
            }
            
            totalChunks++;
            
            // Send TTS chunk to client
            this.sendMessage(ws, {
              type: "tts_chunk",
              eventId: message.eventId,
              chunk: chunk.chunk || "",
              sequence: chunk.sequence || 0,
              done: chunk.done || false,
            });
          }
        );
      
        const ttsProcessingTime = Date.now() - ttsProcessingStart;
        
        // Send TTS complete with latency
        this.sendMessage(ws, {
          type: "tts_complete",
          eventId: message.eventId,
          duration: totalChunks * 0.2, // Approximate based on 200ms chunks
          latency: {
            processing: ttsProcessingTime,
            streaming: firstChunkLatency,
            total: ttsProcessingTime,
          },
        });
      } catch (error: any) {
        console.error("[RealTime] TTS streaming failed:", error);
        
        // Fallback to mock audio on error
        const sampleRate = 16000;
        const duration = 1.0;
        const frequency = 440;
        const samples = Math.floor(sampleRate * duration);
        
        const audioBuffer = new Int16Array(samples);
        for (let i = 0; i < samples; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
          audioBuffer[i] = Math.floor(sample * 32767 * 0.3);
        }
        
        const wavBuffer = this.createWAVBuffer(audioBuffer, sampleRate);
        const base64Audio = Buffer.from(wavBuffer).toString('base64');
        
        this.sendMessage(ws, {
          type: "tts_chunk",
          eventId: message.eventId,
          chunk: base64Audio,
          sequence: 0,
          done: true,
        });
        
        const ttsProcessingTime = Date.now() - ttsProcessingStart;
        
        this.sendMessage(ws, {
          type: "tts_complete",
          eventId: message.eventId,
          duration: 1.0,
          latency: {
            processing: ttsProcessingTime,
            streaming: 10,
            total: ttsProcessingTime,
          },
        });
      }
    }
    
    const ttsProcessingTime = Date.now() - ttsProcessingStart;
    
    // Send overall metrics
    const totalLatency = Date.now() - message.timestamp;
    this.sendMessage(ws, {
      type: "metrics",
      eventId: message.eventId,
      metrics: {
        sttLatency: sttProcessingTime,
        ttsLatency: ttsProcessingTime,
        agentLatency: agentProcessingTime,
        endToEndLatency: totalLatency,
        activeConnections: this.connections.size,
        queueDepth: 0,
      },
    });
    
    // Store comprehensive metrics sample
    this.addMetricsSample({
      timestamp: Date.now(),
      stt: sttProcessingTime,
      agent: agentProcessingTime,
      tts: ttsProcessingTime,
      e2e: totalLatency,
      queueDepth: this.getCurrentQueueDepth(),
      activeConnections: this.connections.size,
      errorStage: null,
    });
    
    // Update session stats
    const session = this.sessions.getSession(conn.sessionId);
    if (session) {
      session.messagesProcessed++;
      session.avgLatency = ((session.avgLatency * (session.messagesProcessed - 1)) + totalLatency) / session.messagesProcessed;
    }
  }
  
  // Helper to create WAV file buffer from PCM data
  private createWAVBuffer(pcmData: Int16Array, sampleRate: number): ArrayBuffer {
    const byteRate = sampleRate * 2; // 16-bit mono
    const blockAlign = 2;
    const bitsPerSample = 16;
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    
    // Combine header and PCM data
    const result = new Uint8Array(44 + pcmData.length * 2);
    result.set(new Uint8Array(wavHeader), 0);
    result.set(new Uint8Array(pcmData.buffer), 44);
    
    return result.buffer;
  }
  
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  private async handleTextInput(ws: WebSocket, message: Extract<WSClientMessage, { type: "text_input" }>) {
    const conn = this.connections.get(ws);
    if (!conn?.sessionId) {
      this.sendError(ws, message.eventId, "NO_SESSION", "Session not initialized", false);
      return;
    }
    
    // Track latency
    this.startLatencyTracking(message.eventId, message.timestamp);
    const networkLatency = Date.now() - message.timestamp;
    
    // Echo back as STT final result (for text mode, no actual STT processing needed)
    this.sendMessage(ws, {
      type: "stt_final",
      eventId: message.eventId,
      text: message.text,
      confidence: 1.0,
      language: "en",
      duration: 0,
      latency: {
        capture: 0,
        network: networkLatency,
        processing: 0,
        total: networkLatency,
      },
    });
    
    // VLLM Agent response (if enabled)
    const agentProcessingStart = Date.now();
    let agentResponse = "";
    
    if (conn.config?.agentEnabled) {
      this.sendMessage(ws, {
        type: "agent_thinking",
        eventId: message.eventId,
        status: "Processing your request...",
      });
      
      try {
        // Call VLLM agent with the text input
        const vllmResult = await mlClient.callVLLM({
          session_id: conn.sessionId,
          message: message.text,
          mode: conn.config?.agentMode || "assistant",
          system_prompt: conn.config?.systemPrompt,
        });
        
        agentResponse = vllmResult.response;
        
        this.sendMessage(ws, {
          type: "agent_reply",
          eventId: message.eventId,
          text: agentResponse,
          timestamp: Date.now(),
        });
      } catch (error: any) {
        console.error("[RealTime] VLLM agent error:", error);
        
        // Fallback response on error
        agentResponse = `I received your message: "${message.text}"`;
        
        this.sendMessage(ws, {
          type: "agent_reply",
          eventId: message.eventId,
          text: agentResponse,
          timestamp: Date.now(),
        });
      }
    } else {
      // If agent not enabled, echo the input
      agentResponse = `Echo: ${message.text}`;
      this.sendMessage(ws, {
        type: "agent_reply",
        eventId: message.eventId,
        text: agentResponse,
        timestamp: Date.now(),
      });
    }
    
    const agentProcessingTime = Date.now() - agentProcessingStart;
    
    // Real TTS generation with streaming (if enabled and we have agent response)
    const ttsProcessingStart = Date.now();
    let firstChunkLatency = 0;
    let totalChunks = 0;
    
    if (conn.config?.ttsEnabled && agentResponse) {
      try {
        await mlClient.callTTSStreaming(
          {
            text: agentResponse,
            model: conn.config?.model || "chatterbox",
            voice: conn.config?.voice,
            speed: 1.0,
            chunk_duration_ms: 200,
          },
          (chunk) => {
            if (chunk.type === "error") {
              console.error("[RealTime] TTS streaming error:", chunk.message);
              return;
            }
            
            // Track first chunk latency
            if (chunk.sequence === 0) {
              firstChunkLatency = chunk.latency_ms || 0;
            }
            
            totalChunks++;
            
            // Send TTS chunk to client
            this.sendMessage(ws, {
              type: "tts_chunk",
              eventId: message.eventId,
              chunk: chunk.chunk || "",
              sequence: chunk.sequence || 0,
              done: chunk.done || false,
            });
          }
        );
      
        const ttsProcessingTime = Date.now() - ttsProcessingStart;
        
        // Send TTS complete with latency
        this.sendMessage(ws, {
          type: "tts_complete",
          eventId: message.eventId,
          duration: totalChunks * 0.2,
          latency: {
            processing: ttsProcessingTime,
            streaming: firstChunkLatency,
            total: ttsProcessingTime,
          },
        });
      } catch (error: any) {
        console.error("[RealTime] TTS streaming failed:", error);
        
        // Send completion even on error
        const ttsProcessingTime = Date.now() - ttsProcessingStart;
        
        this.sendMessage(ws, {
          type: "tts_complete",
          eventId: message.eventId,
          duration: 0,
          latency: {
            processing: ttsProcessingTime,
            streaming: 0,
            total: ttsProcessingTime,
          },
        });
      }
    }
    
    const ttsProcessingTime = Date.now() - ttsProcessingStart;
    
    // Send overall metrics
    const totalLatency = Date.now() - message.timestamp;
    this.sendMessage(ws, {
      type: "metrics",
      eventId: message.eventId,
      metrics: {
        sttLatency: 0,
        ttsLatency: ttsProcessingTime,
        agentLatency: agentProcessingTime,
        endToEndLatency: totalLatency,
        activeConnections: this.connections.size,
        queueDepth: 0,
      },
    });
    
    // Store comprehensive metrics sample
    this.addMetricsSample({
      timestamp: Date.now(),
      stt: 0,
      agent: agentProcessingTime,
      tts: ttsProcessingTime,
      e2e: totalLatency,
      queueDepth: this.getCurrentQueueDepth(),
      activeConnections: this.connections.size,
      errorStage: null,
    });
    
    // Update session stats
    const session = this.sessions.getSession(conn.sessionId);
    if (session) {
      session.messagesProcessed++;
      session.avgLatency = ((session.avgLatency * (session.messagesProcessed - 1)) + totalLatency) / session.messagesProcessed;
    }
  }
  
  private async handleControl(ws: WebSocket, message: Extract<WSClientMessage, { type: "pause" | "resume" | "end" }>) {
    const conn = this.connections.get(ws);
    if (!conn?.sessionId) return;
    
    if (message.type === "end") {
      const session = this.sessions.endSession(conn.sessionId);
      if (session) {
        const duration = (new Date().getTime() - session.startedAt.getTime()) / 1000;
        this.sendMessage(ws, {
          type: "ended",
          eventId: message.eventId,
          reason: "client_requested",
          stats: {
            duration,
            messagesProcessed: session.messagesProcessed,
            avgLatency: session.avgLatency,
            errorCount: session.errorCount,
          },
        });
      }
      conn.sessionId = undefined;
    }
  }
  
  private async handleQualityFeedback(ws: WebSocket, message: Extract<WSClientMessage, { type: "quality_feedback" }>) {
    console.log("[RealTime] Quality feedback received:", {
      category: message.category,
      score: message.score,
      comment: message.comment,
    });
    
    // Store quality feedback
    this.qualityFeedback.push({
      timestamp: Date.now(),
      category: message.category,
      score: message.score,
      eventId: message.eventId,
    });
    
    // Keep only last MAX_HISTORY_SIZE entries
    if (this.qualityFeedback.length > this.MAX_HISTORY_SIZE) {
      this.qualityFeedback.shift();
    }
  }
  
  private sendMessage(ws: WebSocket, message: WSServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  private sendError(ws: WebSocket, eventId: string, code: string, message: string, recoverable: boolean) {
    this.sendMessage(ws, {
      type: "error",
      eventId,
      code,
      message,
      recoverable,
    });
  }
  
  private startLatencyTracking(eventId: string, clientTimestamp: number) {
    this.latencyTracking.set(eventId, {
      start: clientTimestamp,
      stages: {
        received: Date.now(),
      },
    });
  }
  
  private recordLatencyStage(eventId: string, stage: string) {
    const tracking = this.latencyTracking.get(eventId);
    if (tracking) {
      tracking.stages[stage] = Date.now();
    }
  }
  
  private getLatency(eventId: string): number {
    const tracking = this.latencyTracking.get(eventId);
    if (!tracking) return 0;
    
    const endTime = Date.now();
    return endTime - tracking.start;
  }
  
  // Helper methods for metrics tracking
  private addMetricsSample(sample: MetricsSample) {
    this.metricsHistory.push(sample);
    
    // Keep only last MAX_HISTORY_SIZE entries
    if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
      this.metricsHistory.shift();
    }
    
    // Track error if present
    if (sample.errorStage) {
      this.errorCounts[sample.errorStage]++;
    }
  }
  
  private getCurrentQueueDepth(): number {
    // Simulated queue depth based on active connections
    return Math.max(0, this.connections.size - 2);
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  private calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 10) return 'stable';
    
    const recentHalf = values.slice(-Math.floor(values.length / 2));
    const olderHalf = values.slice(0, Math.floor(values.length / 2));
    
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change < -5) return 'improving'; // Lower latency is better
    if (change > 5) return 'degrading';
    return 'stable';
  }
  
  // Enhanced metrics endpoint helper
  public getMetrics() {
    const sttValues = this.metricsHistory.map(m => m.stt);
    const agentValues = this.metricsHistory.map(m => m.agent);
    const ttsValues = this.metricsHistory.map(m => m.tts);
    const e2eValues = this.metricsHistory.map(m => m.e2e);
    
    const calculateStats = (values: number[], label: string) => {
      if (values.length === 0) {
        return {
          avg: null,
          min: null,
          max: null,
          p50: null,
          p95: null,
          p99: null,
          trend: 'stable' as const,
        };
      }
      
      const sum = values.reduce((a, b) => a + b, 0);
      return {
        avg: Math.round(sum / values.length),
        min: Math.min(...values),
        max: Math.max(...values),
        p50: this.calculatePercentile(values, 50),
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99),
        trend: this.calculateTrend(values),
      };
    };
    
    // Calculate quality scores
    const qualityByCategory = {
      stt_accuracy: this.qualityFeedback.filter(f => f.category === 'stt_accuracy'),
      tts_quality: this.qualityFeedback.filter(f => f.category === 'tts_quality'),
      latency: this.qualityFeedback.filter(f => f.category === 'latency'),
      overall: this.qualityFeedback.filter(f => f.category === 'overall'),
    };
    
    const calculateQualityAvg = (feedback: QualityFeedback[]) => {
      if (feedback.length === 0) return null;
      const sum = feedback.reduce((a, b) => a + b.score, 0);
      return (sum / feedback.length).toFixed(2);
    };
    
    return {
      activeConnections: this.connections.size,
      activeSessions: this.sessions.getActiveSessionCount(),
      queueDepth: this.getCurrentQueueDepth(),
      
      latency: {
        stt: calculateStats(sttValues, 'STT'),
        agent: calculateStats(agentValues, 'Agent'),
        tts: calculateStats(ttsValues, 'TTS'),
        endToEnd: calculateStats(e2eValues, 'End-to-End'),
      },
      
      errors: {
        stt: this.errorCounts.stt,
        agent: this.errorCounts.agent,
        tts: this.errorCounts.tts,
        total: this.errorCounts.stt + this.errorCounts.agent + this.errorCounts.tts,
      },
      
      quality: {
        sttAccuracy: calculateQualityAvg(qualityByCategory.stt_accuracy),
        ttsQuality: calculateQualityAvg(qualityByCategory.tts_quality),
        latencyRating: calculateQualityAvg(qualityByCategory.latency),
        overall: calculateQualityAvg(qualityByCategory.overall),
        feedbackCount: this.qualityFeedback.length,
      },
      
      samplesCount: this.metricsHistory.length,
    };
  }
  
  // Get full metrics history for charts
  public getMetricsHistory() {
    return {
      samples: this.metricsHistory.map(m => ({
        timestamp: m.timestamp,
        stt: m.stt,
        agent: m.agent,
        tts: m.tts,
        e2e: m.e2e,
        queueDepth: m.queueDepth,
        activeConnections: m.activeConnections,
      })),
      quality: this.qualityFeedback.map(f => ({
        timestamp: f.timestamp,
        category: f.category,
        score: f.score,
      })),
    };
  }
}
