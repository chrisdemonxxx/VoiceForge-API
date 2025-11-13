---
title: VoiceForge API - Production Voice AI Platform
emoji: 🎙️
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# VoiceForge API

Production Voice AI Platform with Text-to-Speech, Speech-to-Text, Voice Activity Detection, Voice LLM, and Voice Cloning capabilities.

## Features

- 🎤 **Text-to-Speech (TTS)** - Multiple TTS models
- 🎧 **Speech-to-Text (STT)** - Accurate transcription
- 🔊 **Voice Activity Detection (VAD)** - Detect speech segments
- 🤖 **Voice LLM** - Conversational AI
- 🎭 **Voice Cloning** - Clone voices from samples
- 📚 **Voice Library** - 81+ pre-built voices

## Quick Start

The API is accessible at: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`

### Health Check
```bash
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health
```

### API Documentation
Visit: `https://chrisdemonxxx-voiceforge-v1-0.hf.space/docs`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/voice-library` - List available voices
- `POST /api/tts` - Text-to-Speech
- `POST /api/stt` - Speech-to-Text
- `POST /api/vad` - Voice Activity Detection
- `POST /api/vllm/chat` - Voice LLM chat
- `POST /api/clone-voice` - Voice cloning

## Authentication

All endpoints (except `/api/health`) require an API key:

```bash
Authorization: Bearer YOUR_API_KEY
```

Default API key: `vf_sk_19798aa99815232e6d53e1af34f776e1`

## Deployment

This Space uses Docker SDK with:
- Python 3.10
- Node.js 20
- Express API (port 7861)
- Gradio UI (port 7860)

## License

MIT
