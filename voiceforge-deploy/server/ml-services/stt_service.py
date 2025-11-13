#!/usr/bin/env python3
"""
STT Service - Speech-to-Text using Whisper-large-v3-turbo

Enhanced streaming STT service with:
- Partial transcription support (streaming tokens)
- Voice Activity Detection (VAD) simulation
- Language detection
- Confidence scoring
- Timestamp alignment
- PCM16 audio chunk processing (320 samples @ 16kHz = 20ms frames)
- Realistic latency: 30-60ms per chunk

Note: Placeholder implementation. In production:
1. Install faster-whisper: pip install faster-whisper
2. Load model on GPU
3. Implement real VAD with Silero
4. Add language detection
"""

import sys
import json
import base64
import time
import random
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import struct


@dataclass
class VADSegment:
    """Voice activity detection segment"""
    start: float
    end: float
    confidence: float


@dataclass
class TranscriptSegment:
    """Transcript segment with timing"""
    text: str
    start: float
    end: float
    confidence: float
    tokens: List[str]


@dataclass
class STTResult:
    """Complete STT result"""
    text: str
    language: str
    confidence: float
    duration: float
    segments: List[TranscriptSegment]
    is_partial: bool
    vad_active: bool


class AudioBuffer:
    """Buffer for accumulating audio chunks"""
    
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.buffer: List[int] = []
        self.total_samples = 0
    
    def add_chunk(self, pcm_data: bytes):
        """Add PCM16 audio chunk to buffer"""
        # PCM16 is 2 bytes per sample, little-endian signed
        samples = struct.unpack(f'<{len(pcm_data)//2}h', pcm_data)
        self.buffer.extend(samples)
        self.total_samples += len(samples)
    
    def get_duration(self) -> float:
        """Get total duration in seconds"""
        return self.total_samples / self.sample_rate
    
    def get_rms(self) -> float:
        """Get RMS (root mean square) for VAD"""
        if not self.buffer:
            return 0.0
        sum_squares = sum(s * s for s in self.buffer)
        return (sum_squares / len(self.buffer)) ** 0.5
    
    def clear(self):
        """Clear the buffer"""
        self.buffer = []
        self.total_samples = 0


