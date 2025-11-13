# VoiceForge A100 Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. HuggingFace Space Configuration

- [ ] Create or access HuggingFace Space
- [ ] Set hardware to **A100 - 80GB** (Settings → Hardware)
- [ ] Set SDK to **Docker** (specified in SPACE_CONFIG.yaml)
- [ ] Configure Repository Secrets:
  ```
  HF_TOKEN=<your_huggingface_token>
  DATABASE_URL=<postgres_connection_string> (optional)
  API_KEY=vf_sk_19798aa99815232e6d53e1af34f776e1
  ```

### 2. HuggingFace Token Setup

**Required for Llama-3.3-70B access**

- [ ] Go to [HuggingFace Settings → Access Tokens](https://huggingface.co/settings/tokens)
- [ ] Create a new token with **read** access
- [ ] Accept Llama 3.3 model license at [meta-llama/Llama-3.3-70B-Instruct](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct)
- [ ] Add token to HF Space secrets as `HF_TOKEN`

### 3. Repository Push

Push all updated files to your HuggingFace Space repository:

```bash
git add .
git commit -m "Configure production models for A100 80GB deployment"
git push
```

**Changed Files:**
- `requirements-deployment.txt` - Updated with real model dependencies
- `server/ml-services/tts_service.py` - Real TTS implementations
- `server/ml-services/vad_service.py` - Silero VAD v5
- `server/ml-services/vllm_service.py` - Llama-3.3-70B
- `Dockerfile` - Production build with GPU optimization
- `PRODUCTION-MODELS-CONFIGURED.md` - Complete documentation
- `DEPLOYMENT-CHECKLIST.md` - This file

---

## 🚀 Deployment Process

### Step 1: Push to HuggingFace Space

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge

# Initialize git if needed
git init
git remote add origin https://huggingface.co/spaces/<username>/voiceforge-v1-0

# Add all files
git add .

# Commit with descriptive message
git commit -m "🎨 Configure production AI models for A100 80GB

- Add Chatterbox TTS (ResembleAI, 500M params, multilingual)
- Add Higgs Audio V2 (Boson AI, 3B params, 24kHz)
- Add StyleTTS2 (human-level quality)
- Configure Whisper large-v3 (faster-whisper)
- Configure Silero VAD v5.1
- Configure Llama-3.3-70B-Instruct (primary VLLM)
- Update Dockerfile for CUDA 12.1 + A100 optimization
- Pre-download models during Docker build
- Add production documentation"

# Push to HuggingFace
git push origin main
```

### Step 2: Monitor Build Progress

1. Go to your HuggingFace Space
2. Click on **"Building"** status
3. Monitor logs for:
   - ✅ Docker build completion (~30-45 minutes)
   - ✅ PyTorch CUDA installation
   - ✅ Model pre-downloading
   - ✅ Service startup

### Step 3: First Startup (5-10 minutes)

The application will:
1. Load Silero VAD v5 (~2 seconds)
2. Load Whisper large-v3 (~10 seconds)
3. Load Llama-3.3-70B-Instruct (~3-5 minutes)
4. TTS models load on first request (lazy loading)
5. Start Gradio UI on port 7860

### Step 4: Verify Deployment

#### Check Health Endpoint
```bash
curl https://your-space.hf.space/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 300,
  "database": {"status": "connected"},
  "ml_workers": {"status": "ready"}
}
```

#### Test via Gradio UI
1. Open `https://your-space.hf.space`
2. Go to "🏥 Health Check" tab
3. Click "Check Health" button
4. Verify all services show as ✅ loaded

---

## 🧪 Testing Production Models

### Test 1: Chatterbox TTS
```bash
curl -X POST https://your-space.hf.space/api/tts \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of Chatterbox TTS.",
    "model": "chatterbox",
    "voice": "en-us-sarah-f",
    "speed": 1.0
  }'
```

### Test 2: Higgs Audio V2
```bash
curl -X POST https://your-space.hf.space/api/tts \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Testing expressive Higgs Audio V2 synthesis.",
    "model": "higgs_audio_v2",
    "speed": 1.0
  }'
```

### Test 3: StyleTTS2
```bash
curl -X POST https://your-space.hf.space/api/tts \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Human-level quality with StyleTTS2.",
    "model": "styletts2",
    "speed": 1.0
  }'
```

### Test 4: Whisper STT
```bash
# Upload an audio file and get transcription
curl -X POST https://your-space.hf.space/api/stt \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "<base64_encoded_audio>",
    "language": "en"
  }'
```

### Test 5: Llama-3.3-70B Chat
```bash
curl -X POST https://your-space.hf.space/api/vllm/chat \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Can you tell me about voice AI?",
    "mode": "assistant",
    "session_id": "test-session-001"
  }'
```

### Test 6: Silero VAD
```bash
curl -X POST https://your-space.hf.space/api/vad \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "<base64_encoded_audio>"
  }'
```

---

