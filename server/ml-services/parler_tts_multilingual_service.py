#!/usr/bin/env python3
"""
Parler-TTS Mini Multilingual Service for T1 Country Voices
Supports: English, French, Spanish, Portuguese, Polish, German, Italian, Dutch
Uses Hugging Face Inference API for realistic voice generation
"""

import sys
import json
import os
import base64
import requests
from typing import Dict, Any, Optional

# Hugging Face API configuration
HF_API_TOKEN = os.environ.get('HUGGINGFACE_TOKEN', '')
HF_API_URL = "https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-multilingual"

def log(message: str):
    """Log to stderr"""
    print(f"[Parler-TTS-Multi] {message}", file=sys.stderr, flush=True)

def synthesize_speech(text: str, voice_prompt: str) -> Dict[str, Any]:
    """
    Generate speech using Parler-TTS Mini Multilingual via HF Inference API
    
    Args:
        text: Text to synthesize
        voice_prompt: Natural language description of voice (e.g., "A female speaker with expressive speech")
    
    Returns:
        Dictionary with audio data and metadata
    """
    try:
        if not HF_API_TOKEN:
            log("Warning: HUGGINGFACE_TOKEN not set, using public API (may have rate limits)")
        
        log(f"Generating speech for text: '{text[:50]}...' with voice prompt: '{voice_prompt[:50]}...'")
        
        headers = {}
        if HF_API_TOKEN:
            headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
        
        # Parler-TTS Mini Multilingual API expects JSON input
        payload = {
            "inputs": {
                "text": text,
                "description": voice_prompt
            }
        }
        
        log("Sending request to Hugging Face Inference API...")
        response = requests.post(
            HF_API_URL,
            headers=headers,
            json=payload,
            timeout=60
        )
        
        # Check for model loading error (503)
        if response.status_code == 503:
            error_msg = "Model is currently loading. Please try again in a few seconds."
            log(f"503 Error: {error_msg}")
            return {
                "error": True,
                "message": error_msg,
                "status_code": 503
            }
        
        # Check for other errors
        if response.status_code != 200:
            error_msg = f"HF API error: {response.status_code} - {response.text}"
            log(f"Error: {error_msg}")
            return {
                "error": True,
                "message": error_msg,
                "status_code": response.status_code
            }
        
        # HF Inference API returns audio bytes directly
        audio_bytes = response.content
        
        if len(audio_bytes) < 100:
            error_msg = "Received invalid audio data from API"
            log(f"Error: {error_msg}")
            return {
                "error": True,
                "message": error_msg
            }
        
        log(f"Successfully generated {len(audio_bytes)} bytes of audio")
        
        # Return audio data as base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {
            "success": True,
            "audio": audio_base64,
            "format": "wav",
            "sample_rate": 44100,  # Parler-TTS default
            "duration_estimate": len(text) / 15  # Rough estimate: ~15 chars/second
        }
        
    except requests.exceptions.Timeout:
        error_msg = "Request timed out. The model might be loading."
        log(f"Timeout error: {error_msg}")
        return {
            "error": True,
            "message": error_msg,
            "status_code": 503
        }
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        log(f"Exception: {error_msg}")
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "error": True,
            "message": error_msg
        }

def main():
    """Main service loop"""
    log("Parler-TTS Mini Multilingual service started")
    log(f"Hugging Face token: {'[SET]' if HF_API_TOKEN else '[NOT SET]'}")
    
    while True:
        try:
            # Read request from stdin
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line)
            command = request.get('command')
            
            if command == 'synthesize':
                text = request.get('text', '')
                voice_prompt = request.get('voice_prompt', 'A clear and natural voice')
                
                if not text:
                    result = {
                        "error": True,
                        "message": "No text provided"
                    }
                else:
                    result = synthesize_speech(text, voice_prompt)
                
                # Send response
                print(json.dumps(result), flush=True)
            
            elif command == 'ping':
                print(json.dumps({"status": "ok"}), flush=True)
            
            else:
                print(json.dumps({
                    "error": True,
                    "message": f"Unknown command: {command}"
                }), flush=True)
                
        except json.JSONDecodeError as e:
            log(f"JSON decode error: {e}")
            print(json.dumps({
                "error": True,
                "message": "Invalid JSON request"
            }), flush=True)
        except Exception as e:
            log(f"Error in main loop: {e}")
            import traceback
            traceback.print_exc(file=sys.stderr)
            print(json.dumps({
                "error": True,
                "message": str(e)
            }), flush=True)

if __name__ == '__main__':
    main()
