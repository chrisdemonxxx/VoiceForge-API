#!/usr/bin/env python3
"""
Hugging Face TTS Service
Unified service for Indic Parler TTS and Parler-TTS Mini Multilingual
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

# Model URLs
INDIC_PARLER_URL = "https://api-inference.huggingface.co/models/ai4bharat/indic-parler-tts"
PARLER_MULTI_URL = "https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-multilingual"

def log(message: str):
    """Log to stderr"""
    print(f"[HF-TTS] {message}", file=sys.stderr, flush=True)

class HFTTSService:
    """Service for Hugging Face TTS models"""
    
    def __init__(self):
        """Initialize HF TTS service"""
        if not HF_API_TOKEN:
            log("Warning: HUGGINGFACE_TOKEN not set, using public API (may have rate limits)")
        else:
            log("HF TTS service initialized with API token")
    
    def synthesize(self, text: str, model: str, voice_prompt: str) -> bytes:
        """
        Generate speech using HF Inference API
        
        Args:
            text: Text to synthesize
            model: Model to use ('indic_parler_tts' or 'parler_tts_multilingual')
            voice_prompt: Natural language description of voice
        
        Returns:
            Audio bytes
        """
        try:
            # Select model URL
            if model == 'indic_parler_tts':
                api_url = INDIC_PARLER_URL
            elif model == 'parler_tts_multilingual':
                api_url = PARLER_MULTI_URL
            else:
                raise ValueError(f"Unknown HF TTS model: {model}")
            
            log(f"Generating speech with {model}: '{text[:50]}...'")
            
            headers = {}
            if HF_API_TOKEN:
                headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
            
            # HF API expects JSON input
            payload = {
                "inputs": {
                    "text": text,
                    "description": voice_prompt
                }
            }
            
            log("Sending request to Hugging Face Inference API...")
            response = requests.post(
                api_url,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            # Check for model loading error (503)
            if response.status_code == 503:
                error_msg = "Model is currently loading. Please try again in a few seconds."
                log(f"503 Error: {error_msg}")
                raise RuntimeError(error_msg)
            
            # Check for other errors
            if response.status_code != 200:
                error_msg = f"HF API error: {response.status_code} - {response.text}"
                log(f"Error: {error_msg}")
                raise RuntimeError(error_msg)
            
            # HF Inference API returns audio bytes directly
            audio_bytes = response.content
            
            if len(audio_bytes) < 100:
                error_msg = "Received invalid audio data from API"
                log(f"Error: {error_msg}")
                raise RuntimeError(error_msg)
            
            log(f"Successfully generated {len(audio_bytes)} bytes of audio")
            return audio_bytes
            
        except requests.exceptions.Timeout:
            error_msg = "Request timed out. The model might be loading."
            log(f"Timeout error: {error_msg}")
            raise RuntimeError(error_msg)
        except Exception as e:
            log(f"Exception: {str(e)}")
            import traceback
            traceback.print_exc(file=sys.stderr)
            raise

if __name__ == '__main__':
    # This service is designed to be used via worker pool
    # Not meant to run standalone
    log("HF TTS service - use via worker pool")
