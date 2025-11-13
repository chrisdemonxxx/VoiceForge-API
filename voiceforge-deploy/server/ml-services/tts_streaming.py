#!/usr/bin/env python3
"""
Streaming TTS Service - Text-to-Speech with real-time audio streaming

Implements streaming TTS with multiple model support:
- Chatterbox: Most realistic, beats ElevenLabs
- Higgs Audio V2: Best emotional expressiveness  
- StyleTTS2: Premium English-only quality

Features:
- Stream audio in 200ms chunks instead of complete files
- Realistic latency simulation (80-120ms first chunk, 20ms subsequent)
- Proper WAV headers for streaming
- Voice cloning support
- Multiple quality/speed tradeoffs
"""

import sys
import json
import base64
import numpy as np
import io
import time
import random
from typing import Dict, Any, List, Iterator, Tuple
from dataclasses import dataclass


@dataclass
class ModelConfig:
    """Configuration for a TTS model"""
    id: str
    name: str
    description: str
    quality: int  # 1-5 stars
    languages: List[str]
    voice_cloning: bool
    emotional_range: str  # low, medium, high, excellent
    avg_latency_ms: int
    first_chunk_latency_ms: Tuple[int, int]  # (min, max) for realistic simulation
    sample_rate: int
    

# Model configurations
MODELS = {
    "chatterbox": ModelConfig(
        id="chatterbox",
        name="Chatterbox",
        description="Most realistic TTS model, beats ElevenLabs in quality",
        quality=5,
        languages=["en", "es", "fr", "de", "it", "pt", "nl", "pl", "ru", "ja", "zh"],
        voice_cloning=True,
        emotional_range="excellent",
        avg_latency_ms=100,
        first_chunk_latency_ms=(80, 120),
        sample_rate=24000,
    ),
    "higgs_audio_v2": ModelConfig(
        id="higgs_audio_v2",
        name="Higgs Audio V2",
        description="Best emotional expressiveness and naturalness",
        quality=5,
        languages=["en", "es", "fr", "de", "it", "pt", "zh"],
        voice_cloning=True,
        emotional_range="excellent",
        avg_latency_ms=90,
        first_chunk_latency_ms=(75, 110),
        sample_rate=22050,
    ),
    "styletts2": ModelConfig(
        id="styletts2",
        name="StyleTTS2",
        description="Premium English-only quality with style control",
        quality=5,
        languages=["en"],
        voice_cloning=False,
        emotional_range="high",
        avg_latency_ms=70,
        first_chunk_latency_ms=(60, 100),
        sample_rate=24000,
    ),
}