class STTService:
    """
    Enhanced STT service with streaming support
    
    Simulates realistic Whisper-like behavior:
    - Accumulates audio chunks
    - Detects voice activity
    - Returns partial transcriptions
    - Provides confidence scores and timestamps
    """
    
    def __init__(self):
        """Initialize STT service"""
        # In production:
        # from faster_whisper import WhisperModel
        # self.model = WhisperModel("large-v3-turbo", device="cuda", compute_type="float16")
        
        self.audio_buffer = AudioBuffer(sample_rate=16000)
        self.vad_threshold = 500.0  # RMS threshold for voice activity
        self.min_speech_duration = 0.3  # Minimum 300ms of speech
        self.accumulated_text = ""
        self.word_bank = [
            "hello", "world", "this", "is", "a", "test", "of", "the",
            "speech", "to", "text", "system", "working", "correctly",
            "with", "streaming", "partial", "transcriptions", "and",
            "voice", "activity", "detection", "enabled"
        ]
        
        print("[STT] Service initialized (streaming mode)", file=sys.stderr, flush=True)
    
    def process_chunk(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single audio chunk
        
        Args:
            data: Dictionary containing:
                - chunk: base64 encoded PCM16 audio
                - sequence: chunk sequence number
                - language: target language (optional)
                - return_partial: whether to return partial results
        
        Returns:
            Dictionary with STT results
        """
        start_time = time.time()
        
        # Decode audio chunk
        chunk_b64 = data.get("chunk", "")
        sequence = data.get("sequence", 0)
        language = data.get("language", "en")
        return_partial = data.get("return_partial", True)
        
        if not chunk_b64:
            return {
                "error": "No audio chunk provided"
            }
        
        # Decode PCM16 audio
        pcm_data = base64.b64decode(chunk_b64)
        
        # Add to buffer
        self.audio_buffer.add_chunk(pcm_data)
        
        # Simulate processing delay (30-60ms)
        processing_delay = random.uniform(0.03, 0.06)
        time.sleep(processing_delay)
        
        # Voice Activity Detection
        rms = self.audio_buffer.get_rms()
        vad_active = rms > self.vad_threshold
        
        # Generate partial transcription if VAD is active and buffer has enough audio
        duration = self.audio_buffer.get_duration()
        is_partial = duration < 2.0  # Consider partial until 2 seconds
        
        if vad_active and duration >= self.min_speech_duration:
            # Generate realistic partial transcription
            # Simulate tokens appearing progressively
            num_words = min(int(duration * 3), len(self.word_bank))  # ~3 words per second
            words = random.sample(self.word_bank, min(num_words, len(self.word_bank)))
            partial_text = " ".join(words)
            
            # Update accumulated text
            if len(partial_text) > len(self.accumulated_text):
                self.accumulated_text = partial_text
            
            # Create segments
            segments = []
            current_time = 0.0
            for i, word in enumerate(words):
                word_duration = len(word) * 0.08  # ~80ms per character
                segments.append({
                    "text": word,
                    "start": current_time,
                    "end": current_time + word_duration,
                    "confidence": random.uniform(0.85, 0.98),
                    "tokens": [word]
                })
                current_time += word_duration + 0.1  # 100ms pause between words
            
            # Calculate overall confidence
            confidence = sum(s["confidence"] for s in segments) / len(segments) if segments else 0.0
            
            result = {
                "text": self.accumulated_text,
                "language": language,
                "confidence": confidence,
                "duration": duration,
                "segments": segments,
                "is_partial": is_partial,
                "vad_active": vad_active,
                "sequence": sequence,
                "processing_time": time.time() - start_time
            }
        else:
            # No speech detected or buffer too short
            result = {
                "text": "",
                "language": language,
                "confidence": 0.0,
                "duration": duration,
                "segments": [],
                "is_partial": True,
                "vad_active": vad_active,
                "sequence": sequence,
                "processing_time": time.time() - start_time
            }
        
        return result
    
    def transcribe(self, audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe complete audio (non-streaming mode)
        
        Args:
            audio_bytes: Audio data (WAV format)
            language: Language code (e.g., 'en', 'es', 'fr')
        
        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()
        
        # Simulate processing delay
        time.sleep(0.1)
        
        # In production:
        # segments, info = self.model.transcribe(
        #     audio_bytes,
        #     language=language,
        #     beam_size=5,
        #     vad_filter=True
        # )
        
        # Mock transcription
        mock_segments = [
            {
                "start": 0.0,
                "end": 3.5,
                "text": "This is a placeholder transcription of the uploaded audio.",
                "confidence": 0.98,
                "tokens": ["This", "is", "a", "placeholder", "transcription"]
            }
        ]
        
        full_text = " ".join(s["text"] for s in mock_segments)
        
        return {
            "text": full_text,
            "language": language,
            "duration": 3.5,
            "confidence": 0.98,
            "segments": mock_segments,
            "is_partial": False,
            "vad_active": True,
            "processing_time": time.time() - start_time
        }
    
    def reset(self):
        """Reset the service state (for new audio stream)"""
        self.audio_buffer.clear()
        self.accumulated_text = ""


def main():
    """Main entry point for STT service"""
    service = STTService()
    
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            if request.get("type") == "process_chunk":
                # Process streaming chunk
                result = service.process_chunk(request.get("data", {}))
                response = {
                    "status": "success",
                    **result
                }
            elif request.get("type") == "transcribe":
                # Process complete audio
                audio_b64 = request.get("audio", "")
                language = request.get("language", "en")
                
                # Decode audio
                audio_bytes = base64.b64decode(audio_b64)
                
                # Transcribe
                result = service.transcribe(audio_bytes, language)
                
                response = {
                    "status": "success",
                    **result
                }
            elif request.get("type") == "reset":
                # Reset service state
                service.reset()
                response = {
                    "status": "success",
                    "message": "Service reset"
                }
            else:
                response = {
                    "status": "error",
                    "message": f"Unknown request type: {request.get('type')}"
                }
            
            print(json.dumps(response), flush=True)
            
        except Exception as e:
            error_response = {
                "status": "error",
                "message": str(e)
            }
            print(json.dumps(error_response), flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()
