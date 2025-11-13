# 🚀 VoiceForge API - Quick Deployment Guide

Your VoiceForge API is ready to deploy to Hugging Face Spaces!

---

## ✅ Pre-Deployment Checklist

Your Space: **https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI**

- ✅ Space created
- ✅ HF_TOKEN configured
- ✅ All deployment files ready
- ✅ License files included

---

## 🎯 Simple 3-Step Deployment

### Step 1: Download Deployment Files

Download these essential files to your computer:

**Core Deployment Files:**
- `Dockerfile`
- `app.py`
- `requirements-deployment.txt`
- `.dockerignore`
- `SPACE_CONFIG.yaml`

**Documentation:**
- `README.md`
- `LICENSES.md`
- `LICENSE`

**Application Code:**
- `client/` (entire folder)
- `server/` (entire folder)
- `shared/` (entire folder)
- `db/` (entire folder)
- `public/` (entire folder)

**Configuration:**
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.js`
- `vite.config.ts`
- `drizzle.config.ts`

---

### Step 2: Upload to Hugging Face Space

**Option A: Web UI Upload** (Easiest)

1. Go to: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI/tree/main

2. Click "Add file" → "Upload files"

3. Drag and drop ALL the files/folders from Step 1

4. Commit message: "Deploy VoiceForge API v1.0"

5. Click "Commit changes to main"

**Option B: Git Command Line**

```bash
# On your local machine
cd /path/to/voiceforge

# Initialize git if needed
git init

# Add Hugging Face Space as remote
git remote add hf https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI

# Configure authentication
git config credential.helper store
echo "https://oauth2:YOUR_HF_TOKEN@huggingface.co" > ~/.git-credentials

# Add files
git add Dockerfile app.py requirements-deployment.txt
git add client/ server/ shared/ db/ public/
git add package.json package-lock.json tsconfig.json
git add tailwind.config.ts postcss.config.js vite.config.ts drizzle.config.ts
git add README.md LICENSE LICENSES.md

# Commit
git commit -m "Deploy VoiceForge API v1.0 - Production Ready"

# Push to HF Space
git push hf main
```

---

### Step 3: Configure Space Settings

1. **Go to Settings**: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI/settings

2. **Add Repository Secrets** (click "New secret"):

   **Required:**
   ```
   DATABASE_URL = postgresql://user:pass@host:5432/dbname
   ```

   **Optional** (for telephony features):
   ```
   TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN = xxxxxxxxxxxxx
   ZADARMA_API_KEY = xxxxxxxxxxxxx
   ZADARMA_API_SECRET = xxxxxxxxxxxxx
   ZADARMA_SIP_USERNAME = 535022-100
   ZADARMA_SIP_PASSWORD = xxxxxxxxxxxxx
   TEST_PHONE_FROM = +1234567890
   TEST_PHONE_TO = +0987654321
   ```

3. **Upgrade Hardware**:
   - Scroll to "Space hardware"
   - Select: **Nvidia L40S** (62GB, $1.80/hour)
   - Sleep time: **3600 seconds** (1 hour)
   - Click "Request hardware"

4. **Save Settings**

---

## 📊 Monitor Deployment

### Build Progress

1. Go to your Space: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI

2. Click "Logs" tab

3. Watch for these success messages:
   ```
   ✓ PyTorch 2.1.2+cu121 installed
   ✓ GPU Detected: NVIDIA L40S
   ✓ GPU Memory: 62.00 GB
   ✓ Server running on port 7860
   ```

4. Build time: **10-15 minutes**

---

## 🧪 Test Your Deployment

Once status shows "Running":

### Health Check
```bash
curl https://chrisdemonxxx-voiceforgeai.hf.space/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-07T...",
  "database": {"status": "connected"},
  "ml_workers": {"status": "available"}
}
```

### Test TTS
```bash
curl -X POST https://chrisdemonxxx-voiceforgeai.hf.space/api/tts \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello from VoiceForge!",
    "voice": "en-US-AvaNeural"
  }' \
  --output test.wav
```

---

## 💡 Quick Tips

### If Build Fails:
1. Check Logs tab for specific error
2. Verify all files were uploaded
3. Check DATABASE_URL is correctly set in secrets
4. Ensure Space SDK is set to "Docker"

### If CUDA Not Available:
1. Verify L40S GPU is selected
2. Wait for hardware upgrade to complete
3. Check rebuild triggered after hardware change

### Database Setup:
If you don't have a database yet:
1. Create free PostgreSQL at: https://neon.tech
2. Copy connection string
3. Add as DATABASE_URL secret in Space settings

---

## 🎉 You're Done!

Your VoiceForge API is now deployed and ready to use!

**Access your platform**:
- **Space URL**: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI
- **API Endpoint**: https://chrisdemonxxx-voiceforgeai.hf.space
- **Health Check**: https://chrisdemonxxx-voiceforgeai.hf.space/api/health

**Next steps**:
1. Test all API endpoints
2. Configure auto-sleep for cost savings
3. Share your Space with the community!
4. Build amazing voice AI applications!

---

## 📚 Additional Resources

- **Full Documentation**: README-DEPLOYMENT.md
- **License Info**: LICENSES.md
- **Troubleshooting**: DEPLOYMENT-SUMMARY.md

---

**Need Help?**

Check the Logs tab in your Space for detailed build information and error messages.

**Happy Building!** 🎉
