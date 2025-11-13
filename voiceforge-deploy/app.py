"""
VoiceForge API - Hugging Face Spaces Entry Point
Production deployment for 80GB A100 GPU

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

# Create cache directory early with proper permissions
Path('/app/.cache').mkdir(parents=True, exist_ok=True)
try:
    os.chmod('/app/.cache', 0o777)
except Exception:
    pass  # Continue even if chmod fails

print("=" * 80)
print("🚀 VoiceForge API - Starting Production Server")
print("=" * 80)
print(f"✓ Environment: {os.environ.get('NODE_ENV')}")
print(f"✓ Port: {os.environ.get('PORT')}")
print(f"✓ GPU: CUDA Device 0 (80GB A100)")
print(f"✓ Model Cache: {os.environ.get('HF_HOME')}")
print("=" * 80)

# Check if running on GPU
try:
    import torch
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"✓ GPU Detected: {gpu_name}")
        print(f"✓ GPU Memory: {gpu_memory:.2f} GB")
        print(f"✓ PyTorch Version: {torch.__version__}")
        print(f"✓ CUDA Version: {torch.version.cuda}")
    else:
        print("⚠️  WARNING: CUDA not available, running on CPU")
except ImportError:
    print("⚠️  WARNING: PyTorch not installed")

print("=" * 80)

# Change to app directory
os.chdir('/app')

# Ensure node_modules are available
if not Path('/app/node_modules').exists():
    print("📦 Installing Node.js dependencies...")
    subprocess.run(['npm', 'ci'], check=True)
    print("✓ Node.js dependencies installed")

# Initialize database tables
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

# Start the Express server
print("\n🌐 Starting Express server...")
print("=" * 80)

# Start server process
server_process = subprocess.Popen(
    ['npm', 'start'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
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
