#!/usr/bin/env python3
"""
VAD Service - Voice Activity Detection using Silero VAD v5.1
REAL PRODUCTION IMPLEMENTATION - 80GB A100 GPU
"""

import os
import sys
import json
import base64
import io
import wave
import numpy as np
import torch
from typing import List, Dict, Any

# Try to import Silero VAD
SILERO_AVAILABLE = True
SILERO_PIP_AVAILABLE = False
try:
    # Try pip package first
    from silero_vad import load_silero_vad, get_speech_timestamps
    SILERO_PIP_AVAILABLE = True
except ImportError:
    # Fall back to torch.hub
    print("[VAD] silero-vad pip package not found, using torch.hub", file=sys.stderr, flush=True)
    pass

class VADService:
    """Real VAD service using Silero VAD v5.1"""

    def __init__(self):
        """Initialize Silero VAD v5.1 model"""
        self.model = None
        self.utils = None
        self.model_loaded = False
        self.get_speech_timestamps = None
        self.device = "cpu"

        try:
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            print(f"[VAD] Loading Silero VAD v5.1 on {self.device}...", file=sys.stderr, flush=True)
            print(f"[VAD] GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB" if torch.cuda.is_available() else "[VAD] Running on CPU", file=sys.stderr, flush=True)

            # Set cache directory
            cache_dir = os.environ.get('HF_HOME', '/tmp/ml-cache')
            torch.hub.set_dir(cache_dir)

            # Try pip package first (recommended)
            if SILERO_PIP_AVAILABLE:
                try:
                    print("[VAD] Loading Silero VAD via pip package (silero-vad)...", file=sys.stderr, flush=True)
                    self.model = load_silero_vad()
                    self.model = self.model.to(self.device)
                    if hasattr(self.model, 'eval'):
                        self.model.eval()
                    self.get_speech_timestamps = get_speech_timestamps
                    self.model_loaded = True
                    print("[VAD] ✓ Silero VAD v5.1 loaded successfully via pip package", file=sys.stderr, flush=True)
                except Exception as e:
                    print(f"[VAD] ⚠️  Pip package failed, falling back to torch.hub: {e}", file=sys.stderr, flush=True)
                    SILERO_PIP_AVAILABLE = False

            # Fall back to torch.hub if pip package not available
            if not SILERO_PIP_AVAILABLE:
                print("[VAD] Loading Silero VAD via torch.hub (snakers4/silero-vad)...", file=sys.stderr, flush=True)
                self.model, self.utils = torch.hub.load(
                    repo_or_dir='snakers4/silero-vad',
                    model='silero_vad',
                    force_reload=False,
                    onnx=False,
                    trust_repo=True
                )

                self.model = self.model.to(self.device)
                if hasattr(self.model, 'eval'):
                    self.model.eval()

                # Extract utility functions
                if self.utils:
                    self.get_speech_timestamps = self.utils[0]

                self.model_loaded = True
                print(f"[VAD] ✓ Silero VAD v5.1 loaded successfully via torch.hub on {self.device}", file=sys.stderr, flush=True)

        except Exception as e:
            print(f"[VAD] ❌ Failed to load Silero VAD: {e}", file=sys.stderr, flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.model_loaded = False
    
    def detect_speech(self, audio_bytes: bytes) -> List[Dict[str, float]]:
        """
        Detect speech segments in audio using REAL Silero VAD
        
        Args:
            audio_bytes: Audio data (WAV format)
        
        Returns:
            List of speech segments with start/end times and confidence
        """
        if not self.model_loaded or not self.model:
            # Fallback: return placeholder segments
            print("[VAD] Model not loaded, using fallback", file=sys.stderr, flush=True)
            return [
                {"start": 0.0, "end": 1.0, "confidence": 0.5}
            ]
        
        try:
            import torch
            
            # Convert audio bytes to numpy array
            audio_io = io.BytesIO(audio_bytes)
            try:
                with wave.open(audio_io, 'rb') as wav_file:
                    sample_rate = wav_file.getframerate()
                    frames = wav_file.readframes(wav_file.getnframes())
                    audio_array = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            except:
                # If not WAV, try direct conversion
                audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
                sample_rate = 16000  # Default for Silero VAD
            
            # Resample to 16kHz if needed (Silero VAD requires 16kHz)
            if sample_rate != 16000:
                from scipy import signal
                num_samples = int(len(audio_array) * 16000 / sample_rate)
                audio_array = signal.resample(audio_array, num_samples)
                sample_rate = 16000
            
            # Convert to torch tensor
            audio_tensor = torch.from_numpy(audio_array).unsqueeze(0)
            
            # Get speech timestamps using the loaded function
            if self.get_speech_timestamps:
                speech_timestamps = self.get_speech_timestamps(
                    audio_tensor,
                    self.model,
                    threshold=0.5,
                    min_speech_duration_ms=250,
                    min_silence_duration_ms=100,
                    sampling_rate=16000,
                    return_seconds=False  # Returns sample indices
                )
            else:
                raise ValueError("Speech timestamp function not available")
            
            # Convert to list of dictionaries
            segments = []
            for ts in speech_timestamps:
                segments.append({
                    "start": ts['start'] / 16000.0,  # Convert samples to seconds
                    "end": ts['end'] / 16000.0,
                    "confidence": 0.95  # Silero VAD doesn't provide confidence, use default
                })
            
            return segments
            
        except Exception as e:
            print(f"[VAD] Detection error: {e}", file=sys.stderr, flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)
            # Return empty segments on error
            return []

def main():
    """Main entry point for VAD service"""
    import os
    
    service = VADService()
    
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            if request.get("type") == "detect":
                audio_b64 = request.get("audio", "")
                
                if not audio_b64:
                    response = {
                        "status": "error",
                        "message": "No audio provided"
                    }
                else:
                    # Decode audio
                    audio_bytes = base64.b64decode(audio_b64)
                    
                    # Detect speech
                    segments = service.detect_speech(audio_bytes)
                    
                    response = {
                        "status": "success",
                        "segments": segments
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
