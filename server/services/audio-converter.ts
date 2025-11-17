/**
 * Audio Format Converter
 * Converts between telephony formats (μ-law 8kHz) and ML formats (PCM16 16kHz)
 * 
 * Telephony providers (Twilio, Zadarma) use μ-law encoding at 8kHz
 * TrueVoiceStreaming API uses PCM16 at 16kHz
 */

export interface AudioConversionResult {
  data: Buffer;
  sampleRate: number;
  format: 'pcm16' | 'ulaw';
}

/**
 * Convert μ-law 8kHz audio to PCM16 16kHz
 * Used for converting telephony audio to ML processing format
 */
export function convertUlawToPcm16(ulawData: Buffer): Buffer {
  // μ-law to linear PCM conversion
  const pcm8k = Buffer.alloc(ulawData.length * 2);
  
  for (let i = 0; i < ulawData.length; i++) {
    const ulawByte = ulawData[i];
    // μ-law decoding formula
    const sign = (ulawByte & 0x80) ? -1 : 1;
    const exponent = (ulawByte & 0x70) >> 4;
    const mantissa = (ulawByte & 0x0F) | 0x10;
    const linear = sign * ((mantissa << (exponent + 3)) - 0x84);
    
    // Convert to 16-bit PCM
    const pcm16 = Math.max(-32768, Math.min(32767, linear * 256));
    pcm8k.writeInt16LE(pcm16, i * 2);
  }
  
  // Resample from 8kHz to 16kHz using linear interpolation
  const pcm16k = resample8kTo16k(pcm8k);
  
  return pcm16k;
}

/**
 * Convert PCM16 16kHz audio to μ-law 8kHz
 * Used for converting ML output back to telephony format
 */
export function convertPcm16ToUlaw(pcm16Data: Buffer): Buffer {
  // Resample from 16kHz to 8kHz using linear interpolation
  const pcm8k = resample16kTo8k(pcm16Data);
  
  // Linear PCM to μ-law conversion
  const ulaw = Buffer.alloc(pcm8k.length / 2);
  
  for (let i = 0; i < pcm8k.length; i += 2) {
    const pcm16 = pcm8k.readInt16LE(i);
    const linear = Math.max(-32768, Math.min(32767, pcm16));
    
    // μ-law encoding formula
    const sign = (linear < 0) ? 0x80 : 0x00;
    const abs = Math.abs(linear);
    const exponent = Math.floor(Math.log2((abs >> 7) + 1));
    const mantissa = (abs >> (exponent + 3)) & 0x0F;
    const ulawByte = sign | (exponent << 4) | mantissa;
    
    ulaw[i / 2] = ulawByte;
  }
  
  return ulaw;
}

/**
 * Resample PCM16 audio from 8kHz to 16kHz using linear interpolation
 */
function resample8kTo16k(pcm8k: Buffer): Buffer {
  const inputSamples = pcm8k.length / 2;
  const outputSamples = inputSamples * 2;
  const pcm16k = Buffer.alloc(outputSamples * 2);
  
  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i / 2;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputSamples - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    const sample1 = pcm8k.readInt16LE(srcIndexFloor * 2);
    const sample2 = pcm8k.readInt16LE(srcIndexCeil * 2);
    const interpolated = Math.round(sample1 + (sample2 - sample1) * fraction);
    
    pcm16k.writeInt16LE(interpolated, i * 2);
  }
  
  return pcm16k;
}

/**
 * Resample PCM16 audio from 16kHz to 8kHz using linear interpolation
 */
function resample16kTo8k(pcm16k: Buffer): Buffer {
  const inputSamples = pcm16k.length / 2;
  const outputSamples = Math.floor(inputSamples / 2);
  const pcm8k = Buffer.alloc(outputSamples * 2);
  
  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * 2;
    const sample = pcm16k.readInt16LE(srcIndex * 2);
    pcm8k.writeInt16LE(sample, i * 2);
  }
  
  return pcm8k;
}

/**
 * Validate audio format
 */
export function validateAudioFormat(data: Buffer, expectedFormat: 'pcm16' | 'ulaw', sampleRate: number): boolean {
  if (expectedFormat === 'pcm16') {
    // PCM16 should be even length (16-bit = 2 bytes per sample)
    return data.length % 2 === 0;
  } else if (expectedFormat === 'ulaw') {
    // μ-law is 1 byte per sample
    return data.length > 0;
  }
  return false;
}

/**
 * Get audio duration in milliseconds
 */
export function getAudioDurationMs(data: Buffer, sampleRate: number, format: 'pcm16' | 'ulaw'): number {
  const bytesPerSample = format === 'pcm16' ? 2 : 1;
  const samples = data.length / bytesPerSample;
  return (samples / sampleRate) * 1000;
}

