/**
 * Breathing Generator
 * Generates natural breathing sounds for realistic speech
 * 
 * Features:
 * - Natural breathing at pause points
 * - Varying intensity and duration
 * - Different breathing types (normal, deep, quick, sigh)
 */

export interface BreathingConfig {
  enabled?: boolean;
  intensity?: number;      // 0.0 to 1.0 (default: 0.3)
  minDurationMs?: number;  // Minimum breathing duration (default: 100ms)
  maxDurationMs?: number;  // Maximum breathing duration (default: 300ms)
  sampleRate?: number;     // Audio sample rate (default: 16000)
}

export type BreathingType = 'normal' | 'deep' | 'quick' | 'sigh';

export class BreathingGenerator {
  private config: Required<BreathingConfig>;

  constructor(config: BreathingConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      intensity: config.intensity ?? 0.3,
      minDurationMs: config.minDurationMs ?? 100,
      maxDurationMs: config.maxDurationMs ?? 300,
      sampleRate: config.sampleRate ?? 16000,
    };
  }

  /**
   * Generate breathing sound
   */
  generateBreathing(
    type: BreathingType = 'normal',
    durationMs?: number
  ): Buffer {
    if (!this.config.enabled) {
      return Buffer.alloc(0);
    }

    const actualDuration = durationMs || this.getDurationForType(type);
    const samples = Math.floor((actualDuration / 1000) * this.config.sampleRate);
    const breathing = Buffer.alloc(samples * 2); // PCM16

    const intensity = this.getIntensityForType(type);
    const frequency = this.getFrequencyForType(type);

    // Generate breathing waveform (noise with low-pass filter effect)
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      
      // Breathing envelope (fade in, hold, fade out)
      let envelope: number;
      if (t < 0.2) {
        envelope = t / 0.2; // Fade in
      } else if (t > 0.8) {
        envelope = (1 - t) / 0.2; // Fade out
      } else {
        envelope = 1.0; // Hold
      }

      // Generate noise-like breathing sound
      const noise = (Math.random() * 2 - 1) * intensity;
      const tone = Math.sin(2 * Math.PI * frequency * i / this.config.sampleRate) * 0.1;
      const sample = (noise + tone) * envelope;

      // Convert to 16-bit PCM
      const pcm16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      breathing.writeInt16LE(pcm16, i * 2);
    }

    return breathing;
  }

  /**
   * Get duration for breathing type
   */
  private getDurationForType(type: BreathingType): number {
    switch (type) {
      case 'quick':
        return this.config.minDurationMs;
      case 'deep':
        return this.config.maxDurationMs;
      case 'sigh':
        return this.config.maxDurationMs * 1.5;
      case 'normal':
      default:
        return (this.config.minDurationMs + this.config.maxDurationMs) / 2;
    }
  }

  /**
   * Get intensity for breathing type
   */
  private getIntensityForType(type: BreathingType): number {
    switch (type) {
      case 'deep':
        return this.config.intensity * 1.5;
      case 'quick':
        return this.config.intensity * 0.7;
      case 'sigh':
        return this.config.intensity * 1.2;
      case 'normal':
      default:
        return this.config.intensity;
    }
  }

  /**
   * Get frequency for breathing type
   */
  private getFrequencyForType(type: BreathingType): number {
    switch (type) {
      case 'deep':
        return 50; // Lower frequency
      case 'quick':
        return 150; // Higher frequency
      case 'sigh':
        return 80; // Medium-low frequency
      case 'normal':
      default:
        return 100; // Standard frequency
    }
  }

  /**
   * Check if breathing should be inserted at this point
   */
  shouldInsertBreathing(
    sentenceLength: number,
    isSentenceEnd: boolean,
    isLongPause: boolean
  ): { shouldInsert: boolean; type: BreathingType } {
    if (!this.config.enabled) {
      return { shouldInsert: false, type: 'normal' };
    }

    // Insert breathing after long sentences (>15 words)
    if (isSentenceEnd && sentenceLength > 15) {
      return { shouldInsert: true, type: 'normal' };
    }

    // Insert deep breath before very long sentences (>25 words)
    if (!isSentenceEnd && sentenceLength > 25) {
      return { shouldInsert: true, type: 'deep' };
    }

    // Insert breathing at long pauses
    if (isLongPause) {
      return { shouldInsert: true, type: 'normal' };
    }

    return { shouldInsert: false, type: 'normal' };
  }
}

