---
title: VoiceForge API
emoji: 🎙️
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: GPU-Accelerated Voice AI Platform - TTS, STT, VAD, VLLM
---

# 🎙️ VoiceForge API

**Production-Ready Voice AI Platform with 80GB A100 GPU Deployment**

[![Deploy on Hugging Face](https://img.shields.io/badge/Deploy-Hugging%20Face-FF6F00?logo=huggingface)](https://huggingface.co/spaces)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GPU](https://img.shields.io/badge/GPU-A100%2080GB-76B900?logo=nvidia)](https://www.nvidia.com/en-us/data-center/a100/)

> State-of-the-art Text-to-Speech, Speech-to-Text, Voice Cloning, and Voice LLM platform delivering ElevenLabs-quality voice synthesis with advanced ML models.

---

## 🌟 Features

### 🎤 Text-to-Speech (TTS)
- **135+ voices** across **30+ languages**
- **Chatterbox** (500M params) - Beats ElevenLabs in 63.75% of blind tests
- **Higgs Audio V2** (3B params) - Industry-leading emotional expressiveness
- **StyleTTS2** (100M params) - Surpasses human recordings on benchmarks
- **Indic Parler TTS** (630M params) - 21 Indian languages, 69 unique voices
- **Parler-TTS Multilingual** - T1 country voices (EN, DE, FR, ES, PT, PL, IT, NL)

### 🎧 Speech-to-Text (STT)
- **Whisper-large-v3-turbo** (1.5B params) - 99+ languages
- High accuracy transcription with streaming support
- Real-time audio processing

### 🔊 Voice Activity Detection (VAD)
- **Silero VAD** - Precise speech segment detection
- Real-time voice activity monitoring

### 🤖 Voice Large Language Model (VLLM)
- **Llama-3.3-70B-Instruct** or **Qwen2.5-72B-Instruct**
- Conversational AI with context memory
- Voice-enabled chat experiences

### 🎭 Voice Cloning
- **3-tier system**: Instant, Professional, Synthetic
- Zero-shot voice cloning from 5-second samples
- Advanced fine-tuning for professional clones

### 📞 Telephony Integration
- **Multi-provider support**: Twilio and Zadarma
- SIP protocol support with full call management
- WebRTC media streaming
- Production-ready call handling

### 🔀 Visual Agent Flow Builder
- Drag-and-drop workflow design
- AI-powered flow generation
- Complex multi-step voice automation

### 🧪 Real-Time Testing Playground
- Comprehensive voice AI pipeline testing
- WebSocket gateway with microphone integration
- Live metrics and monitoring

---

## 🚀 Quick Start

### Deploy on Hugging Face Spaces (Recommended)

1. **Fork this repository** on GitHub

2. **Create a Hugging Face Space**:
   - Go to [huggingface.co/spaces](https://huggingface.co/spaces)
   - Click "Create new Space"
   - Select **Docker** as SDK
   - Link to your GitHub repository

3. **Configure Secrets** (in Space Settings → Repository secrets):
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   HUGGINGFACE_TOKEN=hf_your_token
   SESSION_SECRET=your_secret_here
   # Add other optional secrets (see .env.production.example)
   ```

4. **Upgrade to A100 GPU**:
   - Go to Space Settings → Hardware
   - Select "A100 - 80GB" ($4.13/hour)
   - Set sleep time (1 hour recommended)

5. **Deploy**:
   - Space builds automatically from Dockerfile
   - Build takes ~10-15 minutes
   - Models load on first startup (~5-10 minutes)

6. **Access**:
   ```
   https://your-username-voiceforge-api.hf.space
   ```

📖 **Full deployment guide**: See [README-DEPLOYMENT.md](README-DEPLOYMENT.md)

---

## 📊 API Endpoints

### Health & Status
```bash
GET /api/health      # Comprehensive health check
GET /api/ready       # Readiness probe
GET /api/live        # Liveness probe
```

### Text-to-Speech
```bash
POST /api/tts
{
  "text": "Hello from VoiceForge",
  "model": "chatterbox",
  "voice_id": "default",
  "language": "en"
}
```

### Speech-to-Text
```bash
POST /api/stt
Content-Type: multipart/form-data
audio: <audio file>
```

### Voice Cloning
```bash
POST /api/clone-voice
Content-Type: multipart/form-data
reference: <audio file>
name: "My Voice Clone"
tier: "instant"
```

### VLLM Chat
```bash
POST /api/vllm/chat
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "session_id": "user123"
}
```

### Telephony
```bash
POST /api/telephony/call
{
  "provider_id": "provider-uuid",
  "to": "+1234567890",
  "from": "+0987654321"
}
```

📚 **Full API Documentation**: See `/docs` endpoint when deployed

---

## 🛠️ Technology Stack

### Frontend
- **React 18** + **TypeScript**
- **Wouter** for routing
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** for state management
- **WebSocket** for real-time features

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** (Neon serverless) via **Drizzle ORM**
- **Python 3.11** for ML services
- **WebSocket** (`ws`) for real-time gateway

### ML Models
- **PyTorch 2.1.2** with CUDA 12.1
- **Transformers 4.36.2**
- **vLLM 0.2.7** for LLM inference
- **faster-whisper** for STT
- **Silero VAD** for voice activity detection

### Infrastructure
- **Docker** multi-stage builds
- **NVIDIA CUDA** 12.1.0 runtime
- **80GB A100 GPU** (Hugging Face Spaces)

---

## 💰 Cost Optimization

### Auto-Sleep Configuration
Save 60-85% on GPU costs with automatic sleep mode:

```python
from huggingface_hub import HfApi

api = HfApi()
api.set_space_sleep_time(
    repo_id="your-username/voiceforge-api",
    sleep_time=3600  # 1 hour
)
```

### Cost Estimates (80GB A100)

| Usage Pattern | Monthly Cost |
|---------------|--------------|
| 24/7 Running | $2,973 |
| 12 hrs/day (auto-sleep) | $1,487 (50% savings) |
| 8 hrs/day (dev mode) | $991 (67% savings) |
| 4 hrs/day (testing) | $496 (83% savings) |

---

## 🏗️ Architecture

### ML Worker Pool
Unified worker pool manages all ML services through persistent Python processes:
- Minimizes cold start latency
- Automatic failover and health checks
- Priority-based task queuing
- GPU model swap-in ready

### Real-Time Gateway
WebSocket-based dual-mode interface (voice/text/hybrid):
- Low-latency conversational AI
- STT → VLLM → TTS pipeline
- Live metrics and monitoring

### Telephony System
Multi-provider support with production-ready audio pipeline:
- Twilio WebRTC integration
- Zadarma REST API + SIP protocol
- μ-law ↔ PCM conversion
- 8kHz ↔ 16kHz resampling

---

## 📦 Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL database
- NVIDIA GPU with CUDA (optional, falls back to CPU)

### Setup
```bash
# Clone repository
git clone https://github.com/your-username/voiceforge-api.git
cd voiceforge-api

# Install dependencies
npm install

# Set up environment
cp .env.production.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The application runs on `http://localhost:5000`

---

## 🔒 Security

### API Authentication
- **Bearer token** authentication for all API endpoints
- Per-key **rate limiting**
- **Admin token** for management operations

### Secrets Management
- All sensitive credentials stored as environment variables
- No secrets in code or version control
- Production secrets managed via Hugging Face Space settings

---

## 📈 Monitoring

### Health Checks
```bash
# Comprehensive health status
curl https://your-space.hf.space/api/health

# Database connectivity
curl https://your-space.hf.space/api/ready

# Service availability
curl https://your-space.hf.space/api/live
```

### Metrics
- Real-time GPU utilization
- Model loading status
- Request latency tracking
- Error rate monitoring

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Chatterbox** - Most realistic TTS model
- **Higgs Audio V2** - Best emotional expressiveness
- **StyleTTS2** - Human-level speech quality
- **Whisper** by OpenAI - Industry-standard STT
- **Silero** - Efficient VAD model
- **Llama 3.3** by Meta - State-of-the-art LLM
- **Qwen 2.5** by Alibaba - Multilingual LLM excellence

---

## 📞 Support

- **Documentation**: [README-DEPLOYMENT.md](README-DEPLOYMENT.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/voiceforge-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/voiceforge-api/discussions)

---

**Built with ❤️ for the voice AI community**

Deploy on Hugging Face Spaces and start building amazing voice experiences today! 🚀
