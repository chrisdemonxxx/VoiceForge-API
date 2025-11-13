"""
Audio Converter Service for Telephony
Handles μ-law to PCM conversion and resampling for Twilio/Zadarma audio streams
"""

import audioop
import numpy as np
import io
import wave
import json
import sys
from typing import Optional, Tuple

class AudioConverter:
    """
    Converts telephony audio formats (μ-law 8kHz) to ML pipeline format (PCM 16kHz)
    """
    
    def __init__(self):
        self.sample_rate_in = 8000  # Telephony standard
        self.sample_rate_out = 16000  # ML models standard
        print("[AudioConverter] Initialized (μ-law 8kHz → PCM 16kHz)", file=sys.stderr, flush=True)
    
    def ulaw_to_pcm(self, ulaw_data: bytes) -> bytes:
        """
        Convert μ-law encoded audio to PCM
        
        Args:
            ulaw_data: Raw μ-law encoded audio bytes
            
        Returns:
            PCM audio as bytes (16-bit signed integers)
        """
        # audioop.ulaw2lin converts μ-law to 16-bit linear PCM
        # width=2 means 16-bit output
        pcm_data = audioop.ulaw2lin(ulaw_data, 2)
        return pcm_data
    
    def resample_audio(self, pcm_data: bytes, from_rate: int, to_rate: int) -> bytes:
        """
        Resample PCM audio from one sample rate to another
        
        Args:
            pcm_data: Input PCM data (16-bit)
            from_rate: Input sample rate
            to_rate: Output sample rate
            
        Returns:
            Resampled PCM data
        """
        if from_rate == to_rate:
            return pcm_data
        
        # Convert bytes to numpy array
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        
        # Calculate resampling ratio
        ratio = to_rate / from_rate
        
        # Resample using linear interpolation
        # For production, consider using scipy.signal.resample for better quality
        num_samples_out = int(len(audio_array) * ratio)
        indices = np.linspace(0, len(audio_array) - 1, num_samples_out)
        resampled = np.interp(indices, np.arange(len(audio_array)), audio_array)
        
        # Convert back to int16 and bytes
        return resampled.astype(np.int16).tobytes()
    
    def convert_telephony_audio(self, ulaw_data: bytes) -> bytes:
        """
        Full conversion pipeline: μ-law 8kHz → PCM 16kHz
        
        Args:
            ulaw_data: Raw μ-law audio from Twilio/Zadarma
            
        Returns:
            PCM 16kHz audio ready for STT/ML processing
        """
        # Step 1: Convert μ-law to PCM (still at 8kHz)
        pcm_8k = self.ulaw_to_pcm(ulaw_data)
        
        # Step 2: Resample from 8kHz to 16kHz
        pcm_16k = self.resample_audio(pcm_8k, self.sample_rate_in, self.sample_rate_out)
        
        return pcm_16k
    
    def pcm_to_ulaw(self, pcm_data: bytes) -> bytes:
        """
        Convert PCM to μ-law for sending back to telephony provider
        
        Args:
            pcm_data: PCM audio (16-bit)
            
        Returns:
            μ-law encoded audio
        """
        # audioop.lin2ulaw converts 16-bit linear PCM to μ-law
        ulaw_data = audioop.lin2ulaw(pcm_data, 2)
        return ulaw_data
    
    def convert_for_telephony(self, pcm_16k_data: bytes) -> bytes:
        """
        Convert PCM 16kHz back to μ-law 8kHz for telephony response
        
        Args:
            pcm_16k_data: PCM audio at 16kHz
            
        Returns:
            μ-law audio at 8kHz
        """
        # Step 1: Resample from 16kHz to 8kHz
        pcm_8k = self.resample_audio(pcm_16k_data, self.sample_rate_out, self.sample_rate_in)
        
        # Step 2: Convert to μ-law
        ulaw_8k = self.pcm_to_ulaw(pcm_8k)
        
        return ulaw_8k
    
    def create_wav_header(self, data_size: int, sample_rate: int = 16000, channels: int = 1) -> bytes:
        """
        Create WAV file header for PCM data
        
        Args:
            data_size: Size of audio data in bytes
            sample_rate: Sample rate (default 16kHz)
            channels: Number of channels (default mono)
            
        Returns:
            WAV header bytes
        """
        byte_rate = sample_rate * channels * 2  # 16-bit = 2 bytes
        block_align = channels * 2
        
        header = io.BytesIO()
        header.write(b'RIFF')
        header.write((36 + data_size).to_bytes(4, 'little'))
        header.write(b'WAVE')
        header.write(b'fmt ')
        header.write((16).to_bytes(4, 'little'))  # fmt chunk size
        header.write((1).to_bytes(2, 'little'))   # PCM format
        header.write(channels.to_bytes(2, 'little'))
        header.write(sample_rate.to_bytes(4, 'little'))
        header.write(byte_rate.to_bytes(4, 'little'))
        header.write(block_align.to_bytes(2, 'little'))
        header.write((16).to_bytes(2, 'little'))  # bits per sample
        header.write(b'data')
        header.write(data_size.to_bytes(4, 'little'))
        
        return header.getvalue()
    
    def convert_to_wav(self, pcm_data: bytes, sample_rate: int = 16000) -> bytes:
        """
        Convert PCM data to complete WAV file
        
        Args:
            pcm_data: Raw PCM audio data
            sample_rate: Sample rate
            
        Returns:
            Complete WAV file as bytes
        """
        header = self.create_wav_header(len(pcm_data), sample_rate)
        return header + pcm_data


def main():
    """
    Standalone audio conversion service
    Reads JSON requests from stdin, outputs JSON responses
    """
    converter = AudioConverter()
    print("[AudioConverter] Service started, waiting for tasks...", file=sys.stderr, flush=True)
    
    for line in sys.stdin:
        try:
            task = json.loads(line.strip())
            action = task.get('action')
            
            if action == 'convert_telephony':
                # Convert μ-law 8kHz → PCM 16kHz
                ulaw_hex = task.get('audio_data')
                if not ulaw_hex:
                    result = {'success': False, 'error': 'Missing audio_data'}
                else:
                    ulaw_bytes = bytes.fromhex(ulaw_hex)
                    pcm_16k = converter.convert_telephony_audio(ulaw_bytes)
                    
                    result = {
                        'success': True,
                        'pcm_data': pcm_16k.hex(),
                        'sample_rate': 16000,
                        'format': 'pcm_s16le'
                    }
            
            elif action == 'convert_for_telephony':
                # Convert PCM 16kHz → μ-law 8kHz
                pcm_hex = task.get('audio_data')
                if not pcm_hex:
                    result = {'success': False, 'error': 'Missing audio_data'}
                else:
                    pcm_bytes = bytes.fromhex(pcm_hex)
                    ulaw_8k = converter.convert_for_telephony(pcm_bytes)
                    
                    result = {
                        'success': True,
                        'ulaw_data': ulaw_8k.hex(),
                        'sample_rate': 8000,
                        'format': 'ulaw'
                    }
            
            elif action == 'health':
                result = {'success': True, 'status': 'healthy'}
            
            else:
                result = {'success': False, 'error': f'Unknown action: {action}'}
            
            print(json.dumps(result), flush=True)
            
        except Exception as e:
            error_result = {'success': False, 'error': str(e)}
            print(json.dumps(error_result), flush=True)


if __name__ == "__main__":
    main()
