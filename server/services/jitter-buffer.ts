/**
 * Adaptive Jitter Buffer
 * Manages audio buffering to handle network jitter and ensure smooth playback
 * 
 * Features:
 * - Dynamic buffer size: 20ms (min) to 500ms (max), target 50-200ms
 * - Jitter measurement and statistics
 * - Automatic buffer size adaptation
 * - Buffer underrun/overrun handling
 */

export interface JitterBufferConfig {
  minBufferMs?: number;      // Minimum buffer size (default: 20ms)
  maxBufferMs?: number;      // Maximum buffer size (default: 500ms)
  targetBufferMs?: number;   // Target buffer size (default: 100ms)
  adaptationIntervalMs?: number; // How often to adapt (default: 100ms)
}

export interface AudioChunk {
  data: Buffer;
  sequence: number;
  timestamp: number;
  receivedAt: number;
}

export interface JitterStatistics {
  currentBufferMs: number;
  targetBufferMs: number;
  jitterMs: number;
  packetLoss: number;
  bufferUnderruns: number;
  bufferOverruns: number;
  totalPackets: number;
  outOfOrderPackets: number;
}

export class JitterBuffer {
  private buffer: AudioChunk[] = [];
  private config: Required<JitterBufferConfig>;
  private lastAdaptationTime = 0;
  private arrivalTimes: number[] = [];
  private statistics: JitterStatistics;
  private expectedSequence = 0;

  constructor(config: JitterBufferConfig = {}) {
    this.config = {
      minBufferMs: config.minBufferMs ?? 20,
      maxBufferMs: config.maxBufferMs ?? 500,
      targetBufferMs: config.targetBufferMs ?? 100,
      adaptationIntervalMs: config.adaptationIntervalMs ?? 100,
    };

    this.statistics = {
      currentBufferMs: 0,
      targetBufferMs: this.config.targetBufferMs,
      jitterMs: 0,
      packetLoss: 0,
      bufferUnderruns: 0,
      bufferOverruns: 0,
      totalPackets: 0,
      outOfOrderPackets: 0,
    };
  }

  /**
   * Add audio chunk to buffer
   */
  addChunk(chunk: AudioChunk): void {
    this.statistics.totalPackets++;

    // Track arrival time for jitter calculation
    const now = Date.now();
    if (this.arrivalTimes.length > 0) {
      const interArrivalTime = now - this.arrivalTimes[this.arrivalTimes.length - 1];
      this.arrivalTimes.push(interArrivalTime);
      
      // Keep only last 50 measurements
      if (this.arrivalTimes.length > 50) {
        this.arrivalTimes.shift();
      }
    } else {
      this.arrivalTimes.push(0);
    }

    chunk.receivedAt = now;

    // Check for out-of-order packets
    if (chunk.sequence < this.expectedSequence) {
      this.statistics.outOfOrderPackets++;
      // Insert in correct position
      this.insertChunkInOrder(chunk);
    } else if (chunk.sequence === this.expectedSequence) {
      this.buffer.push(chunk);
      this.expectedSequence = chunk.sequence + 1;
    } else {
      // Missing packets detected
      const missing = chunk.sequence - this.expectedSequence;
      this.statistics.packetLoss += missing;
      this.buffer.push(chunk);
      this.expectedSequence = chunk.sequence + 1;
    }

    // Check for buffer overrun
    const currentBufferMs = this.getCurrentBufferMs();
    if (currentBufferMs > this.config.maxBufferMs) {
      this.statistics.bufferOverruns++;
      // Drop oldest chunks to prevent overflow
      this.dropOldestChunks(currentBufferMs - this.config.maxBufferMs);
    }

    // Adapt buffer size periodically
    this.adaptBufferSize();
  }

  /**
   * Insert chunk in correct sequence order
   */
  private insertChunkInOrder(chunk: AudioChunk): void {
    let insertIndex = this.buffer.length;
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i].sequence > chunk.sequence) {
        insertIndex = i;
        break;
      }
    }
    this.buffer.splice(insertIndex, 0, chunk);
  }

  /**
   * Get next audio chunk for playback (if buffer is ready)
   */
  getNextChunk(): AudioChunk | null {
    const currentBufferMs = this.getCurrentBufferMs();

    // Check for buffer underrun
    if (currentBufferMs < this.config.minBufferMs) {
      this.statistics.bufferUnderruns++;
      return null; // Not enough data, wait for more
    }

    // Check if we have enough data for target buffer
    if (currentBufferMs < this.statistics.targetBufferMs) {
      return null; // Wait for target buffer level
    }

    // Return oldest chunk
    const chunk = this.buffer.shift();
    if (chunk) {
      this.statistics.currentBufferMs = this.getCurrentBufferMs();
    }
    return chunk || null;
  }

  /**
   * Peek at next chunk without removing it
   */
  peekNextChunk(): AudioChunk | null {
    return this.buffer.length > 0 ? this.buffer[0] : null;
  }

  /**
   * Calculate current buffer size in milliseconds
   */
  private getCurrentBufferMs(): number {
    if (this.buffer.length === 0) {
      return 0;
    }

    // Estimate based on number of chunks and typical chunk duration
    // Assuming 20ms chunks (typical for real-time audio)
    const estimatedChunkDurationMs = 20;
    return this.buffer.length * estimatedChunkDurationMs;
  }

  /**
   * Calculate jitter from inter-arrival times
   */
  private calculateJitter(): number {
    if (this.arrivalTimes.length < 2) {
      return 0;
    }

    // Calculate mean inter-arrival time
    const mean = this.arrivalTimes.reduce((a, b) => a + b, 0) / this.arrivalTimes.length;
    
    // Calculate variance
    const variance = this.arrivalTimes.reduce((sum, time) => {
      return sum + Math.pow(time - mean, 2);
    }, 0) / this.arrivalTimes.length;

    // Jitter is the standard deviation
    return Math.sqrt(variance);
  }

  /**
   * Adapt buffer size based on jitter measurements
   */
  private adaptBufferSize(): void {
    const now = Date.now();
    if (now - this.lastAdaptationTime < this.config.adaptationIntervalMs) {
      return;
    }

    this.lastAdaptationTime = now;

    // Calculate current jitter
    const jitterMs = this.calculateJitter();
    this.statistics.jitterMs = jitterMs;

    // Adapt target buffer size based on jitter
    // Formula: target = base + (jitter * multiplier)
    const baseBuffer = this.config.minBufferMs;
    const multiplier = 2.0; // Adjust this based on testing
    const newTarget = Math.min(
      this.config.maxBufferMs,
      Math.max(
        this.config.minBufferMs,
        baseBuffer + (jitterMs * multiplier)
      )
    );

    this.statistics.targetBufferMs = newTarget;
  }

  /**
   * Drop oldest chunks to reduce buffer size
   */
  private dropOldestChunks(targetReductionMs: number): void {
    const chunksToDrop = Math.ceil(targetReductionMs / 20); // Assuming 20ms chunks
    for (let i = 0; i < chunksToDrop && this.buffer.length > 0; i++) {
      this.buffer.shift();
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): JitterStatistics {
    return {
      ...this.statistics,
      currentBufferMs: this.getCurrentBufferMs(),
    };
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.arrivalTimes = [];
    this.expectedSequence = 0;
    this.statistics.currentBufferMs = 0;
  }

  /**
   * Get buffer size (number of chunks)
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Check if buffer is ready for playback
   */
  get isReady(): boolean {
    return this.getCurrentBufferMs() >= this.statistics.targetBufferMs;
  }
}

