#!/usr/bin/env python3
"""
STT Service - Speech-to-Text using faster-whisper
REAL IMPLEMENTATION - No more placeholders!
"""

import os
import sys
import json
import base64
import time
import io
import wave
import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Try to import faster-whisper
try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("[STT] WARNING: faster-whisper not installed, using fallback", file=sys.stderr, flush=True)

@dataclass
class STTResult:
    """STT result structure"""
    text: str
    language: str
    confidence: float
    duration: float
    segments: List[Dict[str, Any]]

class STTService:
    """Real STT service using faster-whisper"""
    
    def __init__(self):
        """Initialize STT service with real Whisper model"""
        self.model = None
        self.model_loaded = False
        
        if WHISPER_AVAILABLE:
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                compute_type = "float16" if device == "cuda" else "int8"
                
                print(f"[STT] Loading Whisper model on {device}...", file=sys.stderr, flush=True)
                self.model = WhisperModel(
                    "large-v3",
                    device=device,
                    compute_type=compute_type,
                    download_root=os.environ.get('HF_HOME', '/tmp/ml-cache')
                )
                self.model_loaded = True
                print(f"[STT] ✓ Whisper-large-v3 loaded successfully on {device}", file=sys.stderr, flush=True)
            except Exception as e:
                print(f"[STT] ❌ Failed to load Whisper: {e}", file=sys.stderr, flush=True)
                self.model_loaded = False
        else:
            print("[STT] ❌ faster-whisper not available", file=sys.stderr, flush=True)
    
    def transcribe(self, audio_bytes: bytes, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe audio using real Whisper model
        
        Args:
            audio_bytes: Audio data (WAV format)
            language: Language code (e.g., 'en', 'es', 'fr')
        
        Returns:
            Dictionary with transcription results
        """
        start_time = time.time()
        
        if not self.model_loaded or not self.model:
            return {
                "text": "STT model not loaded. Please check faster-whisper installation.",
                "language": language,
                "confidence": 0.0,
                "duration": 0.0,
                "segments": [],
                "error": "Model not available"
            }
        
        try:
            # Convert audio bytes to numpy array
            # Handle WAV format
            audio_io = io.BytesIO(audio_bytes)
            try:
                with wave.open(audio_io, 'rb') as wav_file:
                    sample_rate = wav_file.getframerate()
                    frames = wav_file.readframes(wav_file.getnframes())
                    audio_array = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            except:
                # If not WAV, try direct numpy conversion
                audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                sample_rate = 16000  # Default
            
            # Transcribe with Whisper
            segments, info = self.model.transcribe(
                audio_array,
                language=language if language != "auto" else None,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            # Convert segments to list
            segment_list = []
            full_text_parts = []
            
            for segment in segments:
                segment_dict = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip(),
                    "confidence": getattr(segment, 'avg_logprob', 0.9) if hasattr(segment, 'avg_logprob') else 0.9
                }
                segment_list.append(segment_dict)
                full_text_parts.append(segment.text.strip())
            
            full_text = " ".join(full_text_parts)
            duration = len(audio_array) / sample_rate if sample_rate > 0 else 0.0
            avg_confidence = sum(s["confidence"] for s in segment_list) / len(segment_list) if segment_list else 0.0
            
            detected_language = info.language if hasattr(info, 'language') else language
            
            return {
                "text": full_text,
                "language": detected_language,
                "confidence": avg_confidence,
                "duration": duration,
                "segments": segment_list,
                "processing_time": time.time() - start_time
            }
            
        except Exception as e:
            print(f"[STT] Transcription error: {e}", file=sys.stderr, flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return {
                "text": "",
                "language": language,
                "confidence": 0.0,
                "duration": 0.0,
                "segments": [],
                "error": str(e),
                "processing_time": time.time() - start_time
            }

def main():
    """Main entry point for STT service"""
    import os
    
    service = STTService()
    
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            if request.get("type") == "transcribe":
                audio_b64 = request.get("audio", "")
                language = request.get("language", "en")
                
                if not audio_b64:
                    response = {
                        "status": "error",
                        "message": "No audio provided"
                    }
                else:
                    # Decode audio
                    audio_bytes = base64.b64decode(audio_b64)
                    
                    # Transcribe
                    result = service.transcribe(audio_bytes, language)
                    
                    response = {
                        "status": "success",
                        **result
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
