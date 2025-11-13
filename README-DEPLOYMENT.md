# VoiceForge API - Hugging Face Spaces Deployment Guide

## 🚀 Deployment on 80GB A100 GPU

This guide walks you through deploying VoiceForge API on Hugging Face Spaces with an 80GB A100 GPU.

---

## 📋 Prerequisites

1. **Hugging Face Account**: Create at [huggingface.co](https://huggingface.co)
2. **Hugging Face Token**: Generate at [Settings → Access Tokens](https://huggingface.co/settings/tokens)
3. **GitHub Repository**: Push this code to GitHub
4. **Payment Method**: A100 GPU costs ~$4.13/hour

---

## 🛠️ Step 1: Create Hugging Face Space

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces)
2. Click **"Create new Space"**
3. Configure:
   - **Space name**: `voiceforge-api` (or your choice)
   - **License**: Choose appropriate license
   - **SDK**: Select **Docker**
   - **Hardware**: Start with **CPU basic** (upgrade later)
   - **Visibility**: Private or Public

4. Click **"Create Space"**

---

## 🔗 Step 2: Link to GitHub Repository

### Option A: Direct Upload
1. In your Space, click **"Files"** tab
2. Upload all files from this project
3. Ensure `Dockerfile`, `app.py`, and `package.json` are present

### Option B: GitHub Sync (Recommended)
1. Push this project to GitHub
2. In your Space settings, go to **"Repository"** → **"Link to GitHub"**
3. Authorize and select your repository
4. Enable **"Auto-sync from GitHub"**

---

## ⚙️ Step 3: Configure Environment Secrets

In your Space settings, go to **"Settings"** → **"Repository secrets"** and add:

### Required Secrets:
```bash
# Database (use Neon, Supabase, or other remote PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Hugging Face (for TTS models)
HUGGINGFACE_TOKEN=hf_your_token_here

# OpenAI (for VLLM fallback if needed)
OPENAI_API_KEY=sk-your-key-here

# Telephony (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Telephony (Zadarma - if using)
ZADARMA_API_KEY=your_zadarma_key
ZADARMA_API_SECRET=your_zadarma_secret
ZADARMA_SIP_USERNAME=your_sip_username
ZADARMA_SIP_PASSWORD=your_sip_password

# Session Secret
SESSION_SECRET=your_random_secret_at_least_32_chars
```

---

## 🎛️ Step 4: Upgrade to A100 GPU

1. Go to Space **"Settings"** → **"Hardware"**
2. Click **"Change hardware"**
3. Select **"A100 - 80GB"** ($4.13/hour)
4. Configure **Sleep time**:
   - **Recommended**: 1 hour (auto-sleep after 1 hour of inactivity)
   - **Production**: Disabled (always running)
5. Click **"Update"**

---

## 🏗️ Step 5: Build and Deploy

1. Space will automatically build using the `Dockerfile`
2. Build process takes **10-15 minutes**:
   - Install Node.js dependencies
   - Install Python ML dependencies
   - Download and cache ML models
3. Once built, Space status changes to **"Running"**

---

## ✅ Step 6: Verify Deployment

### Check Health Endpoint:
```bash
curl https://your-username-voiceforge-api.hf.space/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-07T...",
  "gpu": {
    "available": true,
    "device": "NVIDIA A100-SXM4-80GB",
    "memory_allocated": "45.2 GB",
    "memory_reserved": "48.0 GB"
  }
}
```

### Test API Endpoints:
```bash
# Test TTS
curl -X POST https://your-username-voiceforge-api.hf.space/api/v1/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from VoiceForge", "model": "chatterbox", "voice_id": "default"}'

# Test STT (requires audio file)
curl -X POST https://your-username-voiceforge-api.hf.space/api/v1/stt/transcribe \
  -F "audio=@test-audio.wav"
```

---

## 🔧 Step 7: Configure Auto-Sleep (Cost Optimization)

To save costs when not in use:

```python
from huggingface_hub import HfApi

api = HfApi()
api.set_space_sleep_time(
    repo_id="your-username/voiceforge-api",
    sleep_time=3600  # 1 hour in seconds
)
```

**Sleep Time Options:**
- `900` = 15 minutes (quick wake-up, moderate savings)
- `3600` = 1 hour (balanced)
- `14400` = 4 hours (maximum savings for testing)
- `-1` = Disabled (always running, production)

---

## 📊 Monitoring and Logs

### View Logs:
1. Go to your Space
2. Click **"Logs"** tab
3. Monitor startup and runtime logs

### Check GPU Usage:
```bash
curl https://your-username-voiceforge-api.hf.space/api/health | jq '.gpu'
```

---

## 💰 Cost Management

### Billing Dashboard:
- View at [huggingface.co/settings/billing](https://huggingface.co/settings/billing)
- Monitor usage in real-time
- Set spending limits

### Cost Estimates (80GB A100):
| Usage Pattern | Monthly Cost |
|---------------|--------------|
| 24/7 Running | ~$2,973 |
| 12 hrs/day (auto-sleep) | ~$1,487 |
| 8 hrs/day (dev mode) | ~$991 |
| 4 hrs/day (testing) | ~$496 |

---

## 🚨 Troubleshooting

### Build Fails:
- Check `Dockerfile` syntax
- Verify all files are uploaded
- Check build logs for specific errors

### Space Won't Start:
- Verify all environment secrets are set
- Check that port 7860 is exposed
- Review startup logs

### GPU Not Detected:
- Ensure A100 hardware is selected
- Verify PyTorch CUDA installation
- Check `app.py` GPU detection code

### API Endpoints Not Working:
- Verify Space is "Running" (not "Sleeping")
- Check that models loaded successfully
- Review application logs

---

## 📚 Additional Resources

- **Hugging Face Spaces Docs**: https://huggingface.co/docs/hub/spaces
- **GPU Pricing**: https://huggingface.co/pricing
- **Support**: support@huggingface.co

---

## 🎯 Production Checklist

Before going live:

- [ ] All environment secrets configured
- [ ] Database connection tested (remote PostgreSQL)
- [ ] Health endpoint responds correctly
- [ ] All API endpoints tested
- [ ] GPU detection confirmed
- [ ] Models loading successfully
- [ ] Sleep time configured (if needed)
- [ ] Monitoring/logging set up
- [ ] Backup strategy in place
- [ ] Cost alerts configured

---

## 🔄 Updating Deployment

### From GitHub (Auto-sync enabled):
1. Push changes to GitHub
2. Space automatically rebuilds

### Manual Update:
1. Go to Space **"Files"** tab
2. Upload modified files
3. Space automatically rebuilds

---

## 📞 Support

For deployment issues:
- **Hugging Face**: support@huggingface.co
- **VoiceForge API**: [Your contact info]

---

**Ready to deploy? Follow steps 1-7 above! 🚀**
