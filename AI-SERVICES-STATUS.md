# AI Services Status

## Hugging Face Space Deployment

**Space URL**: https://chrisdemonxxx-voiceforge-v1-0.hf.space  
**Space Repo**: chrisdemonxxx/VoiceForgeAI

## Deployment Instructions

### 1. Get Your HF Token

Visit: https://huggingface.co/settings/tokens
- Create a new token
- Select "Write" permissions
- Copy the token

### 2. Deploy to HF Space

```bash
export HF_TOKEN=hf_your_token_here
./PUSH-TO-HF-SPACE.sh
```

### 3. Test After Deployment

```bash
npx tsx test-hf-spaces-api.ts
```

## Service Status

### ✅ Backend (Render)
- **URL**: https://voiceforge-api.onrender.com
- **Status**: ✅ LIVE
- **API Keys**: 1 key available (public endpoint)
- **Voice Library**: 81 voices available
- **Database**: Connected

### ⏳ Frontend (Vercel)
- **URL**: https://voiceforge-nine.vercel.app
- **Status**: ⏳ Deployment in progress
- **Issue**: Proxy not working (vercel.json needs deployment)
- **Fix**: Latest commit includes vercel.json fix

### ⏳ ML Services (HF Spaces)
- **URL**: https://chrisdemonxxx-voiceforge-v1-0.hf.space
- **Status**: ⏳ Ready to deploy
- **Services**: TTS, STT, VAD, VLLM, Voice Cloning

## Available Services

### Text-to-Speech (TTS)
- **Models**: chatterbox, higgs_audio_v2
- **Voices**: 81 pre-trained voices (multiple languages)
- **Endpoint**: POST `/api/tts`

### Speech-to-Text (STT)
- **Model**: whisper-large-v3
- **Languages**: Multiple
- **Endpoint**: POST `/api/stt`

### Voice Activity Detection (VAD)
- **Model**: Silero VAD
- **Endpoint**: POST `/api/vad`

### Voice LLM (VLLM)
- **Models**: llama-3.3-70b, qwen-2.5
- **Endpoint**: POST `/api/vllm/chat`

### Voice Cloning
- **Modes**: Instant, Professional, Synthetic
- **Endpoint**: POST `/api/clone-voice`

## Next Steps

1. **Deploy to HF Space**:
   ```bash
   export HF_TOKEN=hf_your_token_here
   ./PUSH-TO-HF-SPACE.sh
   ```

2. **Wait for Build** (~10-15 minutes)

3. **Test Deployment**:
   ```bash
   npx tsx test-hf-spaces-api.ts
   ```

4. **Factory Reboot** (if needed):
   - Go to Space Settings → Danger Zone → Factory Reboot

---

**Status**: Ready to deploy! 🚀

