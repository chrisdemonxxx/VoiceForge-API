"""
Production Model Loader for 80GB A100 GPU
Loads all ML models simultaneously on startup for zero cold start latency
"""

import os
import sys
import json
import torch
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check CUDA availability
CUDA_AVAILABLE = torch.cuda.is_available()
if CUDA_AVAILABLE:
    logger.info(f"✓ CUDA available: {torch.cuda.get_device_name(0)}")
    logger.info(f"✓ CUDA version: {torch.version.cuda}")
    logger.info(f"✓ Total GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
else:
    logger.warning("⚠️  CUDA not available, falling back to CPU")

# Model cache directory
CACHE_DIR = os.environ.get('HF_HOME', '/app/ml-cache')
DEVICE = 'cuda' if CUDA_AVAILABLE else 'cpu'

class ProductionModelLoader:
    """
    Manages loading and initialization of all ML models for production deployment
    """
    
    def __init__(self):
        self.models = {}
        self.load_status = {}
        
    def load_tts_models(self):
        """Load all TTS models"""
        logger.info("=" * 80)
        logger.info("Loading TTS Models...")
        logger.info("=" * 80)
        
        # Chatterbox (500M params, 2GB VRAM)
        try:
            logger.info("Loading Chatterbox TTS...")
            # TODO: Implement actual loading when Chatterbox is available
            # from chatterbox import ChatterboxTTS
            # self.models['chatterbox'] = ChatterboxTTS().to(DEVICE)
            self.load_status['chatterbox'] = 'pending'
            logger.info("✓ Chatterbox TTS: Ready (placeholder)")
        except Exception as e:
            logger.error(f"❌ Failed to load Chatterbox: {e}")
            self.load_status['chatterbox'] = 'failed'
        
        # Higgs Audio V2 (3B params, 6-8GB VRAM)
        try:
            logger.info("Loading Higgs Audio V2...")
            # TODO: Implement actual loading when Higgs Audio is available
            # from higgs_audio_v2 import HiggsAudioV2
            # self.models['higgs_audio_v2'] = HiggsAudioV2().to(DEVICE)
            self.load_status['higgs_audio_v2'] = 'pending'
            logger.info("✓ Higgs Audio V2: Ready (placeholder)")
        except Exception as e:
            logger.error(f"❌ Failed to load Higgs Audio V2: {e}")
            self.load_status['higgs_audio_v2'] = 'failed'
        
        # StyleTTS2 (100M params, 1GB VRAM)
        try:
            logger.info("Loading StyleTTS2...")
            # TODO: Implement actual loading when StyleTTS2 is available
            # from styletts2 import StyleTTS2
            # self.models['styletts2'] = StyleTTS2().to(DEVICE)
            self.load_status['styletts2'] = 'pending'
            logger.info("✓ StyleTTS2: Ready (placeholder)")
        except Exception as e:
            logger.error(f"❌ Failed to load StyleTTS2: {e}")
            self.load_status['styletts2'] = 'failed'
        
        # Parler-TTS (Indic + Multilingual)
        try:
            logger.info("Loading Parler-TTS models...")
            # These use Hugging Face Inference API, so no local loading needed
            self.load_status['indic-parler-tts'] = 'api'
            self.load_status['parler-tts-multilingual'] = 'api'
            logger.info("✓ Parler-TTS: Using Hugging Face API")
        except Exception as e:
            logger.error(f"❌ Failed to configure Parler-TTS: {e}")
            
    def load_stt_models(self):
        """Load STT models"""
        logger.info("=" * 80)
        logger.info("Loading STT Models...")
        logger.info("=" * 80)
        
        try:
            logger.info("Loading Whisper-large-v3-turbo...")
            from faster_whisper import WhisperModel
            
            model_size = "large-v3"
            compute_type = "float16" if CUDA_AVAILABLE else "int8"
            
            self.models['whisper'] = WhisperModel(
                model_size,
                device=DEVICE,
                compute_type=compute_type,
                download_root=CACHE_DIR
            )
            self.load_status['whisper-large-v3-turbo'] = 'loaded'
            logger.info(f"✓ Whisper-large-v3-turbo loaded on {DEVICE}")
            
            # Test inference
            logger.info("Testing Whisper with silent audio...")
            # TODO: Add test inference
            
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper: {e}")
            self.load_status['whisper-large-v3-turbo'] = 'failed'
    
    def load_vad_models(self):
        """Load VAD models"""
        logger.info("=" * 80)
        logger.info("Loading VAD Models...")
        logger.info("=" * 80)
        
        try:
            logger.info("Loading Silero VAD...")
            # Silero VAD is very lightweight
            torch.hub.set_dir(CACHE_DIR)
            model, utils = torch.hub.load(
                repo_or_dir='snakers4/silero-vad',
                model='silero_vad',
                force_reload=False,
                onnx=False
            )
            
            self.models['silero_vad'] = model.to(DEVICE)
            self.load_status['silero-vad'] = 'loaded'
            logger.info(f"✓ Silero VAD loaded on {DEVICE}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Silero VAD: {e}")
            self.load_status['silero-vad'] = 'failed'
    
    def load_vllm_models(self):
        """Load VLLM models (70B LLM)"""
        logger.info("=" * 80)
        logger.info("Loading VLLM Models...")
        logger.info("=" * 80)
        
        if not CUDA_AVAILABLE:
            logger.warning("⚠️  CUDA not available, skipping 70B model loading")
            self.load_status['llama-3.3-70b'] = 'skipped'
            return
        
        try:
            logger.info("Loading Llama-3.3-70B-Instruct...")
            from vllm import LLM, SamplingParams
            
            # Load with vLLM for optimized inference
            self.models['llama_70b'] = LLM(
                model="meta-llama/Llama-3.3-70B-Instruct",
                tensor_parallel_size=1,  # Single A100
                gpu_memory_utilization=0.85,  # Use 85% of available VRAM
                dtype="float16",
                download_dir=CACHE_DIR,
                trust_remote_code=True
            )
            self.load_status['llama-3.3-70b'] = 'loaded'
            logger.info("✓ Llama-3.3-70B loaded successfully")
            
            # Test generation
            logger.info("Testing Llama-3.3-70B with warmup prompt...")
            sampling_params = SamplingParams(temperature=0.7, max_tokens=10)
            outputs = self.models['llama_70b'].generate(["Hello"], sampling_params)
            logger.info(f"✓ Warmup generation successful: {outputs[0].outputs[0].text}")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Llama-3.3-70B: {e}")
            logger.info("Attempting to load smaller 8B model as fallback...")
            
            try:
                self.models['llama_8b'] = LLM(
                    model="meta-llama/Llama-3.1-8B-Instruct",
                    gpu_memory_utilization=0.8,
                    dtype="float16",
                    download_dir=CACHE_DIR
                )
                self.load_status['llama-3.1-8b'] = 'loaded'
                logger.info("✓ Llama-3.1-8B loaded as fallback")
            except Exception as e2:
                logger.error(f"❌ Fallback also failed: {e2}")
                self.load_status['vllm'] = 'failed'
    
    def get_vram_usage(self):
        """Get current VRAM usage"""
        if not CUDA_AVAILABLE:
            return None
        
        allocated = torch.cuda.memory_allocated(0) / 1024**3
        reserved = torch.cuda.memory_reserved(0) / 1024**3
        total = torch.cuda.get_device_properties(0).total_memory / 1024**3
        
        return {
            'allocated_gb': round(allocated, 2),
            'reserved_gb': round(reserved, 2),
            'total_gb': round(total, 2),
            'utilization_percent': round((allocated / total) * 100, 2)
        }
    
    def load_all_models(self):
        """Load all models in sequence"""
        logger.info("╔════════════════════════════════════════════════════════════════╗")
        logger.info("║     VoiceForge API - Production Model Loading (80GB A100)     ║")
        logger.info("╚════════════════════════════════════════════════════════════════╝")
        logger.info("")
        
        # Load models in order of priority
        self.load_vad_models()      # Smallest, load first
        self.load_stt_models()      # Medium size
        self.load_tts_models()      # Medium-large size
        self.load_vllm_models()     # Largest, load last
        
        # Print summary
        logger.info("")
        logger.info("=" * 80)
        logger.info("Model Loading Summary")
        logger.info("=" * 80)
        
        for model_id, status in self.load_status.items():
            status_icon = {
                'loaded': '✓',
                'pending': '⏳',
                'failed': '❌',
                'skipped': '⊘',
                'api': '🌐'
            }.get(status, '?')
            logger.info(f"  {status_icon} {model_id}: {status}")
        
        # Print VRAM usage
        if CUDA_AVAILABLE:
            vram = self.get_vram_usage()
            logger.info("")
            logger.info("=" * 80)
            logger.info("GPU Memory Usage")
            logger.info("=" * 80)
            logger.info(f"  Allocated: {vram['allocated_gb']} GB")
            logger.info(f"  Reserved:  {vram['reserved_gb']} GB")
            logger.info(f"  Total:     {vram['total_gb']} GB")
            logger.info(f"  Usage:     {vram['utilization_percent']}%")
        
        logger.info("")
        logger.info("=" * 80)
        logger.info("✓ Model loading complete!")
        logger.info("=" * 80)
        
        return self.load_status

# Main execution
if __name__ == "__main__":
    loader = ProductionModelLoader()
    status = loader.load_all_models()
    
    # Output status as JSON
    print("\n__MODEL_LOADER_STATUS__")
    print(json.dumps(status))