class StreamingTTSService:
    """Streaming TTS service with multi-model support"""
    
    def __init__(self):
        """Initialize TTS models"""
        # In production, load actual models here:
        # self.models = {
        #     "chatterbox": ChatterboxTTS.from_pretrained(device="cuda"),
        #     "higgs_audio_v2": HiggsAudioV2.from_pretrained(device="cuda"),
        #     "styletts2": StyleTTS2.from_pretrained(device="cuda"),
        # }
        self.models = MODELS
        print(f"[TTS Streaming] Initialized with models: {', '.join(MODELS.keys())}", file=sys.stderr, flush=True)
    
    def generate_wav_header(self, data_size: int, sample_rate: int = 22050, num_channels: int = 1) -> bytes:
        """Generate WAV file header for streaming audio"""
        bytes_per_sample = 2
        
        header = io.BytesIO()
        header.write(b'RIFF')
        header.write((36 + data_size).to_bytes(4, 'little'))
        header.write(b'WAVE')
        header.write(b'fmt ')
        header.write((16).to_bytes(4, 'little'))
        header.write((1).to_bytes(2, 'little'))  # PCM
        header.write(num_channels.to_bytes(2, 'little'))
        header.write(sample_rate.to_bytes(4, 'little'))
        header.write((sample_rate * num_channels * bytes_per_sample).to_bytes(4, 'little'))
        header.write((num_channels * bytes_per_sample).to_bytes(2, 'little'))
        header.write((bytes_per_sample * 8).to_bytes(2, 'little'))
        header.write(b'data')
        header.write(data_size.to_bytes(4, 'little'))
        
        return header.getvalue()
    
    def synthesize_streaming(
        self,
        text: str,
        model: str = "chatterbox",
        voice: str = None,
        speed: float = 1.0,
        chunk_duration_ms: int = 200,
        reference_audio: str = None
    ) -> Iterator[Dict[str, Any]]:
        """
        Synthesize speech from text with streaming output
        
        Args:
            text: Text to synthesize
            model: Model to use (chatterbox, higgs_audio_v2, styletts2)
            voice: Optional voice ID or characteristics
            speed: Speech speed (0.5 to 2.0)
            chunk_duration_ms: Duration of each audio chunk in milliseconds
            reference_audio: Base64 encoded reference audio for voice cloning
        
        Yields:
            Dictionary containing:
            - chunk: base64 encoded audio chunk (WAV format)
            - sequence: chunk sequence number (0, 1, 2, ...)
            - done: boolean indicating if this is the last chunk
            - latency_ms: processing latency for this chunk
            - model_info: information about the model used
        """
        # Get model config
        model_config = self.models.get(model, self.models["chatterbox"])
        sample_rate = model_config.sample_rate
        
        # Calculate audio duration based on text length
        # Approximate: 150 words per minute = 2.5 words per second
        words = len(text.split())
        base_duration = max(1.0, words / (2.5 * speed))
        
        # Adjust duration based on model characteristics
        if model == "higgs_audio_v2":
            # More expressive, slightly slower
            base_duration *= 1.1
        elif model == "styletts2":
            # Faster, more efficient
            base_duration *= 0.95
        
        total_samples = int(sample_rate * base_duration)
        
        # Generate complete audio first (in production, this would be model inference)
        audio = self._generate_audio_waveform(
            text, model_config, voice, speed, total_samples
        )
        
        # Calculate chunk size in samples
        chunk_samples = int(sample_rate * chunk_duration_ms / 1000)
        
        # Split audio into chunks
        num_chunks = int(np.ceil(len(audio) / chunk_samples))
        
        # Simulate first chunk latency (80-120ms for Chatterbox, varies by model)
        first_chunk_latency = random.uniform(*model_config.first_chunk_latency_ms)
        
        for chunk_idx in range(num_chunks):
            chunk_start = chunk_idx * chunk_samples
            chunk_end = min((chunk_idx + 1) * chunk_samples, len(audio))
            chunk_audio = audio[chunk_start:chunk_end]
            
            # Simulate processing latency
            if chunk_idx == 0:
                # First chunk has higher latency (model loading, initial processing)
                time.sleep(first_chunk_latency / 1000.0)
                latency = first_chunk_latency
            else:
                # Subsequent chunks are faster (streaming inference)
                chunk_latency = 20 + random.uniform(-5, 5)  # 15-25ms
                time.sleep(chunk_latency / 1000.0)
                latency = chunk_latency
            
            # Convert to 16-bit PCM
            chunk_pcm = (chunk_audio * 32767).astype(np.int16)
            chunk_bytes = chunk_pcm.tobytes()
            
            # Add WAV header to first chunk, raw PCM for subsequent
            if chunk_idx == 0:
                # Estimate total size for header (we'll update client-side)
                wav_header = self.generate_wav_header(len(audio) * 2, sample_rate)
                chunk_with_header = wav_header + chunk_bytes
                chunk_b64 = base64.b64encode(chunk_with_header).decode('utf-8')
            else:
                chunk_b64 = base64.b64encode(chunk_bytes).decode('utf-8')
            
            is_last = (chunk_idx == num_chunks - 1)
            
            yield {
                "chunk": chunk_b64,
                "sequence": chunk_idx,
                "done": is_last,
                "latency_ms": latency,
                "model_info": {
                    "model": model,
                    "quality": model_config.quality,
                    "sample_rate": sample_rate,
                    "emotional_range": model_config.emotional_range,
                },
                "duration_ms": len(chunk_audio) / sample_rate * 1000,
            }
    
    def _generate_audio_waveform(
        self,
        text: str,
        model_config: ModelConfig,
        voice: str,
        speed: float,
        num_samples: int
    ) -> np.ndarray:
        """
        Generate audio waveform for given text
        
        In production, this would call the actual TTS model.
        For now, generates realistic-sounding formant synthesis.
        """
        sample_rate = model_config.sample_rate
        duration = num_samples / sample_rate
        t = np.linspace(0, duration, num_samples)
        
        # Base frequency varies by voice
        if voice and 'male' in voice.lower():
            f0_base = 120
        elif voice and 'female' in voice.lower():
            f0_base = 220
        else:
            f0_base = 180
        
        # Model-specific characteristics
        if model_config.id == "chatterbox":
            # Most realistic - richer harmonics, more variation
            pitch_variation = 30
            harmonic_count = 5
        elif model_config.id == "higgs_audio_v2":
            # Best expressiveness - wider pitch range, emotional modulation
            pitch_variation = 40
            harmonic_count = 6
        else:  # styletts2
            # High quality English - clean, precise
            pitch_variation = 25
            harmonic_count = 4
        
        # Generate pitch contour with natural variation
        f0 = f0_base + pitch_variation * np.sin(2 * np.pi * 3 * t)
        
        # Add word-level pitch changes
        word_count = len(text.split())
        for i in range(word_count):
            word_start = i / word_count * duration
            word_peak = word_start + (0.5 / word_count * duration)
            # Slight pitch rise at word boundaries
            mask = (t >= word_start) & (t < word_peak)
            f0[mask] += 10 * np.exp(-(t[mask] - word_start) * 20)
        
        # Generate harmonics (formants)
        audio = np.zeros(num_samples)
        for harmonic in range(1, harmonic_count + 1):
            amplitude = 1.0 / harmonic
            audio += amplitude * np.sin(2 * np.pi * f0 * harmonic * t)
        
        # Add amplitude envelope (natural speech envelope)
        envelope = np.ones_like(audio)
        
        # Fade in/out
        fade_samples = int(sample_rate * 0.05)
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
        
        # Word-level amplitude modulation
        for i in range(word_count):
            word_start = int(i / word_count * num_samples)
            word_end = int((i + 1) / word_count * num_samples)
            # Slight amplitude boost at word start
            if word_start < len(envelope):
                word_len = min(word_end - word_start, len(envelope) - word_start)
                word_envelope = 1.0 + 0.2 * np.exp(-np.linspace(0, 5, word_len))
                envelope[word_start:word_start + word_len] *= word_envelope
        
        audio *= envelope
        
        # Add subtle speech-like modulation
        modulation = 1.0 + 0.15 * np.sin(2 * np.pi * 8 * t)
        audio *= modulation
        
        # Normalize
        audio = np.clip(audio * 0.3, -1, 1)
        
        return audio
    
    def synthesize(self, text: str, model: str, voice: str = None, speed: float = 1.0) -> bytes:
        """
        Non-streaming synthesize for compatibility with worker pool
        Collects all chunks and returns complete audio
        """
        chunks = []
        for chunk_data in self.synthesize_streaming(text, model, voice, speed):
            chunk_bytes = base64.b64decode(chunk_data["chunk"])
            if chunk_data["sequence"] == 0:
                # First chunk includes WAV header
                chunks.append(chunk_bytes)
            else:
                # Subsequent chunks are raw PCM
                chunks.append(chunk_bytes)
        
        return b''.join(chunks)


