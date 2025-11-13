# VoiceForge API - Production Dockerfile for HF Spaces A100-80GB
# Optimized for real production models with GPU acceleration

FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    git \
    ffmpeg \
    libsndfile1 \
    python3.10 \
    python3.10-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Copy Python ML services to dist (needed for Python bridge)
RUN mkdir -p /app/dist/ml-services && \
    cp -r /app/server/ml-services/* /app/dist/ml-services/

# ============================================================================
# Python ML Environment Setup - PRODUCTION MODELS
# ============================================================================

# Install Python build prerequisites
COPY requirements-build.txt ./
RUN pip3 install --no-cache-dir -r requirements-build.txt

# Install PyTorch with CUDA 12.1 support (CRITICAL for A100 GPU)
RUN pip3 install --no-cache-dir \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cu121

# Install vLLM 0.6.0 with CUDA 12.1 support (for Llama-3.3-70B)
RUN pip3 install --no-cache-dir vllm==0.6.0

# Install core ML dependencies
COPY requirements-deployment.txt ./
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir \
    transformers==4.43.2 \
    accelerate==0.27.2 \
    tokenizers>=0.19.1 \
    einops==0.7.0 \
    sentencepiece==0.2.0 \
    protobuf==4.25.3

# Install librosa FIRST (before TTS) to resolve conflicts
RUN pip3 install --no-cache-dir librosa==0.10.2

# Install TTS models separately to avoid dependency conflicts
# (each wants different librosa version, but 0.10.2 works for both)
RUN pip3 install --no-cache-dir chatterbox-tts==0.1.0 --no-deps
RUN pip3 install --no-cache-dir styletts2==0.1.6 --no-deps
RUN pip3 install --no-cache-dir TTS==0.22.0

# Install missing dependencies for TTS packages
RUN pip3 install --no-cache-dir \
    gruut-ipa \
    gruut-lang-en \
    langchain \
    phonemizer \
    piper-phonemize \
    pypinyin

# Install STT (faster-whisper with CTranslate2)
RUN pip3 install --no-cache-dir \
    faster-whisper==1.2.1 \
    ctranslate2==4.4.0 \
    openai-whisper==20231117

# Install VAD (Silero VAD v5)
RUN pip3 install --no-cache-dir \
    silero-vad==6.2.0 \
    silero==0.5.1 \
    webrtcvad==2.0.10

# Install voice cloning dependencies
RUN pip3 install --no-cache-dir \
    resemblyzer==0.1.1.dev0 \
    speechbrain==0.5.16

# Install remaining audio processing libraries (librosa already installed above)
RUN pip3 install --no-cache-dir \
    soundfile==0.12.1 \
    pydub==0.25.1 \
    audioread==3.0.1 \
    resampy==0.4.2 \
    scipy==1.11.4

# Install model management tools
RUN pip3 install --no-cache-dir \
    huggingface-hub==0.23.2 \
    safetensors==0.4.1 \
    bitsandbytes==0.42.0 \
    xformers==0.0.27 \
    peft==0.12.0

# Install API framework
RUN pip3 install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    python-multipart==0.0.6 \
    aiofiles==23.2.1 \
    gradio==4.19.1

# Install utilities
RUN pip3 install --no-cache-dir \
    pyyaml==6.0.1 \
    python-dotenv==1.0.0 \
    requests==2.31.0 \
    httpx==0.26.0 \
    pillow==10.2.0 \
    tqdm==4.66.1 \
    loguru==0.7.2 \
    psutil==5.9.7

# ============================================================================
# Pre-download Production Models (speeds up first startup)
# ============================================================================
# NOTE: Large models (Llama, Higgs, Whisper) are downloaded at runtime to avoid
# build timeouts and disk space limits. Only small models are pre-downloaded.

# Pre-download Silero VAD v5 (small, ~20MB)
RUN python3 -c "import torch; torch.hub.set_dir('/app/ml-cache'); torch.hub.load('snakers4/silero-vad', 'silero_vad', force_reload=False, trust_repo=True)" || true

# NOTE: The following models will be downloaded on first use at runtime:
# - Whisper large-v3 (~3GB) - downloaded by faster-whisper on first use
# - StyleTTS2 (~500MB) - downloaded by StyleTTS2 on first use
# - Higgs Audio V2 (~6GB) - downloaded by transformers on first use
# - Llama-3.3-70B (~140GB) - downloaded by vLLM on first use or use NVIDIA API fallback

# ============================================================================
# Runtime Configuration
# ============================================================================

# Create runtime directories with proper permissions
RUN mkdir -p /app/uploads /app/ml-cache /app/logs /tmp/voiceforge && \
    chmod -R 777 /app/uploads /app/ml-cache /app/logs /tmp/voiceforge

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=7860
ENV GRADIO_PORT=7860
ENV PYTHONUNBUFFERED=1

# GPU optimization for A100 80GB
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
ENV OMP_NUM_THREADS=8

# Model caching
ENV HF_HOME=/app/ml-cache
ENV TRANSFORMERS_CACHE=/app/ml-cache
ENV TORCH_HOME=/app/ml-cache

# vLLM optimization for A100
ENV VLLM_USE_MODELSCOPE=False
ENV VLLM_WORKER_MULTIPROC_METHOD=spawn

# Set API base URL
ENV API_BASE_URL=http://localhost:7861

# Expose port 7860 (HF Spaces standard)
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:7860/ || exit 1

# Start application
CMD ["python3", "app.py"]
