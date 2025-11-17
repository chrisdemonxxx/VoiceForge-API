/**
 * Chunk Manager
 * Manages optimal audio chunk sizing and metadata
 * 
 * Features:
 * - Dynamic chunk sizing (0.1-1.0s)
 * - Network-aware sizing
 * - Chunk metadata management
 */

export interface ChunkMetadata {
  sequence: bigint;
  timestamp: number;        // High-precision timestamp (microseconds)
  duration: number;         // Audio duration in samples
  flags: {
    first: boolean;
    last: boolean;
    continuation: boolean;
    retransmit: boolean;
  };
  quality?: {
    snr?: number;
    bitrate?: number;
  };
  streamId?: string;
}

export interface ChunkManagerConfig {
  minChunkSizeMs?: number;      // Minimum chunk size (default: 100ms)
  maxChunkSizeMs?: number;       // Maximum chunk size (default: 1000ms)
  defaultChunkSizeMs?: number;   // Default chunk size (default: 500ms)
  sampleRate?: number;            // Audio sample rate (default: 16000)
  adaptiveSizing?: boolean;       // Enable adaptive sizing (default: true)
}

export class ChunkManager {
  private config: Required<ChunkManagerConfig>;
  private currentChunkSizeMs: number;
  private networkLatencyHistory: number[] = [];
  private jitterHistory: number[] = [];

  constructor(config: ChunkManagerConfig = {}) {
    this.config = {
      minChunkSizeMs: config.minChunkSizeMs ?? 100,
      maxChunkSizeMs: config.maxChunkSizeMs ?? 1000,
      defaultChunkSizeMs: config.defaultChunkSizeMs ?? 500,
      sampleRate: config.sampleRate ?? 16000,
      adaptiveSizing: config.adaptiveSizing ?? true,
    };

    this.currentChunkSizeMs = this.config.defaultChunkSizeMs;
  }

  /**
   * Calculate optimal chunk size based on network conditions
   */
  calculateOptimalChunkSize(latencyMs?: number, jitterMs?: number): number {
    if (!this.config.adaptiveSizing) {
      return this.currentChunkSizeMs;
    }

    // Track network conditions
    if (latencyMs !== undefined) {
      this.networkLatencyHistory.push(latencyMs);
      if (this.networkLatencyHistory.length > 20) {
        this.networkLatencyHistory.shift();
      }
    }

    if (jitterMs !== undefined) {
      this.jitterHistory.push(jitterMs);
      if (this.jitterHistory.length > 20) {
        this.jitterHistory.shift();
      }
    }

    // Calculate average latency and jitter
    const avgLatency = this.networkLatencyHistory.length > 0
      ? this.networkLatencyHistory.reduce((a, b) => a + b, 0) / this.networkLatencyHistory.length
      : 0;

    const avgJitter = this.jitterHistory.length > 0
      ? this.jitterHistory.reduce((a, b) => a + b, 0) / this.jitterHistory.length
      : 0;

    // Adaptive sizing logic:
    // - High latency/jitter: use smaller chunks (lower latency)
    // - Low latency/jitter: use larger chunks (better efficiency)
    let optimalSize = this.config.defaultChunkSizeMs;

    if (avgLatency > 200 || avgJitter > 100) {
      // Poor network conditions - use smaller chunks
      optimalSize = this.config.minChunkSizeMs;
    } else if (avgLatency < 50 && avgJitter < 20) {
      // Excellent network conditions - use larger chunks
      optimalSize = this.config.maxChunkSizeMs;
    } else {
      // Moderate conditions - scale between min and max
      const networkQuality = 1 - Math.min(1, (avgLatency / 200) + (avgJitter / 100));
      optimalSize = this.config.minChunkSizeMs + 
        (this.config.maxChunkSizeMs - this.config.minChunkSizeMs) * networkQuality;
    }

    // Clamp to valid range
    optimalSize = Math.max(
      this.config.minChunkSizeMs,
      Math.min(this.config.maxChunkSizeMs, optimalSize)
    );

    this.currentChunkSizeMs = optimalSize;
    return optimalSize;
  }

  /**
   * Split audio buffer into chunks of optimal size
   */
  splitIntoChunks(
    audioData: Buffer,
    metadata: Partial<ChunkMetadata> = {}
  ): Array<{ data: Buffer; metadata: ChunkMetadata }> {
    const chunkSizeSamples = Math.floor((this.currentChunkSizeMs / 1000) * this.config.sampleRate);
    const bytesPerSample = 2; // PCM16
    const chunkSizeBytes = chunkSizeSamples * bytesPerSample;

    const chunks: Array<{ data: Buffer; metadata: ChunkMetadata }> = [];
    let sequence = metadata.sequence || BigInt(0);

    for (let offset = 0; offset < audioData.length; offset += chunkSizeBytes) {
      const chunkData = audioData.slice(offset, offset + chunkSizeBytes);
      const isFirst = offset === 0;
      const isLast = offset + chunkSizeBytes >= audioData.length;
      const duration = chunkData.length / bytesPerSample;

      const chunkMetadata: ChunkMetadata = {
        sequence: sequence++,
        timestamp: metadata.timestamp || this.getHighPrecisionTimestamp(),
        duration,
        flags: {
          first: isFirst && (metadata.flags?.first ?? false),
          last: isLast && (metadata.flags?.last ?? false),
          continuation: !isFirst && !isLast,
          retransmit: metadata.flags?.retransmit ?? false,
        },
        quality: metadata.quality,
        streamId: metadata.streamId,
      };

      chunks.push({
        data: chunkData,
        metadata: chunkMetadata,
      });
    }

    return chunks;
  }

  /**
   * Get current optimal chunk size in milliseconds
   */
  getOptimalChunkSizeMs(): number {
    return this.currentChunkSizeMs;
  }

  /**
   * Get current optimal chunk size in samples
   */
  getOptimalChunkSizeSamples(): number {
    return Math.floor((this.currentChunkSizeMs / 1000) * this.config.sampleRate);
  }

  /**
   * Get current optimal chunk size in bytes (PCM16)
   */
  getOptimalChunkSizeBytes(): number {
    return this.getOptimalChunkSizeSamples() * 2; // PCM16 = 2 bytes per sample
  }

  /**
   * Update network conditions for adaptive sizing
   */
  updateNetworkConditions(latencyMs: number, jitterMs: number): void {
    this.calculateOptimalChunkSize(latencyMs, jitterMs);
  }

  /**
   * Get high-precision timestamp
   */
  private getHighPrecisionTimestamp(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now() * 1000; // Convert to microseconds
    }
    return Date.now() * 1000; // Convert to microseconds
  }

  /**
   * Reset chunk manager
   */
  reset(): void {
    this.currentChunkSizeMs = this.config.defaultChunkSizeMs;
    this.networkLatencyHistory = [];
    this.jitterHistory = [];
  }
}

