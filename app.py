"""
VoiceForge API - Hugging Face Spaces Entry Point with Gradio UI
Production deployment for 80GB A100 GPU (Python 3.10)

This file serves as the main entry point for Hugging Face Spaces.
It starts the Express API server in the background and launches Gradio UI.
"""

import os
import sys
import subprocess
import signal
import time
import threading
from pathlib import Path

# Set environment variables for production
os.environ['NODE_ENV'] = 'production'
os.environ['PORT'] = '7861'  # Express API on 7861 (internal)
os.environ['GRADIO_PORT'] = '7860'  # Gradio UI on 7860 (public)
os.environ['PYTHONUNBUFFERED'] = '1'

# GPU optimization settings for 80GB A100
os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
os.environ['OMP_NUM_THREADS'] = '8'

# Model caching (use /app/ml-cache - already created in Dockerfile with proper permissions)
cache_dir = '/app/ml-cache'
os.environ['HF_HOME'] = cache_dir
os.environ['TRANSFORMERS_CACHE'] = cache_dir
os.environ['TORCH_HOME'] = cache_dir

# Set API base URL for Gradio to use
os.environ['API_BASE_URL'] = 'http://localhost:7861'

print("=" * 80)
print("🎨 VoiceForge API - Starting with Gradio UI")
print("=" * 80)
print(f"✓ Environment: {os.environ.get('NODE_ENV')}")
print(f"✓ Express API Port: {os.environ.get('PORT')}")
print(f"✓ Gradio UI Port: {os.environ.get('GRADIO_PORT')}")
print(f"✓ GPU: CUDA Device 0 (80GB A100)")
print(f"✓ Model Cache: {os.environ.get('HF_HOME')}")
print("=" * 80)

# Verify ML packages and GPU availability
print("\n🔍 Verifying ML Environment...")
print("=" * 80)

try:
    import torch
    print(f"✓ PyTorch {torch.__version__} loaded")
    print(f"✓ CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"✓ GPU Detected: {gpu_name}")
        print(f"✓ GPU Memory: {gpu_memory:.2f} GB")
        print(f"✓ CUDA Version: {torch.version.cuda}")
    else:
        print("⚠️  WARNING: CUDA not available, running on CPU")
except ImportError as e:
    print(f"⚠️  WARNING: PyTorch not installed: {e}")
    print("   Some ML features may not be available")

try:
    import vllm  # type: ignore
    print(f"✓ vLLM {vllm.__version__} loaded successfully")
except (ImportError, RuntimeError) as e:
    print("⚠️  WARNING: vLLM not available")
    print(f"   Reason: {str(e)[:100]}")
    print("   Using NVIDIA API fallback for Voice LLM features")

print("=" * 80)

# Get app directory from environment or use default
app_dir = os.environ.get('WORKDIR', '/app')
if not os.path.exists(app_dir):
    app_dir = '/app'  # Fallback to /app
os.chdir(app_dir)

# Create runtime directories
print("\n📁 Creating runtime directories...")
try:
    Path(f'{app_dir}/uploads').mkdir(parents=True, exist_ok=True)
    print("  ✓ uploads/")
except PermissionError:
    print("  ⚠️  Cannot create uploads/ (using /tmp/uploads)")
    Path('/tmp/uploads').mkdir(parents=True, exist_ok=True)
    os.environ['UPLOAD_DIR'] = '/tmp/uploads'

try:
    Path(f'{app_dir}/ml-cache').mkdir(parents=True, exist_ok=True)
    print("  ✓ ml-cache/")
except PermissionError:
    print("  ⚠️  Cannot create ml-cache/ (using /tmp/ml-cache)")
    Path('/tmp/ml-cache').mkdir(parents=True, exist_ok=True)
    os.environ['HF_HOME'] = '/tmp/ml-cache'
    os.environ['TRANSFORMERS_CACHE'] = '/tmp/ml-cache'
    os.environ['TORCH_HOME'] = '/tmp/ml-cache'

try:
    Path(f'{app_dir}/logs').mkdir(parents=True, exist_ok=True)
    print("  ✓ logs/")
except PermissionError:
    print("  ⚠️  Cannot create logs/ (using /tmp/logs)")
    Path('/tmp/logs').mkdir(parents=True, exist_ok=True)

# Use /tmp for temporary files (always writable)
try:
    Path('/tmp/voiceforge').mkdir(parents=True, exist_ok=True)
    print("  ✓ /tmp/voiceforge/")
    os.environ['TMPDIR'] = '/tmp/voiceforge'
except Exception as e:
    print(f"  ⚠️  Cannot create /tmp/voiceforge: {e}")

print("✓ Runtime directories created")

# Note: Skipping Express API server (Node.js not installed in this deployment)
# Gradio UI provides all functionality needed for testing AI models
print("\n📝 Express API server: Skipped (Gradio-only deployment)")
print("=" * 80)

# No Express server in this deployment
server_process = None

# Start Gradio UI
print("\n🎨 Starting Gradio UI...")
print("=" * 80)

# Check if gradio is installed (should be installed during Docker build)
try:
    import gradio
    print(f"✓ Gradio {gradio.__version__} is installed")
except ImportError:
    print("❌ ERROR: Gradio is not installed")
    print("   Gradio should be installed during Docker build from requirements-deployment.txt")
    print("   Check Dockerfile to ensure requirements-deployment.txt is installed")
    print("⚠️  Falling back to Express-only mode")
    # Keep Express server running if it started
    if server_process:
        print("✓ Express API server is running on port 7861")
        print("⚠️  Gradio UI unavailable, but API endpoints are accessible")
        print("   API available at: http://localhost:7861")
        # Keep the process alive
        try:
            server_process.wait()
        except KeyboardInterrupt:
            signal_handler(None, None)
    else:
        print("❌ No services available. Exiting.")
        sys.exit(1)
    sys.exit(0)

# Try to import and launch Gradio
try:
    from gradio_app import create_gradio_interface
    
    print("✓ Gradio app imported successfully")
    print("🚀 Launching Gradio interface...")
    
    demo = create_gradio_interface()
    # Launch Gradio in blocking mode (this keeps the process alive)
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True,
        prevent_thread_lock=False,  # Block to keep process alive
        inbrowser=False
    )
    # This line should never be reached if launch() works correctly
    print("⚠️  Gradio launch returned unexpectedly")
except ImportError as e:
    print(f"❌ ERROR: Failed to import Gradio app: {e}")
    print("   Error details:", str(e))
    import traceback
    traceback.print_exc()
    print("⚠️  Falling back to Express-only mode")
    if server_process:
        print("✓ Express API server is running on port 7861")
        try:
            server_process.wait()
        except KeyboardInterrupt:
            signal_handler(None, None)
    else:
        sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: Failed to launch Gradio: {e}")
    import traceback
    traceback.print_exc()
    print("⚠️  Falling back to Express-only mode")
    if server_process:
        print("✓ Express API server is running on port 7861")
        try:
            server_process.wait()
        except KeyboardInterrupt:
            signal_handler(None, None)
    else:
        sys.exit(1)

# Handle graceful shutdown
def signal_handler(sig, frame):
    print("\n🛑 Shutting down gracefully...")
    if server_process:
        server_process.terminate()
        server_process.wait(timeout=10)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Keep the main thread alive
# If we reach here, something went wrong - keep process alive anyway
if server_process:
    print("⚠️  Gradio failed but Express API is running. Keeping process alive...")
    try:
        server_process.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)
else:
    print("⚠️  No services running. Exiting in 60 seconds...")
    time.sleep(60)
    sys.exit(1)
