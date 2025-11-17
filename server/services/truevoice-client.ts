/**
 * TrueVoiceStreaming WebSocket Client
 * Handles real-time bidirectional streaming with TrueVoiceStreaming API
 * 
 * Protocol:
 * - Connect: wss://api.loopercreations.org/ws/conversation?api_key=xxx&language=en-US
 * - Send: Binary PCM16 frames (16kHz, mono)
 * - Receive: 
 *   - Text: {"type": "transcript", "text": "..."}
 *   - Text: {"type": "llm_token", "text": "..."}
 *   - Text: {"type": "llm_done"}
 *   - Binary: TTS audio chunks (PCM16, 16kHz)
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface TrueVoiceConfig {
  apiKey: string;
  language?: string;
  baseUrl?: string;
}

export interface TrueVoiceMessage {
  type: 'transcript' | 'llm_token' | 'llm_done';
  text?: string;
}

export interface TrueVoiceAudioChunk {
  data: Buffer;
  timestamp: number;
}

export class TrueVoiceClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: TrueVoiceConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;
  private isConnected = false;
  private connectionId: string | null = null;

  constructor(config: TrueVoiceConfig) {
    super();
    this.config = {
      baseUrl: 'wss://api.loopercreations.org',
      language: 'en-US',
      ...config,
    };
  }

  /**
   * Connect to TrueVoiceStreaming WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.baseUrl}/ws/conversation?api_key=${this.config.apiKey}&language=${this.config.language}`;
        
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          
          console.log(`[TrueVoice] Connected: ${this.connectionId}`);
          this.emit('connected', this.connectionId);
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          console.error('[TrueVoice] WebSocket error:', error);
          this.emit('error', error);
          if (!this.isConnected) {
            this.isConnecting = false;
            reject(error);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.isConnected = false;
          this.isConnecting = false;
          const reasonStr = reason.toString();
          console.log(`[TrueVoice] Disconnected: ${code} - ${reasonStr}`);
          this.emit('disconnected', { code, reason: reasonStr });

          // Auto-reconnect if not intentional close
          if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    if (Buffer.isBuffer(data)) {
      // Binary audio chunk
      const chunk: TrueVoiceAudioChunk = {
        data: data,
        timestamp: Date.now(),
      };
      this.emit('audio', chunk);
    } else if (typeof data === 'string') {
      // Text message (JSON)
      try {
        const message: TrueVoiceMessage = JSON.parse(data);
        
        switch (message.type) {
          case 'transcript':
            this.emit('transcript', message.text || '');
            break;
          case 'llm_token':
            this.emit('llm_token', message.text || '');
            break;
          case 'llm_done':
            this.emit('llm_done');
            break;
          default:
            console.warn(`[TrueVoice] Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('[TrueVoice] Failed to parse message:', error);
      }
    }
  }

  /**
   * Send audio chunk to TrueVoiceStreaming
   */
  sendAudio(audioData: Buffer): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('TrueVoiceStreaming WebSocket not connected');
    }

    try {
      this.ws.send(audioData);
    } catch (error) {
      console.error('[TrueVoice] Failed to send audio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[TrueVoice] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          console.error('[TrueVoice] Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection ID
   */
  get id(): string | null {
    return this.connectionId;
  }
}

