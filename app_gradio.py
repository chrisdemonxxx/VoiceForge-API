"""
VoiceForge API - Gradio Mode Entry Point
Alternative entry point for Hugging Face Spaces using Gradio UI

Set USE_GRADIO=true to use this instead of Express server
"""

import os
import sys
from pathlib import Path

# Set environment variables for production
os.environ['NODE_ENV'] = 'production'
os.environ['PORT'] = '7860'
os.environ['PYTHONUNBUFFERED'] = '1'

# GPU optimization settings
os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
os.environ['OMP_NUM_THREADS'] = '8'

# Model caching
cache_dir = '/app/ml-cache'
os.environ['HF_HOME'] = cache_dir
os.environ['TRANSFORMERS_CACHE'] = cache_dir
os.environ['TORCH_HOME'] = cache_dir

print("=" * 80)
print("🎨 VoiceForge API - Starting Gradio UI")
print("=" * 80)
print(f"✓ Environment: {os.environ.get('NODE_ENV')}")
print(f"✓ Port: {os.environ.get('PORT')}")
print(f"✓ Model Cache: {os.environ.get('HF_HOME')}")
print("=" * 80)

# Import and run Gradio app
try:
    from gradio_app import create_gradio_interface
    
    print("\n🚀 Launching Gradio interface...")
    demo = create_gradio_interface()
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
except ImportError as e:
    print(f"❌ ERROR: Failed to import Gradio app: {e}")
    print("   Make sure gradio is installed: pip install gradio")
    sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: Failed to launch Gradio: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

