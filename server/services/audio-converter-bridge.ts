/**
 * Audio Converter Bridge
 * TypeScript bridge to Python audio conversion service
 * Handles μ-law ↔ PCM conversion and resampling for telephony
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

interface ConversionResult {
  success: boolean;
  pcm_data?: string;
  ulaw_data?: string;
  sample_rate?: number;
  format?: string;
  error?: string;
}

export class AudioConverterBridge {
  private process: ChildProcess | null = null;
  private responseQueue: Map<number, (result: ConversionResult) => void> = new Map();
  private requestId = 0;
  private isReady = false;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('python3', [
        'server/ml-services/audio_converter.py'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initBuffer = '';

      this.process.stderr?.on('data', (data) => {
        initBuffer += data.toString();
        if (initBuffer.includes('Service started')) {
          this.isReady = true;
          console.log('[AudioConverter] Python service initialized');
          resolve();
        }
      });

      this.process.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            // In standalone mode, responses don't have IDs, but we process them sequentially
            const handler = Array.from(this.responseQueue.values())[0];
            if (handler) {
              const key = Array.from(this.responseQueue.keys())[0];
              this.responseQueue.delete(key!);
              handler(response);
            }
          } catch (error) {
            console.error('[AudioConverter] Failed to parse response:', error);
          }
        }
      });

      this.process.on('error', (error) => {
        console.error('[AudioConverter] Process error:', error);
        reject(error);
      });

      this.process.on('exit', (code) => {
        console.log(`[AudioConverter] Process exited with code ${code}`);
        this.isReady = false;
      });

      // Timeout initialization after 10 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Audio converter initialization timeout'));
        }
      }, 10000);
    });
  }

  private async sendRequest(request: any): Promise<ConversionResult> {
    if (!this.isReady || !this.process || !this.process.stdin) {
      throw new Error('Audio converter not ready');
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      
      this.responseQueue.set(id, resolve);

      try {
        this.process!.stdin!.write(JSON.stringify(request) + '\n');
      } catch (error) {
        this.responseQueue.delete(id);
        reject(error);
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.responseQueue.has(id)) {
          this.responseQueue.delete(id);
          reject(new Error('Audio conversion timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Convert telephony audio (μ-law 8kHz) to ML format (PCM 16kHz)
   */
  async convertTelephonyToML(ulawData: Buffer): Promise<Buffer> {
    const result = await this.sendRequest({
      action: 'convert_telephony',
      audio_data: ulawData.toString('hex')
    });

    if (!result.success || !result.pcm_data) {
      throw new Error(result.error || 'Conversion failed');
    }

    return Buffer.from(result.pcm_data, 'hex');
  }

  /**
   * Convert ML output (PCM 16kHz) to telephony format (μ-law 8kHz)
   */
  async convertMLToTelephony(pcmData: Buffer): Promise<Buffer> {
    const result = await this.sendRequest({
      action: 'convert_for_telephony',
      audio_data: pcmData.toString('hex')
    });

    if (!result.success || !result.ulaw_data) {
      throw new Error(result.error || 'Conversion failed');
    }

    return Buffer.from(result.ulaw_data, 'hex');
  }

  /**
   * Health check
   */
  async health(): Promise<boolean> {
    try {
      const result = await this.sendRequest({ action: 'health' });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
let audioConverterInstance: AudioConverterBridge | null = null;

export async function getAudioConverter(): Promise<AudioConverterBridge> {
  if (!audioConverterInstance) {
    audioConverterInstance = new AudioConverterBridge();
    await audioConverterInstance.initialize();
  }
  return audioConverterInstance;
}
