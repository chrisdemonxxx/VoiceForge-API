"""
Hugging Face TTS Service using Inference API

This service uses the Hugging Face Inference API to generate speech
from text using the ai4bharat/indic-parler-tts model, which supports
21 Indian languages including Hindi, Tamil, Telugu, Malayalam, Bengali, and Urdu.

Features:
- 21 Indian languages supported
- 69 unique voices
- Emotion rendering
- Controllable attributes (pitch, speed, style)
- Prompt-based voice control

Author: VoiceForge API Team
"""

import sys
import json
import base64
import os
import requests
from typing import Dict, Any, Optional

class HuggingFaceTTSService:
    def __init__(self):
        """Initialize Hugging Face TTS service with API token"""
        self.api_token = os.environ.get("HUGGINGFACE_TOKEN")
        if not self.api_token:
            print("[HF-TTS] WARNING: HUGGINGFACE_TOKEN not found, using limited access", file=sys.stderr, flush=True)
        
        # Inference API endpoint
        self.api_url = "https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}" if self.api_token else "",
        }
        
        print("[HF-TTS] Service initialized with Hugging Face Inference API", file=sys.stderr, flush=True)
    
    def synthesize(
        self, 
        text: str, 
        voice_prompt: str = "Speaks in a clear and expressive voice",
        language: str = "Hindi"
    ) -> bytes:
        """
        Synthesize speech from text using Hugging Face Inference API
        
        Args:
            text: Text to synthesize
            voice_prompt: Natural language description of the voice
                         e.g., "Aditi speaks in a clear and expressive voice"
            language: Language of the text (Hindi, Tamil, Telugu, Malayalam, Bengali, Urdu, etc.)
        
        Returns:
            Audio data as bytes (WAV format)
        """
        try:
            # For Indic Parler TTS, we use a prompt-based approach
            # The model expects both the text and a voice description
            payload = {
                "inputs": {
                    "text": text,
                    "description": voice_prompt,
                },
            }
            
            # Make request to Hugging Face Inference API
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60  # 60 second timeout for TTS generation
            )
            
            if response.status_code == 200:
                # Return the audio bytes directly
                audio_bytes = response.content
                print(f"[HF-TTS] Successfully generated {len(audio_bytes)} bytes of audio", file=sys.stderr, flush=True)
                return audio_bytes
            
            elif response.status_code == 503:
                # Model is loading, this is common for first request
                error_msg = response.json().get("error", "Model is loading")
                print(f"[HF-TTS] Model loading (503): {error_msg}", file=sys.stderr, flush=True)
                print(f"[HF-TTS] Retrying in 5 seconds...", file=sys.stderr, flush=True)
                
                # Wait and retry once
                import time
                time.sleep(5)
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code == 200:
                    audio_bytes = response.content
                    print(f"[HF-TTS] Successfully generated {len(audio_bytes)} bytes of audio (retry)", file=sys.stderr, flush=True)
                    return audio_bytes
                else:
                    raise Exception(f"HF API error after retry: {response.status_code} - {response.text}")
            
            else:
                error_msg = response.json().get("error", response.text)
                raise Exception(f"HF API error: {response.status_code} - {error_msg}")
                
        except Exception as e:
            print(f"[HF-TTS] Error in synthesize: {str(e)}", file=sys.stderr, flush=True)
            raise

def main():
    """Main loop for processing TTS requests"""
    service = HuggingFaceTTSService()
    
    print("[HF-TTS] Ready to process requests (Indic Parler TTS)", file=sys.stderr, flush=True)
    sys.stderr.flush()
    
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            text = request.get("text", "")
            voice_prompt = request.get("voice_prompt", "Speaks in a clear and expressive voice")
            language = request.get("language", "Hindi")
            
            if not text:
                response = {
                    "status": "error",
                    "error": "No text provided"
                }
                print(json.dumps(response), flush=True)
                continue
            
            # Generate audio
            audio_bytes = service.synthesize(text, voice_prompt, language)
            
            # Encode to base64 for JSON transport
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            response = {
                "status": "success",
                "audio": audio_b64
            }
            
            print(json.dumps(response), flush=True)
            
        except Exception as e:
            response = {
                "status": "error",
                "error": str(e)
            }
            print(json.dumps(response), flush=True)
            sys.stdout.flush()

if __name__ == "__main__":
    main()
