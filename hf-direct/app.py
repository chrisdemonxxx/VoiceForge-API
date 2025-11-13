"""
VoiceForge API - Hugging Face Spaces Entry Point
Production deployment for 80GB A100 GPU (Python 3.10)

This file serves as the main entry point for Hugging Face Spaces.
It starts the Express server and exposes the API endpoints.
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

# Set environment variables for production
os.environ['NODE_ENV'] = 'production'
os.environ['PORT'] = '7860'  # Hugging Face Spaces standard port
os.environ['PYTHONUNBUFFERED'] = '1'

# GPU optimization settings for 80GB A100
os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
os.environ['OMP_NUM_THREADS'] = '8'

# Model caching - Use /app/.cache for compatibility with HF Spaces
os.environ['HF_HOME'] = '/app/.cache'
os.environ['TRANSFORMERS_CACHE'] = '/app/.cache'
os.environ['TORCH_HOME'] = '/app/.cache'
os.environ['HF_DATASETS_CACHE'] = '/app/.cache/datasets'
os.environ['HUGGINGFACE_HUB_CACHE'] = '/app/.cache/hub'

print("=" * 80)
print("🚀 VoiceForge API - Starting Production Server")
print("=" * 80)
print(f"✓ Environment: {os.environ.get('NODE_ENV')}")
print(f"✓ Port: {os.environ.get('PORT')}")
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
    print(f"❌ ERROR: PyTorch not installed: {e}")
    sys.exit(1)

try:
    import vllm
    print(f"✓ vLLM {vllm.__version__} loaded successfully")
except ImportError as e:
    print(f"⚠️  WARNING: vLLM not installed: {e}")
    print("   Some features may not be available")

print("=" * 80)

# Change to app directory
os.chdir('/app')

# Create runtime directories with proper permissions
print("\n📁 Creating runtime directories...")
Path('/app/uploads').mkdir(parents=True, exist_ok=True)
Path('/app/ml-cache').mkdir(parents=True, exist_ok=True)
Path('/app/.cache').mkdir(parents=True, exist_ok=True)
Path('/app/logs').mkdir(parents=True, exist_ok=True)

# Set permissions to ensure models can be cached
try:
    os.chmod('/app/ml-cache', 0o777)
    os.chmod('/app/.cache', 0o777)
    print("✓ Runtime directories created with proper permissions")
except Exception as e:
    print(f"⚠️  Warning: Could not set directory permissions: {e}")
    print("   Continuing anyway...")

# Skip npm ci in production (node_modules already in container)
if not Path('/app/node_modules').exists():
    print("📦 node_modules not found - installing dependencies...")
    subprocess.run(['npm', 'ci'], check=True)
    print("✓ Node.js dependencies installed")
else:
    print("✓ Node.js dependencies already available (production container)")

# Initialize database tables (only if DATABASE_URL is available)
database_url = os.environ.get('DATABASE_URL')
if database_url:
    print("\n🗄️  Initializing database...")
    print("=" * 80)
    try:
        result = subprocess.run(
            ['npm', 'run', 'db:push'],
            check=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        print("✓ Database tables created/updated successfully")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Database initialization warning: {e.stderr}")
        print("Continuing with server startup (tables may already exist)...")
    except subprocess.TimeoutExpired:
        print("⚠️  Database initialization timed out")
        print("Continuing with server startup...")
else:
    print("\n📝 DATABASE_URL not set - running without persistent database")
    print("   (Using in-memory storage for demo purposes)")
    print("=" * 80)

# Start the Express server
print("\n🌐 Starting Express server...")
print("=" * 80)

# Start server process
print(f"Working directory: {os.getcwd()}")
print(f"node_modules exists: {Path('/app/node_modules').exists()}")
print(f"dist exists: {Path('/app/dist').exists()}")
print(f"dist/index.js exists: {Path('/app/dist/index.js').exists()}")
print("=" * 80)

try:
    server_process = subprocess.Popen(
        ['npm', 'start'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
except Exception as e:
    print(f"❌ Failed to start server: {e}")
    print(f"Trying direct node execution...")
    server_process = subprocess.Popen(
        ['node', 'dist/index.js'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env={**os.environ, 'NODE_ENV': 'production', 'PORT': '7860'}
    )

# Handle graceful shutdown
def signal_handler(sig, frame):
    print("\n🛑 Shutting down gracefully...")
    server_process.terminate()
    server_process.wait(timeout=10)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Stream server output
try:
    for line in server_process.stdout:
        print(line, end='')
except KeyboardInterrupt:
    signal_handler(None, None)

# Wait for server process
server_process.wait()