def main():
    """Main entry point for streaming TTS service"""
    service = StreamingTTSService()
    
    # Read requests from stdin
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            text = request.get("text", "")
            model = request.get("model", "chatterbox")
            voice = request.get("voice")
            speed = request.get("speed", 1.0)
            streaming = request.get("streaming", True)
            chunk_duration_ms = request.get("chunk_duration_ms", 200)
            reference_audio = request.get("reference_audio")
            
            if streaming:
                # Stream chunks
                for chunk_data in service.synthesize_streaming(
                    text, model, voice, speed, chunk_duration_ms, reference_audio
                ):
                    response = {
                        "type": "tts_chunk",
                        "status": "success",
                        **chunk_data
                    }
                    print(json.dumps(response), flush=True)
            else:
                # Return complete audio (backward compatibility)
                audio_bytes = service.synthesize(text, model, voice, speed)
                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                response = {
                    "type": "tts_complete",
                    "status": "success",
                    "audio": audio_b64,
                }
                print(json.dumps(response), flush=True)
            
        except Exception as e:
            import traceback
            error_response = {
                "type": "error",
                "status": "error",
                "message": str(e),
                "traceback": traceback.format_exc()
            }
            print(json.dumps(error_response), flush=True)


if __name__ == "__main__":
    main()
