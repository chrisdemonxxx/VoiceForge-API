/**
 * Playback Controller
 * Manages stable audio playback with adaptive speed adjustment
 * 
 * Features:
 * - Adaptive playback speed adjustment (±5%)
 * - Clock synchronization
 * - Smooth chunk transitions (crossfade)
 * - Buffer level monitoring
 * - Playback state management
 */

export interface PlaybackConfig {
  minSpeed?: number;        // Minimum playback speed (default: 0.95)
  maxSpeed?: number;        // Maximum playback speed (default: 1.05)
  baseSpeed?: number;       // Base playback speed (default: 1.0)
  bufferLowThreshold?: number;  // Buffer low threshold % (default: 0.2)
  bufferHighThreshold?: number; // Buffer high threshold % (default: 0.8)
  crossfadeDurationMs?: number; // Crossfade duration (default: 10ms)
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentSpeed: number;
  bufferLevel: number;
  lastPlaybackTime: number;
}

export class PlaybackController {
  private config: Required<PlaybackConfig>;
  private state: PlaybackState;
  private playbackStartTime: number = 0;
  private lastChunkTime: number = 0;
  private speedAdjustment: number = 0;
  private bufferLevel: number = 0; // 0.0 to 1.0

  constructor(config: PlaybackConfig = {}) {
    this.config = {
      minSpeed: config.minSpeed ?? 0.95,
      maxSpeed: config.maxSpeed ?? 1.05,
      baseSpeed: config.baseSpeed ?? 1.0,
      bufferLowThreshold: config.bufferLowThreshold ?? 0.2,
      bufferHighThreshold: config.bufferHighThreshold ?? 0.8,
      crossfadeDurationMs: config.crossfadeDurationMs ?? 10,
    };

    this.state = {
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      currentSpeed: this.config.baseSpeed,
      bufferLevel: 0,
      lastPlaybackTime: 0,
    };
  }

  /**
   * Start playback
   */
  start(): void {
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.isBuffering = false;
    this.playbackStartTime = this.getCurrentTime();
    this.lastChunkTime = this.playbackStartTime;
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.state.isPaused = true;
    this.state.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resume(): void {
    this.state.isPaused = false;
    this.state.isPlaying = true;
    this.playbackStartTime = this.getCurrentTime() - (this.lastChunkTime - this.playbackStartTime);
  }

  /**
   * Stop playback
   */
  stop(): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.isBuffering = false;
    this.state.currentSpeed = this.config.baseSpeed;
    this.speedAdjustment = 0;
  }

  /**
   * Update buffer level and adjust playback speed
   */
  updateBufferLevel(level: number): void {
    // level: 0.0 to 1.0 (0 = empty, 1 = full)
    this.bufferLevel = Math.max(0, Math.min(1, level));
    this.state.bufferLevel = this.bufferLevel;

    // Adjust playback speed based on buffer level
    if (this.bufferLevel < this.config.bufferLowThreshold) {
      // Buffer is low - slow down playback
      this.speedAdjustment = -0.02; // Slow down by 2%
      this.state.isBuffering = true;
    } else if (this.bufferLevel > this.config.bufferHighThreshold) {
      // Buffer is high - speed up playback
      this.speedAdjustment = 0.02; // Speed up by 2%
      this.state.isBuffering = false;
    } else {
      // Buffer is optimal - maintain base speed
      this.speedAdjustment = 0;
      this.state.isBuffering = false;
    }

    // Apply speed adjustment with limits
    const newSpeed = this.config.baseSpeed + this.speedAdjustment;
    this.state.currentSpeed = Math.max(
      this.config.minSpeed,
      Math.min(this.config.maxSpeed, newSpeed)
    );
  }

  /**
   * Calculate playback delay for next chunk based on current speed
   */
  calculatePlaybackDelay(chunkDurationMs: number): number {
    if (!this.state.isPlaying || this.state.isPaused) {
      return 0;
    }

    // Adjust delay based on playback speed
    const adjustedDuration = chunkDurationMs / this.state.currentSpeed;
    return adjustedDuration;
  }

  /**
   * Apply crossfade between two audio chunks
   */
  crossfadeChunks(chunk1: Buffer, chunk2: Buffer): Buffer {
    const crossfadeSamples = Math.floor((this.config.crossfadeDurationMs / 1000) * 16000); // 16kHz
    const minLength = Math.min(chunk1.length, chunk2.length, crossfadeSamples * 2);

    if (minLength === 0) {
      return Buffer.concat([chunk1, chunk2]);
    }

    const crossfaded = Buffer.alloc(minLength);

    for (let i = 0; i < minLength; i += 2) {
      const t = i / minLength;
      const fadeOut = 1 - t;
      const fadeIn = t;

      const sample1 = chunk1.readInt16LE(chunk1.length - minLength + i);
      const sample2 = chunk2.readInt16LE(i);

      const mixed = Math.round(sample1 * fadeOut + sample2 * fadeIn);
      crossfaded.writeInt16LE(mixed, i);
    }

    // Combine: end of chunk1 (faded), crossfaded section, start of chunk2 (faded), rest of chunk2
    const chunk1Start = chunk1.slice(0, chunk1.length - minLength);
    const chunk2End = chunk2.slice(minLength);

    return Buffer.concat([chunk1Start, crossfaded, chunk2End]);
  }

  /**
   * Handle packet loss by generating concealment audio
   */
  generateConcealmentAudio(lastChunk: Buffer, durationMs: number): Buffer {
    const samplesNeeded = Math.floor((durationMs / 1000) * 16000); // 16kHz
    const concealment = Buffer.alloc(samplesNeeded * 2); // PCM16

    if (lastChunk.length >= 2) {
      // Get last sample
      const lastSample = lastChunk.readInt16LE(lastChunk.length - 2);
      
      // Fade out to silence
      for (let i = 0; i < samplesNeeded; i++) {
        const fadeOut = 1 - (i / samplesNeeded);
        const fadedSample = Math.round(lastSample * fadeOut);
        concealment.writeInt16LE(fadedSample, i * 2);
      }
    } else {
      // Fill with silence
      concealment.fill(0);
    }

    return concealment;
  }

  /**
   * Get current playback state
   */
  getState(): PlaybackState {
    return { ...this.state };
  }

  /**
   * Get current time (high precision)
   */
  private getCurrentTime(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Check if playback is active
   */
  get isPlaying(): boolean {
    return this.state.isPlaying && !this.state.isPaused;
  }

  /**
   * Get current playback speed
   */
  get currentSpeed(): number {
    return this.state.currentSpeed;
  }

  /**
   * Get current buffer level
   */
  get bufferLevel(): number {
    return this.state.bufferLevel;
  }
}