## 📊 Expected Resource Usage

### GPU Memory (A100 80GB)
```
Llama-3.3-70B (FP16)    : 75GB   (93.75%)
Higgs Audio V2          : 6GB    (loaded on demand)
Chatterbox TTS          : 2GB    (loaded on demand)
StyleTTS2               : 3GB    (loaded on demand)
Whisper large-v3        : 5GB    (loaded on demand)
Silero VAD              : 0.5GB  (always loaded)
Reserved/Overhead       : 5GB
```

### Build Time
- **Docker Image Build**: 30-45 minutes
- **Model Pre-downloading**: Included in build
- **First Startup**: 5-10 minutes

### Runtime Memory
- **System RAM**: ~8-12GB
- **Disk Space**: ~100GB (models + dependencies)

---

## ⚠️ Common Issues & Solutions

### Issue 1: Build Fails on vLLM Installation

**Solution**:
```dockerfile
# Ensure CUDA 12.1 is properly installed
RUN pip3 install --no-cache-dir vllm==0.6.0 --no-build-isolation
```

### Issue 2: Llama-3.3-70B Access Denied

**Error**: `Repository not found or access denied`

**Solution**:
1. Verify HF_TOKEN is set in Space secrets
2. Accept model license at https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct
3. Ensure token has read access

### Issue 3: Out of Memory (OOM) on GPU

**Solution**: VLLM service automatically falls back to:
1. INT8 quantization (60GB) if FP16 fails
2. Llama-3.1-8B if 70B fails

**Manual Override**: Edit `vllm_service.py`:
```python
gpu_memory_utilization = 0.85  # Reduce from 0.92
```

### Issue 4: TTS Models Not Loading

**Check**:
- Models are loaded on first request (lazy loading)
- Check logs for specific errors
- Verify HF cache has write permissions

**Solution**:
```bash
# In Space logs, verify:
[TTS] ✓ Chatterbox TTS loaded successfully
[TTS] ✓ Higgs Audio V2 loaded successfully
[TTS] ✓ StyleTTS2 loaded successfully
```

### Issue 5: Slow First TTS Request

**Expected Behavior**: First request loads the model (~5-10 seconds)

**Solution**: Pre-warm models by making test requests after deployment

---

## 🔍 Monitoring & Logs

### View Real-Time Logs
1. Go to HuggingFace Space
2. Click **"Logs"** tab
3. Monitor for:
   - Model loading confirmations
   - GPU memory usage
   - Request processing times
   - Error messages

### Key Log Messages

**Successful Startup**:
```
[TTS] ✓ Chatterbox TTS loaded successfully (500M params, multilingual)
[TTS] ✓ Higgs Audio V2 loaded successfully (3B params, 24kHz, expressive)
[TTS] ✓ StyleTTS2 loaded successfully (human-level quality)
[STT] ✓ Whisper-large-v3 loaded successfully on cuda
[VAD] ✓ Silero VAD v5.1 loaded successfully via pip package
[VLLM] ✓ 70B-FP16 model loaded successfully: meta-llama/Llama-3.3-70B-Instruct
[Gradio] ✓ Gradio 4.19.1 is installed
🚀 Launching Gradio interface...
```

---

## 📈 Performance Benchmarks

### Expected Latencies (A100 80GB)

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Chatterbox TTS | <200ms | Sub-second for short phrases |
| Higgs Audio V2 | ~300ms | Expressive synthesis |
| StyleTTS2 | ~500ms | High quality |
| Whisper Transcription | ~1s/10s audio | Real-time factor 0.1x |
| Silero VAD | <1ms/chunk | Per 30ms audio chunk |
| Llama Chat Response | ~1-2s | 20-30 tokens/second |

---

## 🎯 Post-Deployment Tasks

- [ ] Test all endpoints via Gradio UI
- [ ] Run API tests with curl commands
- [ ] Monitor GPU memory usage
- [ ] Check response times
- [ ] Set up monitoring/alerting (optional)
- [ ] Configure auto-sleep settings (optional)
- [ ] Document API keys for client applications
- [ ] Test voice cloning functionality
- [ ] Verify database connectivity (if using)

---

## 📞 Support & Resources

- **Documentation**: `PRODUCTION-MODELS-CONFIGURED.md`
- **HuggingFace Spaces Docs**: https://huggingface.co/docs/hub/spaces
- **vLLM Documentation**: https://docs.vllm.ai/
- **Model Cards**:
  - Chatterbox: https://huggingface.co/ResembleAI/chatterbox
  - Higgs Audio V2: https://huggingface.co/bosonai/higgs-audio-v2-generation-3B-base
  - StyleTTS2: https://github.com/yl4579/StyleTTS2
  - Llama 3.3: https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct

---

## ✅ Deployment Complete!

Once all checkboxes are complete, your VoiceForge production deployment with **real AI models** is ready for use!

**🎉 Congratulations on deploying a full production voice AI platform on A100 80GB!**
