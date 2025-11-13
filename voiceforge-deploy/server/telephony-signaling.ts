import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { TelephonyService } from "./services/telephony-service";

/**
 * WebRTC Signaling Message Types
 */
interface SignalingMessage {
  type: "init" | "offer" | "answer" | "ice_candidate" | "start_call" | "end_call" | "error";
  apiKey?: string;
  sessionId?: string;
  phoneNumber?: string;
  flowId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  callId?: string;
  error?: string;
}

/**
 * Active WebRTC peer connection state
 */
interface PeerConnectionState {
  sessionId: string;
  callId: string;
  ws: WebSocket;
  apiKeyId: string;
  phoneNumber: string;
  flowId?: string;
  providerId: string;
  createdAt: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
}

/**
 * Telephony WebSocket Signaling Handler
 * Manages WebRTC signaling for browser-based calling
 */
export class TelephonySignaling {
  private wss: WebSocketServer;
  private connections: Map<string, PeerConnectionState> = new Map(); // Key by sessionId
  private wsToSession: Map<WebSocket, string> = new Map(); // Map WebSocket to sessionId
  private sessionToApiKey: Map<string, string> = new Map(); // Map sessionId to apiKeyId
  private telephonyService: TelephonyService;

  constructor(httpServer: Server, telephonyService: TelephonyService, path: string = "/ws/telephony") {
    this.wss = new WebSocketServer({ server: httpServer, path });
    this.telephonyService = telephonyService;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[TelephonySignaling] New WebRTC peer connected");

      ws.on("message", async (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error: any) {
          console.error("[TelephonySignaling] Message error:", error.message);
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("[TelephonySignaling] WebSocket error:", error);
        this.handleDisconnect(ws);
      });
    });

    console.log("[TelephonySignaling] WebSocket server initialized");
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleMessage(ws: WebSocket, message: SignalingMessage) {
    try {
      // Init doesn't require sessionId validation
      if (message.type === "init") {
        await this.handleInit(ws, message);
        return;
      }

      // All other messages require valid sessionId
      if (!message.sessionId) {
        throw new Error("sessionId is required");
      }

      const sessionId = this.wsToSession.get(ws);
      if (!sessionId) {
        throw new Error("WebSocket not initialized. Send 'init' message first.");
      }

      if (message.sessionId !== sessionId) {
        throw new Error("Session ID mismatch. Invalid session.");
      }

      switch (message.type) {
        case "start_call":
          await this.handleStartCall(ws, message);
          break;

        case "offer":
          await this.handleOffer(ws, message);
          break;

        case "answer":
          await this.handleAnswer(ws, message);
          break;

        case "ice_candidate":
          await this.handleIceCandidate(ws, message);
          break;

        case "end_call":
          await this.handleEndCall(ws, message);
          break;

        default:
          this.sendError(ws, "Unknown message type");
      }
    } catch (error: any) {
      console.error("[TelephonySignaling] Handler error:", error.message);
      this.sendError(ws, error.message);
    }
  }

  /**
   * Handle WebSocket initialization and API key validation
   */
  private async handleInit(ws: WebSocket, message: SignalingMessage) {
    if (!message.apiKey) {
      throw new Error("API key is required");
    }

    // Validate API key
    const apiKey = await storage.getApiKeyByKey(message.apiKey);
    if (!apiKey) {
      ws.close(4001, "Invalid API key");
      return;
    }

    if (!apiKey.active) {
      ws.close(4002, "API key is inactive");
      return;
    }

    // Generate unique session ID for this WebSocket connection
    const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Map WebSocket to session ID and store API key
    this.wsToSession.set(ws, sessionId);
    this.sessionToApiKey.set(sessionId, apiKey.id);

    // Send acknowledgment with real session ID
    this.send(ws, {
      type: "init",
      sessionId,
    });

    console.log(`[TelephonySignaling] WebSocket initialized: session=${sessionId}, apiKey=${apiKey.id}`);
  }

  /**
   * Handle call initiation
   */
  private async handleStartCall(ws: WebSocket, message: SignalingMessage) {
    const sessionId = message.sessionId!; // Validated by handleMessage
    
    // Check if this session already has an active call
    if (this.connections.has(sessionId)) {
      throw new Error("Session already has an active call");
    }

    if (!message.phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Validate phone number format
    const isValid = TelephonyService.validatePhoneNumber(message.phoneNumber);
    if (!isValid) {
      throw new Error("Invalid phone number format");
    }

    // Get API key ID from session
    const apiKeyId = this.getApiKeyIdForSession(sessionId);
    if (!apiKeyId) {
      throw new Error("API key not found for session");
    }

    // Get active provider for this API key
    const provider = await storage.getActiveTelephonyProvider(apiKeyId);
    if (!provider) {
      throw new Error("No telephony provider configured for this account");
    }

    // Get a phone number from this provider (use first available)
    const phoneNumbers = await storage.getAllPhoneNumbers(provider.id);
    const fromNumber = phoneNumbers.find((pn: any) => pn.active)?.phoneNumber || "+10000000000";

    // Initiate call through telephony service (creates call record and places actual call)
    const callSession = await this.telephonyService.initiateCall({
      providerId: provider.id,
      from: fromNumber,
      to: message.phoneNumber,
      flowId: message.flowId,
    });

    // Get the call record created by initiateCall
    const callRecord = await storage.getCall(callSession.callId);
    if (!callRecord) {
      throw new Error("Call record not found after initiation");
    }

    // Update call record with WebSocket session metadata
    await storage.updateCall(callRecord.id, {
      metadata: {
        ...(callRecord.metadata || {}),
        wsSessionId: sessionId,
        userAgent: "WebRTC Dialer",
      },
    });
    
    // Store connection state (keyed by sessionId)
    const state: PeerConnectionState = {
      sessionId,
      callId: callRecord.id,
      ws,
      apiKeyId,
      phoneNumber: message.phoneNumber,
      flowId: message.flowId,
      providerId: provider.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      isAuthenticated: true,
    };

    this.connections.set(sessionId, state);

    // Send session info back to client
    this.send(ws, {
      type: "start_call",
      sessionId,
      callId: callRecord.id,
    });

    console.log(`[TelephonySignaling] Call started: ${callRecord.id} to ${message.phoneNumber}`);
  }

  /**
   * Helper to get API key ID for a session
   */
  private getApiKeyIdForSession(sessionId: string): string | undefined {
    return this.sessionToApiKey.get(sessionId);
  }

  /**
   * Handle WebRTC offer (from client)
   */
  private async handleOffer(ws: WebSocket, message: SignalingMessage) {
    const sessionId = message.sessionId!; // Validated by handleMessage
    const state = this.connections.get(sessionId);
    
    if (!state) {
      throw new Error("No active call session. Start a call first.");
    }

    if (!message.sdp) {
      throw new Error("SDP offer is required");
    }

    // In a real implementation, this would:
    // 1. Process the SDP offer
    // 2. Create an SDP answer with server audio configuration
    // 3. Set up media tracks for bidirectional audio
    // 4. Configure STUN/TURN servers for NAT traversal

    // For now, we'll acknowledge the offer and let the client know
    // the server is ready to exchange ICE candidates
    console.log(`[TelephonySignaling] Received offer for session ${sessionId}`);

    // Update activity and call status
    state.lastActivity = new Date();
    await storage.updateCall(state.callId, { status: "ringing" });

    // Send acknowledgment
    this.send(ws, {
      type: "offer",
      sessionId,
    });
  }

  /**
   * Handle WebRTC answer (from client if server sent offer, or vice versa)
   */
  private async handleAnswer(ws: WebSocket, message: SignalingMessage) {
    const sessionId = message.sessionId!; // Validated by handleMessage
    const state = this.connections.get(sessionId);
    
    if (!state) {
      throw new Error("No active call session");
    }

    if (!message.sdp) {
      throw new Error("SDP answer is required");
    }

    console.log(`[TelephonySignaling] Received answer for session ${sessionId}`);

    // Update activity and call status
    state.lastActivity = new Date();
    await storage.updateCall(state.callId, { status: "in-progress" });

    // Acknowledge answer received
    this.send(ws, {
      type: "answer",
      sessionId,
    });
  }

  /**
   * Handle ICE candidate exchange
   */
  private async handleIceCandidate(ws: WebSocket, message: SignalingMessage) {
    const sessionId = message.sessionId!; // Validated by handleMessage
    const state = this.connections.get(sessionId);
    
    if (!state) {
      throw new Error("No active call session");
    }

    if (!message.candidate) {
      throw new Error("ICE candidate is required");
    }

    // In a real implementation, this would add the ICE candidate
    // to the peer connection for NAT traversal
    console.log(`[TelephonySignaling] Received ICE candidate for session ${sessionId}`);

    // Update activity
    state.lastActivity = new Date();

    // Acknowledge candidate received
    this.send(ws, {
      type: "ice_candidate",
      sessionId,
    });
  }

  /**
   * Handle call termination
   */
  private async handleEndCall(ws: WebSocket, message: SignalingMessage) {
    const sessionId = message.sessionId!; // Validated by handleMessage
    const state = this.connections.get(sessionId);
    
    if (!state) {
      throw new Error("No active call session");
    }

    // Update call record in database with final status
    const currentCall = await storage.getCall(state.callId);
    if (currentCall && !currentCall.endedAt) {
      await storage.updateCall(state.callId, {
        status: "completed",
        endedAt: new Date(),
      });
    }

    // Clean up connection state
    this.connections.delete(sessionId);

    // Send confirmation
    this.send(ws, {
      type: "end_call",
      sessionId,
      callId: state.callId,
    });

    console.log(`[TelephonySignaling] Call ended: ${state.callId}`);
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(ws: WebSocket) {
    const sessionId = this.wsToSession.get(ws);
    if (!sessionId) return;

    const state = this.connections.get(sessionId);
    if (state) {
      console.log(`[TelephonySignaling] Client disconnected: ${sessionId}`);

      // Only update call to failed if it hasn't already ended
      try {
        const currentCall = await storage.getCall(state.callId);
        if (currentCall && !currentCall.endedAt) {
          await storage.updateCall(state.callId, {
            status: "failed",
            endedAt: new Date(),
          });
        }
      } catch (error) {
        console.error("[TelephonySignaling] Error ending call on disconnect:", error);
      }

      // Clean up all state
      this.connections.delete(sessionId);
    }

    // Clean up session mappings
    this.wsToSession.delete(ws);
    this.sessionToApiKey.delete(sessionId);
  }

  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string) {
    this.send(ws, {
      type: "error",
      error,
    });
  }

  /**
   * Broadcast message to specific session
   */
  broadcastToSession(sessionId: string, message: any) {
    const state = this.connections.get(sessionId);
    if (state) {
      this.send(state.ws, message);
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): PeerConnectionState | undefined {
    return this.connections.get(sessionId);
  }
}
