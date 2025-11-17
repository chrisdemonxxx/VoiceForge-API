/**
 * ElevenLabs-like Voice Streaming Pipeline
 * Orchestrates all components for real-time voice streaming
 * 
 * Pipeline Flow:
 * 1. Receive μ-law 8kHz audio from telephony
 * 2. Convert to PCM16 16kHz
 * 3. Send to TrueVoiceStreaming WebSocket
 * 4. Receive streaming TTS audio chunks
 * 5. Process through jitter buffer, sequencer, playback controller
 * 6. Add breathing and pauses
 * 7. Convert back to μ-law 8kHz
 * 8. Send to telephony provider
 */

import { TrueVoiceClient, type TrueVoiceConfig, type TrueVoiceAudioChunk } from './truevoice-client';
import { convertUlawToPcm16, convertPcm16ToUlaw } from './audio-converter';
import { JitterBuffer, type AudioChunk as JitterAudioChunk } from './jitter-buffer';
import { AudioSequencer, type SequencedAudioChunk } from './audio-sequencer';
import { PlaybackController } from './playback-controller';
import { ChunkManager } from './chunk-manager';
import { BreathingGenerator } from './breathing-generator';
import { PauseManager } from './pause-manager';
import { EventEmitter } from 'events';

export interface StreamingPipelineConfig {
  trueVoiceApiKey: string;
  trueVoiceLanguage?: string;
  trueVoiceBaseUrl?: string;
  enableBreathing?: boolean;
  enablePauses?: boolean;
  jitterBufferMinMs?: number;
  jitterBufferMaxMs?: number;
  jitterBufferTargetMs?: number;
}

export interface PipelineStatistics {
  audioChunksReceived: number;
  audioChunksSent: number;
  transcriptionsReceived: number;
  llmTokensReceived: number;
  jitterStats: ReturnType<JitterBuffer['getStatistics']>;
  sequenceStats: ReturnType<AudioSequencer['getStatistics']>;
  playbackState: ReturnType<PlaybackController['getState']>;
}

export class StreamingPipeline extends EventEmitter {
  private trueVoiceClient: TrueVoiceClient;
  private jitterBuffer: JitterBuffer;
  private sequencer: AudioSequencer;
  private playbackController: PlaybackController;
  private chunkManager: ChunkManager;
  private breathingGenerator: BreathingGenerator;
  private pauseManager: PauseManager;
  private config: StreamingPipelineConfig;
  private isActive = false;
  private statistics: PipelineStatistics;
  private lastTranscript = '';
  private lastLLMText = '';
  private playbackInterval: NodeJS.Timeout | null = null;

  constructor(config: StreamingPipelineConfig) {
    super();
    this.config = config;

    // Initialize TrueVoiceStreaming client
    this.trueVoiceClient = new TrueVoiceClient({
      apiKey: config.trueVoiceApiKey,
      language: config.trueVoiceLanguage || 'en-US',
      baseUrl: config.trueVoiceBaseUrl,
    });

    // Initialize pipeline components
    this.jitterBuffer = new JitterBuffer({
      minBufferMs: config.jitterBufferMinMs || 20,
      maxBufferMs: config.jitterBufferMaxMs || 500,
      targetBufferMs: config.jitterBufferTargetMs || 100,
    });

    this.sequencer = new AudioSequencer();
    this.playbackController = new PlaybackController();
    this.chunkManager = new ChunkManager();
    this.breathingGenerator = new BreathingGenerator({
      enabled: config.enableBreathing !== false,
    });
    this.pauseManager = new PauseManager();

    // Initialize statistics
    this.statistics = {
      audioChunksReceived: 0,
      audioChunksSent: 0,
      transcriptionsReceived: 0,
      llmTokensReceived: 0,
      jitterStats: this.jitterBuffer.getStatistics(),
      sequenceStats: this.sequencer.getStatistics(),
      playbackState: this.playbackController.getState(),
    };

    // Setup TrueVoiceStreaming event handlers
    this.setupTrueVoiceHandlers();
  }

  /**
   * Setup TrueVoiceStreaming WebSocket event handlers
   */
  private setupTrueVoiceHandlers(): void {
    this.trueVoiceClient.on('connected', (connectionId: string) => {
      console.log(`[StreamingPipeline] TrueVoiceStreaming connected: ${connectionId}`);
      this.emit('connected', connectionId);
    });

    this.trueVoiceClient.on('disconnected', (info: { code: number; reason: string }) => {
      console.log(`[StreamingPipeline] TrueVoiceStreaming disconnected: ${info.code} - ${info.reason}`);
      this.emit('disconnected', info);
      this.stop();
    });

    this.trueVoiceClient.on('error', (error: Error) => {
      console.error(`[StreamingPipeline] TrueVoiceStreaming error:`, error);
      this.emit('error', error);
    });

    this.trueVoiceClient.on('transcript', (text: string) => {
      this.lastTranscript = text;
      this.statistics.transcriptionsReceived++;
      this.emit('transcript', text);
    });

    this.trueVoiceClient.on('llm_token', (text: string) => {
      this.lastLLMText += text;
      this.statistics.llmTokensReceived++;
      this.emit('llm_token', text);
    });

    this.trueVoiceClient.on('llm_done', () => {
      this.emit('llm_done', this.lastLLMText);
      this.lastLLMText = '';
    });

    this.trueVoiceClient.on('audio', (chunk: TrueVoiceAudioChunk) => {
      this.handleIncomingAudio(chunk);
    });
  }

