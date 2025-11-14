# VoiceForge API - Streamlined Dockerfile for HF Spaces A100-80GB
# Focus on Python ML services + Gradio UI

FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system dependencies (no Node.js for now - not needed for Gradio)
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ffmpeg \
    libsndfile1 \
    python3.10 \
    python3.10-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements first (for better Docker caching)
COPY requirements-build.txt requirements-deployment.txt ./

# Install Python build prerequisites
RUN pip3 install --no-cache-dir -r requirements-build.txt

# Install PyTorch with CUDA 12.1
RUN pip3 install --no-cache-dir \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cu121

# Install vLLM
RUN pip3 install --no-cache-dir vllm==0.6.0

# Install core ML dependencies
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel && \
    pip3 install --no-cache-dir \
    transformers==4.43.2 \
    accelerate==0.27.2 \
    tokenizers>=0.19.1 \
    einops==0.7.0 \
    sentencepiece==0.2.0 \
    protobuf==4.25.3

# Install librosa FIRST (before TTS packages)
RUN pip3 install --no-cache-dir librosa==0.10.2

# Install TTS packages with --no-deps to avoid conflicts
RUN pip3 install --no-cache-dir chatterbox-tts==0.1.0 --no-deps
RUN pip3 install --no-cache-dir styletts2==0.1.6 --no-deps
RUN pip3 install --no-cache-dir TTS==0.22.0

# Install TTS dependencies
RUN pip3 install --no-cache-dir \
    gruut-ipa \
    gruut-lang-en \
    langchain \
    phonemizer \
    piper-phonemize \
    pypinyin

# Install STT (faster-whisper)
RUN pip3 install --no-cache-dir \
    faster-whisper==1.2.1 \
    ctranslate2==4.4.0 \
    openai-whisper==20231117

# Install VAD (Silero)
RUN pip3 install --no-cache-dir \
    silero-vad==6.2.0 \
    silero==0.5.1 \
    webrtcvad==2.0.10

# Install voice cloning
RUN pip3 install --no-cache-dir \
    resemblyzer==0.1.1.dev0 \
    speechbrain==0.5.16

# Install audio processing libraries
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

# Install API framework (Gradio + FastAPI)
RUN pip3 install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    python-multipart==0.0.6 \
    aiofiles==23.2.1 \
    gradio==4.19.1

# Install NVIDIA Maxine gRPC client
RUN pip3 install --no-cache-dir \
    grpcio==1.60.0 \
    grpcio-tools==1.60.0

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

# Copy application code
COPY . .

# Note: All models (including Silero VAD) will be downloaded at runtime on first use
# This avoids build timeouts and keeps the Docker image smaller

# Create runtime directories with proper permissions
RUN mkdir -p /app/uploads /app/ml-cache /app/logs /tmp/voiceforge
RUN chmod -R 777 /app/uploads /app/ml-cache /app/logs /tmp/voiceforge

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV GRADIO_PORT=7860
ENV CUDA_VISIBLE_DEVICES=0
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
ENV OMP_NUM_THREADS=8
ENV HF_HOME=/app/ml-cache
ENV TRANSFORMERS_CACHE=/app/ml-cache
ENV TORCH_HOME=/app/ml-cache
ENV VLLM_USE_MODELSCOPE=False
ENV VLLM_WORKER_MULTIPROC_METHOD=spawn
ENV API_BASE_URL=http://localhost:7861

# Expose Gradio port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:7860/ || exit 1

# Start application (app.py launches Gradio)
CMD ["python3", "app.py"]
