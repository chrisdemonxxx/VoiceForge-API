/**
 * Pause Manager
 * Manages context-aware pause insertion for natural speech
 * 
 * Features:
 * - Punctuation-based pauses
 * - Sentence boundary pauses
 * - Emphasis pauses
 * - Adaptive pause duration
 */

export interface PauseConfig {
  sentencePauseMs?: number;      // Pause after sentence (default: 300-500ms)
  commaPauseMs?: number;        // Pause after comma (default: 100-200ms)
  periodPauseMs?: number;        // Pause after period (default: 400-600ms)
  questionPauseMs?: number;      // Pause after question (default: 500-700ms)
  emphasisPauseMs?: number;     // Pause for emphasis (default: 150-250ms)
  adaptiveDuration?: boolean;   // Adaptive pause duration (default: true)
  speechRate?: number;          // Speech rate multiplier (default: 1.0)
}

export interface PausePoint {
  position: number;  // Position in text (character index)
  duration: number; // Pause duration in milliseconds
  type: 'sentence' | 'comma' | 'period' | 'question' | 'emphasis' | 'natural';
}

export class PauseManager {
  private config: Required<PauseConfig>;

  constructor(config: PauseConfig = {}) {
    this.config = {
      sentencePauseMs: config.sentencePauseMs ?? 400,
      commaPauseMs: config.commaPauseMs ?? 150,
      periodPauseMs: config.periodPauseMs ?? 500,
      questionPauseMs: config.questionPauseMs ?? 600,
      emphasisPauseMs: config.emphasisPauseMs ?? 200,
      adaptiveDuration: config.adaptiveDuration ?? true,
      speechRate: config.speechRate ?? 1.0,
    };
  }

  /**
   * Analyze text and identify pause points
   */
  analyzePauses(text: string): PausePoint[] {
    const pauses: PausePoint[] = [];
    let position = 0;

    // Sentence endings
    const sentenceEndings = /([.!?]+)/g;
    let match;
    while ((match = sentenceEndings.exec(text)) !== null) {
      const pauseType = match[0].includes('?') ? 'question' : 
                       match[0].includes('!') ? 'emphasis' : 'period';
      const duration = this.getPauseDuration(pauseType);
      
      pauses.push({
        position: match.index + match[0].length,
        duration,
        type: pauseType === 'question' ? 'question' : 
              pauseType === 'emphasis' ? 'emphasis' : 'period',
      });
    }

    // Commas
    const commas = /,/g;
    while ((match = commas.exec(text)) !== null) {
      pauses.push({
        position: match.index + 1,
        duration: this.getPauseDuration('comma'),
        type: 'comma',
      });
    }

    // Sort by position
    pauses.sort((a, b) => a.position - b.position);

    return pauses;
  }

  /**
   * Insert pauses into audio buffer
   */
  insertPauses(
    audioChunks: Buffer[],
    pausePoints: PausePoint[],
    samplesPerChar: number // Approximate samples per character
  ): Buffer[] {
    if (pausePoints.length === 0) {
      return audioChunks;
    }

    const result: Buffer[] = [];
    let currentPosition = 0;
    let chunkIndex = 0;

    for (const pause of pausePoints) {
      // Add chunks up to pause point
      while (chunkIndex < audioChunks.length && 
             currentPosition < pause.position * samplesPerChar) {
        result.push(audioChunks[chunkIndex]);
        currentPosition += audioChunks[chunkIndex].length / 2; // PCM16 = 2 bytes per sample
        chunkIndex++;
      }

      // Insert pause (silence)
      const pauseSamples = Math.floor((pause.duration / 1000) * 16000); // 16kHz
      const pauseBuffer = Buffer.alloc(pauseSamples * 2); // PCM16
      pauseBuffer.fill(0); // Silence
      result.push(pauseBuffer);
    }

    // Add remaining chunks
    while (chunkIndex < audioChunks.length) {
      result.push(audioChunks[chunkIndex++]);
    }

    return result;
  }

  /**
   * Get pause duration for type
   */
  private getPauseDuration(type: PausePoint['type']): number {
    let baseDuration: number;

    switch (type) {
      case 'sentence':
      case 'period':
        baseDuration = this.config.periodPauseMs;
        break;
      case 'question':
        baseDuration = this.config.questionPauseMs;
        break;
      case 'comma':
        baseDuration = this.config.commaPauseMs;
        break;
      case 'emphasis':
        baseDuration = this.config.emphasisPauseMs;
        break;
      case 'natural':
      default:
        baseDuration = this.config.sentencePauseMs;
    }

    // Apply speech rate
    let duration = baseDuration / this.config.speechRate;

    // Add variation if adaptive
    if (this.config.adaptiveDuration) {
      const variation = duration * 0.2; // ±20% variation
      duration += (Math.random() * 2 - 1) * variation;
    }

    return Math.max(50, duration); // Minimum 50ms
  }

  /**
   * Generate silence buffer for pause
   */
  generatePause(durationMs: number): Buffer {
    const samples = Math.floor((durationMs / 1000) * 16000); // 16kHz
    const pause = Buffer.alloc(samples * 2); // PCM16
    pause.fill(0); // Silence
    return pause;
  }

  /**
   * Update speech rate
   */
  setSpeechRate(rate: number): void {
    this.config.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Get current speech rate
   */
  getSpeechRate(): number {
    return this.config.speechRate;
  }
}

