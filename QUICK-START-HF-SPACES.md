# HF Spaces API - Quick Start Guide

## 🚀 Quick Access

**Base URL**: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`

**Swagger Docs**: https://chrisdemonxxx-voiceforge-v1-0.hf.space/docs

**Status**: https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health

---

## ⚡ Quick Test

```bash
# Test API is accessible
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health

# Run full test suite
npx tsx test-hf-spaces-api.ts
```

---

## 🔧 Enable in Your App

### Option 1: Environment Variables
```bash
export USE_HF_SPACES_ML=true
export HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

### Option 2: Use in Code
```typescript
import { mlClient } from './server/ml-client';

// Client automatically uses HF Spaces when configured
const audio = await mlClient.callTTS({
  text: "Hello world",
  model: "facebook/mms-tts-eng"
});
```

---

## 📝 API Endpoints

### Text-to-Speech
```bash
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "default", "speed": 1.0}'
```

### Speech-to-Text
```bash
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/stt \
  -H "Content-Type: application/json" \
  -d '{"audio_base64": "BASE64_AUDIO", "language": "auto"}'
```

### Voice Activity Detection
```bash
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/vad \
  -H "Content-Type: application/json" \
  -d '{"audio_base64": "BASE64_AUDIO", "threshold": 0.5}'
```

---

## ⚠️ Known Issues

### Permission Errors (FIXED)
**Issue**: Models can't load due to permission errors on `/app/.cache`

**Fix Applied**: Updated all `app.py` files to use correct cache paths

**Action Required**: Deploy updated files to HF Space

---

## 🐛 Fix Deployment Steps

### 1. Commit Changes
```bash
git add app.py hf-direct/app.py voiceforge-deploy/app.py
git commit -m "Fix HF Space cache permissions"
```

### 2. Push to HF Space
```bash
# Push to your HF Space repository
git push hf-space main
```

### 3. Restart Space
- Go to HF Space UI
- Click "Factory Reboot"
- Wait 2-3 minutes

### 4. Verify Fix
```bash
npx tsx test-hf-spaces-api.ts
```

Expected: All tests should pass ✅

---

## 📊 Expected Performance

| Operation | First Request (Cold Start) | Subsequent Requests |
|-----------|---------------------------|---------------------|
| TTS | 30-60 seconds | <500ms |
| STT | 30-60 seconds | <1 second |
| VAD | <5 seconds | <200ms |
| VLLM | 60+ seconds | <2 seconds |

**Note**: First request loads models into GPU memory. Subsequent requests are fast!

---

## 🔍 Troubleshooting

### Models Not Loading
- Check Space logs in HF UI
- Verify cache permissions
- Try factory reboot

### Slow Responses
- Normal on first request (cold start)
- Models need to download and load
- Wait 30-60 seconds, then retry

### 500 Errors
- Check if fix is deployed
- Verify models have loaded
- See logs for details

---

## 📚 Full Documentation

- **Complete Status**: [AI-SERVICES-STATUS.md](AI-SERVICES-STATUS.md)
- **Fix Guide**: [HF-SPACE-FIX-GUIDE.md](HF-SPACE-FIX-GUIDE.md)
- **Client Code**: [server/hf-spaces-client.ts](server/hf-spaces-client.ts)
- **Test Script**: [test-hf-spaces-api.ts](test-hf-spaces-api.ts)

---

## ✅ Checklist

Before going to production:

- [ ] Deploy permission fix to HF Space
- [ ] Factory reboot the Space
- [ ] Run test script and verify all pass
- [ ] Set environment variables in Render
- [ ] Test end-to-end from your app
- [ ] Monitor first few requests for cold starts
- [ ] Consider upgrading to persistent GPU Space

---

## 🎯 Quick Commands

```bash
# Test health
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health | jq

# List available models
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/models | jq

# Run full test suite
npx tsx test-hf-spaces-api.ts

# Deploy to HF Space
git push hf-space main
```

---

**Status**: ⚠️ Fix ready for deployment
**ETA to Production**: ~10 minutes after deployment
