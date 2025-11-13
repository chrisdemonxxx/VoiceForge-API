import { queryClient } from "./queryClient";

export type CallStatus = "idle" | "connecting" | "ringing" | "in-progress" | "ended" | "failed";

export interface CallState {
  callId: string | null;
  sessionId: string | null;
  status: CallStatus;
  phoneNumber: string;
  duration: number;
  muted: boolean;
  speakerVolume: number;
}

export type CallEventHandler = (state: CallState) => void;

export class TelephonyClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private callState: CallState = {
    callId: null,
    sessionId: null,
    status: "idle",
    phoneNumber: "",
    duration: 0,
    muted: false,
    speakerVolume: 1.0,
  };
  private eventHandlers: Set<CallEventHandler> = new Set();
  private durationInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(private apiKey: string) {}

  private emit() {
    this.eventHandlers.forEach(handler => handler({ ...this.callState }));
  }

  public onStateChange(handler: CallEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/telephony-ws`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[TelephonyClient] WebSocket connected');
        this.ws!.send(JSON.stringify({
          type: 'init',
          apiKey: this.apiKey,
        }));
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
        
        if (message.type === 'init_success') {
          this.sessionId = message.sessionId;
          this.callState.sessionId = message.sessionId;
          this.reconnectAttempts = 0;
          resolve();
        } else if (message.type === 'error') {
          reject(new Error(message.error));
        }
      };

      this.ws.onerror = (error) => {
        console.error('[TelephonyClient] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[TelephonyClient] WebSocket closed');
        this.handleDisconnect();
      };
    });
  }

  private handleMessage(message: any) {
    console.log('[TelephonyClient] Received:', message);

    switch (message.type) {
      case 'call_initiated':
        this.callState.callId = message.callId;
        this.callState.status = 'connecting';
        this.emit();
        break;

      case 'call_ringing':
        this.callState.status = 'ringing';
        this.emit();
        break;

      case 'call_answered':
        this.callState.status = 'in-progress';
        this.startDurationTimer();
        this.emit();
        break;

      case 'call_ended':
        this.endCall();
        break;

      case 'call_failed':
        this.callState.status = 'failed';
        this.emit();
        setTimeout(() => this.reset(), 3000);
        break;

      case 'audio_chunk':
        this.playAudioChunk(message.data);
        break;

      case 'error':
        console.error('[TelephonyClient] Error:', message.error);
        if (message.error.includes('API key')) {
          this.disconnect();
        }
        break;
    }
  }

  private handleDisconnect() {
    if (this.callState.status === 'in-progress' && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[TelephonyClient] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      this.reset();
    }
  }

  public async startCall(phoneNumber: string, providerId?: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    if (this.callState.status !== 'idle') {
      throw new Error('Call already in progress');
    }

    this.callState.phoneNumber = phoneNumber;
    this.callState.status = 'connecting';
    this.emit();

    this.ws!.send(JSON.stringify({
      type: 'start_call',
      sessionId: this.sessionId,
      phoneNumber,
      providerId,
    }));
  }

  public endCall(): void {
    if (this.sessionId && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'end_call',
        sessionId: this.sessionId,
      }));
    }

    this.stopDurationTimer();
    this.callState.status = 'ended';
    this.emit();
    
    setTimeout(() => this.reset(), 2000);
  }

  public toggleMute(): void {
    this.callState.muted = !this.callState.muted;
    this.emit();

    if (this.sessionId && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'mute',
        sessionId: this.sessionId,
        muted: this.callState.muted,
      }));
    }
  }

  public setVolume(volume: number): void {
    this.callState.speakerVolume = Math.max(0, Math.min(1, volume));
    this.emit();
  }

  public sendDTMF(digit: string): void {
    if (this.sessionId && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'dtmf',
        sessionId: this.sessionId,
        digit,
      }));
    }
  }

  private startDurationTimer(): void {
    this.callState.duration = 0;
    this.durationInterval = setInterval(() => {
      this.callState.duration++;
      this.emit();
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private async playAudioChunk(base64Data: string): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }

      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.buffer);
      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        this.playNextAudioChunk();
      }
    } catch (error) {
      console.error('[TelephonyClient] Failed to decode audio:', error);
    }
  }

  private playNextAudioChunk(): void {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext!.createBufferSource();
    const gainNode = this.audioContext!.createGain();
    
    gainNode.gain.value = this.callState.speakerVolume;
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    source.onended = () => {
      this.playNextAudioChunk();
    };

    source.start();
  }

  private reset(): void {
    this.stopDurationTimer();
    this.callState = {
      callId: null,
      sessionId: this.sessionId,
      status: 'idle',
      phoneNumber: '',
      duration: 0,
      muted: false,
      speakerVolume: this.callState.speakerVolume,
    };
    this.audioQueue = [];
    this.isPlaying = false;
    this.emit();
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.reset();
  }

  public getState(): CallState {
    return { ...this.callState };
  }
}

let telephonyClientInstance: TelephonyClient | null = null;

export function getTelephonyClient(apiKey?: string): TelephonyClient {
  if (!telephonyClientInstance && apiKey) {
    telephonyClientInstance = new TelephonyClient(apiKey);
  }
  if (!telephonyClientInstance) {
    throw new Error('TelephonyClient not initialized. Provide apiKey on first call.');
  }
  return telephonyClientInstance;
}

export function resetTelephonyClient(): void {
  if (telephonyClientInstance) {
    telephonyClientInstance.disconnect();
    telephonyClientInstance = null;
  }
}
