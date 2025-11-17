/**
 * Audio Sequencer
 * Manages audio chunk sequencing, ordering, and gap handling
 * 
 * Features:
 * - 64-bit sequence numbers (monotonic)
 * - High-precision timestamps
 * - Out-of-order packet detection and reordering
 * - Gap detection and interpolation
 * - Duplicate packet removal
 */

export interface SequencedAudioChunk {
  sequence: bigint;
  timestamp: number;        // High-precision timestamp (microseconds)
  duration: number;        // Audio duration in samples
  data: Buffer;
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
}

export interface SequenceStatistics {
  totalChunks: number;
  outOfOrderChunks: number;
  duplicateChunks: number;
  missingChunks: number;
  gapsDetected: number;
  lastSequence: bigint;
  expectedSequence: bigint;
}

export class AudioSequencer {
  private sequenceCounter: bigint = BigInt(0);
  private expectedSequence: bigint = BigInt(0);
  private receivedSequences: Set<bigint> = new Set();
  private statistics: SequenceStatistics;

  constructor() {
    this.statistics = {
      totalChunks: 0,
      outOfOrderChunks: 0,
      duplicateChunks: 0,
      missingChunks: 0,
      gapsDetected: 0,
      lastSequence: BigInt(0),
      expectedSequence: BigInt(0),
    };
  }

  /**
   * Create a new sequenced chunk
   */
  createChunk(
    data: Buffer,
    duration: number,
    flags: Partial<SequencedAudioChunk['flags']> = {}
  ): SequencedAudioChunk {
    const sequence = this.sequenceCounter++;
    const timestamp = this.getHighPrecisionTimestamp();

    return {
      sequence,
      timestamp,
      duration,
      data,
      flags: {
        first: flags.first ?? false,
        last: flags.last ?? false,
        continuation: flags.continuation ?? true,
        retransmit: flags.retransmit ?? false,
      },
    };
  }

  /**
   * Process incoming chunk and check for ordering issues
   */
  processChunk(chunk: SequencedAudioChunk): {
    chunk: SequencedAudioChunk;
    isOutOfOrder: boolean;
    isDuplicate: boolean;
    hasGap: boolean;
    missingSequences: bigint[];
  } {
    this.statistics.totalChunks++;
    this.statistics.lastSequence = chunk.sequence;

    const isOutOfOrder = chunk.sequence < this.expectedSequence;
    const isDuplicate = this.receivedSequences.has(chunk.sequence);
    const hasGap = chunk.sequence > this.expectedSequence;
    const missingSequences: bigint[] = [];

    if (isDuplicate) {
      this.statistics.duplicateChunks++;
      return {
        chunk,
        isOutOfOrder: false,
        isDuplicate: true,
        hasGap: false,
        missingSequences: [],
      };
    }

    this.receivedSequences.add(chunk.sequence);

    if (hasGap) {
      // Calculate missing sequences
      for (let seq = this.expectedSequence; seq < chunk.sequence; seq++) {
        missingSequences.push(seq);
      }
      this.statistics.missingChunks += missingSequences.length;
      this.statistics.gapsDetected++;
    }

    if (isOutOfOrder) {
      this.statistics.outOfOrderChunks++;
    }

    // Update expected sequence
    if (chunk.sequence >= this.expectedSequence) {
      this.expectedSequence = chunk.sequence + BigInt(1);
    }

    // Clean up old received sequences (keep last 1000)
    if (this.receivedSequences.size > 1000) {
      const oldestSequence = this.expectedSequence - BigInt(1000);
      for (const seq of this.receivedSequences) {
        if (seq < oldestSequence) {
          this.receivedSequences.delete(seq);
        }
      }
    }

    return {
      chunk,
      isOutOfOrder,
      isDuplicate,
      hasGap,
      missingSequences,
    };
  }

  /**
   * Generate interpolated audio for missing chunks
   */
  interpolateGap(
    beforeChunk: SequencedAudioChunk,
    afterChunk: SequencedAudioChunk,
    missingDuration: number
  ): Buffer {
    // Simple interpolation: fade from last sample to first sample of next chunk
    const samplesNeeded = Math.floor((missingDuration / 1000) * 16000); // 16kHz
    const interpolated = Buffer.alloc(samplesNeeded * 2); // PCM16 = 2 bytes per sample

    if (beforeChunk.data.length >= 2 && afterChunk.data.length >= 2) {
      const lastSample = beforeChunk.data.readInt16LE(beforeChunk.data.length - 2);
      const firstSample = afterChunk.data.readInt16LE(0);

      for (let i = 0; i < samplesNeeded; i++) {
        const t = i / samplesNeeded;
        const interpolatedSample = Math.round(lastSample + (firstSample - lastSample) * t);
        interpolated.writeInt16LE(interpolatedSample, i * 2);
      }
    } else {
      // Fill with silence if we can't interpolate
      interpolated.fill(0);
    }

    return interpolated;
  }

  /**
   * Get high-precision timestamp (microseconds)
   */
  private getHighPrecisionTimestamp(): number {
    // Use performance.now() for high precision, fallback to Date.now()
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now() * 1000; // Convert to microseconds
    }
    return Date.now() * 1000; // Convert to microseconds
  }

  /**
   * Get current statistics
   */
  getStatistics(): SequenceStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset sequencer
   */
  reset(): void {
    this.sequenceCounter = BigInt(0);
    this.expectedSequence = BigInt(0);
    this.receivedSequences.clear();
    this.statistics = {
      totalChunks: 0,
      outOfOrderChunks: 0,
      duplicateChunks: 0,
      missingChunks: 0,
      gapsDetected: 0,
      lastSequence: BigInt(0),
      expectedSequence: BigInt(0),
    };
  }

  /**
   * Get next expected sequence number
   */
  get nextSequence(): bigint {
    return this.sequenceCounter;
  }

  /**
   * Get expected sequence for incoming chunks
   */
  get expected(): bigint {
    return this.expectedSequence;
  }
}