  /**
   * Start the streaming pipeline
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    // Connect to TrueVoiceStreaming
    await this.trueVoiceClient.connect();

    // Start playback loop
    this.isActive = true;
    this.playbackController.start();
    this.startPlaybackLoop();

    console.log('[StreamingPipeline] Pipeline started');
    this.emit('started');
  }

  /**
   * Stop the streaming pipeline
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.playbackController.stop();

    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }

    // Disconnect from TrueVoiceStreaming
    this.trueVoiceClient.disconnect();

    // Clear buffers
    this.jitterBuffer.clear();
    this.sequencer.reset();

    console.log('[StreamingPipeline] Pipeline stopped');
    this.emit('stopped');
  }

  /**
   * Process incoming audio from telephony (μ-law 8kHz)
   */
  async processIncomingAudio(ulawAudio: Buffer): Promise<void> {
    if (!this.isActive || !this.trueVoiceClient.connected) {
      return;
    }

    try {
      // Convert μ-law 8kHz to PCM16 16kHz
      const pcm16Audio = convertUlawToPcm16(ulawAudio);

      // Send to TrueVoiceStreaming WebSocket
      this.trueVoiceClient.sendAudio(pcm16Audio);
      this.statistics.audioChunksReceived++;
    } catch (error: any) {
      console.error('[StreamingPipeline] Error processing incoming audio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle incoming audio from TrueVoiceStreaming (PCM16 16kHz)
   */
  private handleIncomingAudio(chunk: TrueVoiceAudioChunk): void {
    try {
      // Create sequenced chunk
      const sequencedChunk = this.sequencer.createChunk(
        chunk.data,
        chunk.data.length / 2, // PCM16 = 2 bytes per sample
        {
          continuation: true,
        }
      );

      // Process through sequencer
      const processed = this.sequencer.processChunk(sequencedChunk);

      // Add to jitter buffer
      const jitterChunk: JitterAudioChunk = {
        data: processed.chunk.data,
        sequence: Number(processed.chunk.sequence),
        timestamp: processed.chunk.timestamp,
        receivedAt: Date.now(),
      };

      this.jitterBuffer.addChunk(jitterChunk);

      // Update playback controller buffer level
      const jitterStats = this.jitterBuffer.getStatistics();
      const bufferLevel = jitterStats.currentBufferMs / jitterStats.targetBufferMs;
      this.playbackController.updateBufferLevel(Math.min(1.0, bufferLevel));

      // Update statistics
      this.statistics.jitterStats = jitterStats;
      this.statistics.sequenceStats = this.sequencer.getStatistics();
    } catch (error: any) {
      console.error('[StreamingPipeline] Error handling incoming audio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Start playback loop - continuously pulls from jitter buffer and emits audio
   */
  private startPlaybackLoop(): void {
    // Playback at ~20ms intervals (50 chunks per second)
    this.playbackInterval = setInterval(() => {
      if (!this.isActive || !this.playbackController.isPlaying) {
        return;
      }

      // Get next chunk from jitter buffer
      const chunk = this.jitterBuffer.getNextChunk();
      if (!chunk) {
        return; // Buffer not ready
      }

      // Process through playback controller
      let audioData = chunk.data;

      // Apply breathing and pauses if enabled
      if (this.config.enableBreathing) {
        // Check if we should insert breathing
        const shouldBreathe = this.breathingGenerator.shouldInsertBreathing(
          this.lastLLMText.split(' ').length,
          false, // TODO: Detect sentence end
          false  // TODO: Detect long pause
        );

        if (shouldBreathe.shouldInsert) {
          const breathing = this.breathingGenerator.generateBreathing(shouldBreathe.type);
          audioData = Buffer.concat([audioData, breathing]);
        }
      }

      // Convert PCM16 16kHz back to μ-law 8kHz
      const ulawAudio = convertPcm16ToUlaw(audioData);

      // Emit audio for telephony
      this.emit('audio', ulawAudio);
      this.statistics.audioChunksSent++;

      // Update statistics
      this.statistics.playbackState = this.playbackController.getState();
    }, 20); // 20ms = 50 chunks per second
  }

  /**
   * Get current pipeline statistics
   */
  getStatistics(): PipelineStatistics {
    return {
      ...this.statistics,
      jitterStats: this.jitterBuffer.getStatistics(),
      sequenceStats: this.sequencer.getStatistics(),
      playbackState: this.playbackController.getState(),
    };
  }

  /**
   * Check if pipeline is active
   */
  get active(): boolean {
    return this.isActive && this.trueVoiceClient.connected;
  }
}

