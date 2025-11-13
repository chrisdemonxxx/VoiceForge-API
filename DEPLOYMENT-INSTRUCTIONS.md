# VoiceForge Deployment Instructions

## 🚀 Quick Deployment Guide

### Hugging Face Spaces (ML Services)

**Space URL**: https://chrisdemonxxx-voiceforge-v1-0.hf.space

#### Step 1: Get Your HF Token

1. Visit: https://huggingface.co/settings/tokens
2. Click "New token"
3. Select "Write" permissions
4. Copy the token

#### Step 2: Deploy to HF Space

```bash
export HF_TOKEN=hf_your_token_here
./PUSH-TO-HF-SPACE.sh
```

#### Step 3: Test After Deployment

```bash
npx tsx test-hf-spaces-api.ts
```

**Build Time**: ~10-15 minutes

---

### Backend (Render) - ✅ Already Deployed

**URL**: https://voiceforge-api.onrender.com  
**Status**: ✅ LIVE

- API Keys: 1 key available
- Voice Library: 81 voices available
- Database: Connected

---

### Frontend (Vercel) - ⏳ Deployment Pending

**URL**: https://voiceforge-nine.vercel.app  
**Status**: ⏳ Waiting for deployment

**Issue**: Vercel proxy not working (vercel.json needs deployment)

**Solution**: 
1. Go to: https://vercel.com/chrisdemonxxxs-projects/voiceforge
2. Deploy latest commit: `8d03856edac0d15b841d9f7a989029824e678f07`
3. Or wait for auto-deploy

---

## 📋 Deployment Checklist

- [x] Backend deployed to Render
- [x] Database connected
- [x] API keys endpoint public
- [x] Voice library available (81 voices)
- [ ] Frontend deployed to Vercel (with proxy fix)
- [ ] ML services deployed to HF Spaces

---

## 🧪 Testing

### Test Backend
```bash
curl https://voiceforge-api.onrender.com/api/health
curl https://voiceforge-api.onrender.com/api/keys
curl https://voiceforge-api.onrender.com/api/voice-library | jq 'length'
```

### Test HF Spaces (after deployment)
```bash
npx tsx test-hf-spaces-api.ts
```

---

**Status**: Ready to deploy HF Spaces! 🚀

