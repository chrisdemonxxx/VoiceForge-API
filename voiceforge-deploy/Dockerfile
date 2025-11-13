# VoiceForge API - Production Dockerfile for 80GB A100 GPU Deployment
# Multi-stage build for optimal image size and performance

# ============================================================================
# Stage 1: Node.js Build (Frontend + Backend TypeScript)
# ============================================================================
FROM node:20-slim AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production + dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend (Vite + TypeScript)
RUN npm run build

# ============================================================================
# Stage 2: Python ML Dependencies
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS python-base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3.11-dev \
    git \
    wget \
    curl \
    ffmpeg \
    libsndfile1 \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /app

# Copy Python deployment requirements
COPY requirements-deployment.txt .

# Install Python ML dependencies (with GPU support)
# Install PyTorch with CUDA first, then other dependencies
RUN pip install --no-cache-dir torch==2.1.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121
RUN pip install --no-cache-dir -r requirements-deployment.txt

# Verify PyTorch installation (CUDA check happens at runtime, not build time)
RUN python -c "import torch; print(f'✓ PyTorch {torch.__version__} installed (CUDA support will be verified at runtime)')"

# ============================================================================
# Stage 3: Final Production Image
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install runtime dependencies (including Node.js 20 from NodeSource)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y \
    nodejs \
    python3.11 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

WORKDIR /app

# Copy Node.js production dependencies
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package*.json ./

# Copy built frontend and backend (dist contains both)
COPY --from=node-builder /app/dist ./dist

# Copy Python dependencies
COPY --from=python-base /usr/local/lib/python3.11 /usr/local/lib/python3.11

# Copy source files needed at runtime
COPY server ./server
COPY shared ./shared
COPY requirements-deployment.txt ./

# Create directories for runtime data
RUN mkdir -p /app/uploads /app/ml-cache /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0
ENV HF_HOME=/app/ml-cache
ENV TRANSFORMERS_CACHE=/app/ml-cache
ENV TORCH_HOME=/app/ml-cache

# Expose port 7860 (Hugging Face Spaces standard)
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/api/health || exit 1

# Start the application
CMD ["npm", "start"]
