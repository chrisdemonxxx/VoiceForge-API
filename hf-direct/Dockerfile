# VoiceForge API - HF Spaces Optimized Dockerfile
# Production deployment for GPU acceleration (Python 3.10, Node.js 20)

# ============================================================================
# Stage 1: Node.js Build (Frontend + Backend TypeScript)
# ============================================================================
FROM node:20-slim AS node-builder

# Use existing node user (already UID 1000)
USER node
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH

WORKDIR $HOME/app

# Copy package files (as node user)
COPY --chown=node package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY --chown=node . .

# Build frontend and backend
RUN npm run build

# ============================================================================
# Stage 2: Python ML Dependencies
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS python-base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
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

# Create user with UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy requirements
COPY --chown=user requirements-build.txt requirements-deployment.txt ./

# Install PyTorch with CUDA support
RUN pip3 install --no-cache-dir --user torch==2.1.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121

# Install build prerequisites
RUN pip3 install --no-cache-dir --user -r requirements-build.txt

# Install ML stack
RUN pip3 install --no-cache-dir --user -r requirements-deployment.txt

# ============================================================================
# Stage 3: Final Production Image
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install runtime dependencies including Node.js 20
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
    python3 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create user with UID 1000 and set up directories
RUN useradd -m -u 1000 user && \
    mkdir -p /home/user/app && \
    chown -R user:user /home/user

# Set environment variables
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    CUDA_VISIBLE_DEVICES=0

WORKDIR /home/user/app

# Copy Node.js dependencies and build artifacts (as root with chown)
COPY --chown=user:user --from=node-builder /home/node/app/node_modules ./node_modules
COPY --chown=user:user --from=node-builder /home/node/app/package*.json ./
COPY --chown=user:user --from=node-builder /home/node/app/dist ./dist

# Copy Python dependencies from python-base stage
COPY --chown=user:user --from=python-base /home/user/.local /home/user/.local

# Copy application source files
COPY --chown=user:user server ./server
COPY --chown=user:user shared ./shared
COPY --chown=user:user db ./db
COPY --chown=user:user requirements-deployment.txt ./
COPY --chown=user:user app.py ./
COPY --chown=user:user drizzle.config.ts ./
COPY --chown=user:user tsconfig.json ./

# Set ML cache environment variables
ENV HF_HOME=/home/user/app/ml-cache \
    TRANSFORMERS_CACHE=/home/user/app/ml-cache \
    TORCH_HOME=/home/user/app/ml-cache

# Switch to user AFTER all files are copied
USER user

# Expose port 7860 (HF Spaces standard)
EXPOSE 7860

# Start application
CMD ["python3", "app.py"]
