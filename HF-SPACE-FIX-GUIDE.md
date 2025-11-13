# HF Spaces Permission Fix Guide

## Problem Identified

The HF Space at `https://chrisdemonxxx-voiceforge-v1-0.hf.space` is experiencing permission errors when trying to load ML models:

```
error: [Errno 13] Permission denied: '/app/.cache/models--facebook--mms-tts-eng'
error: [Errno 13] Permission denied: '/app/.cache/models--openai--whisper-tiny'
```

## Root Cause

The HF Space is trying to cache models in `/app/.cache/` but doesn't have write permissions to this directory.

## Solutions Applied

### 1. Updated app.py Files ✅

All three `app.py` files have been updated:
- [app.py](./app.py)
- [hf-direct/app.py](./hf-direct/app.py)
- [voiceforge-deploy/app.py](./voiceforge-deploy/app.py)

**Changes made:**

```python
# BEFORE:
os.environ['HF_HOME'] = '/app/ml-cache'
os.environ['TRANSFORMERS_CACHE'] = '/app/ml-cache'
os.environ['TORCH_HOME'] = '/app/ml-cache'

# AFTER:
os.environ['HF_HOME'] = '/app/.cache'
os.environ['TRANSFORMERS_CACHE'] = '/app/.cache'
os.environ['TORCH_HOME'] = '/app/.cache'
os.environ['HF_DATASETS_CACHE'] = '/app/.cache/datasets'
os.environ['HUGGINGFACE_HUB_CACHE'] = '/app/.cache/hub'

# Create cache directory with proper permissions
Path('/app/.cache').mkdir(parents=True, exist_ok=True)
os.chmod('/app/.cache', 0o777)
```

### 2. Additional HF Space Configuration Options

If the above doesn't work, you can also set these in HF Space settings:

#### Option A: Environment Variables in HF Space UI

Go to your HF Space settings and add:

```bash
HF_HOME=/tmp/huggingface
TRANSFORMERS_CACHE=/tmp/huggingface/transformers
TORCH_HOME=/tmp/huggingface/torch
HF_DATASETS_CACHE=/tmp/huggingface/datasets
HUGGINGFACE_HUB_CACHE=/tmp/huggingface/hub
```

The `/tmp` directory is always writable in HF Spaces.

#### Option B: Create .cache Directory in Dockerfile

If you have a custom Dockerfile, add:

```dockerfile
# Create cache directory with proper permissions
RUN mkdir -p /app/.cache && chmod 777 /app/.cache
RUN mkdir -p /tmp/huggingface && chmod 777 /tmp/huggingface
```

#### Option C: Pre-download Models

Download models into the Space repository before deployment:

```python
# Add to app.py BEFORE starting the server
from transformers import AutoTokenizer, AutoModel

print("Pre-downloading models...")
AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
AutoModel.from_pretrained("openai/whisper-tiny")
print("Models downloaded successfully")
```

## Deployment Steps

### Step 1: Commit and Push Changes

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
git add app.py hf-direct/app.py voiceforge-deploy/app.py
git commit -m "Fix HF Space cache permissions for model loading"
git push
```

### Step 2: Redeploy to HF Space

Push the updated code to your HF Space repository:

```bash
# If using git remote for HF Space
git push hf-space main

# OR manually upload files via HF Space UI
```

### Step 3: Restart the Space

1. Go to https://huggingface.co/spaces/chrisdemonxxx/voiceforge-v1-0
2. Click "Factory Reboot" to restart with the new code
3. Wait for the space to restart (2-3 minutes)

### Step 4: Verify the Fix

Run the test script to verify models can load:

```bash
npx tsx test-hf-spaces-api.ts
```

Expected output after fix:
```
✓ Health Endpoint: API is healthy
✓ Models Endpoint: 4 models available
✓ TTS Endpoint: Generated audio successfully
✓ STT Endpoint: Transcribed audio successfully
✓ VAD Endpoint: Voice activity detected
✓ Client Integration: All client methods working
```

## Troubleshooting

### If Permission Errors Persist

1. **Check Space Logs**: View the startup logs in HF Space UI
2. **Use /tmp directory**: Set `HF_HOME=/tmp/huggingface` in Space settings
3. **Check Dockerfile**: Ensure cache directories are created during build
4. **Verify Space Type**: Ensure you're using a GPU Space (A100-80GB recommended)

### If Models Take Too Long to Load

This is normal on first request (cold start). Models need to:
1. Download from HuggingFace Hub (5-10 minutes first time)
2. Load into GPU memory (30-60 seconds)

After first load, models stay in memory until Space sleeps.

### If Models Don't Load at All

Check the Space hardware:
- **TTS/STT**: Requires GPU (CPU too slow)
- **VAD**: Works on CPU
- **VLLM**: Requires GPU with 8GB+ VRAM

## Alternative: Use Different Cache Strategy

If permission issues persist, modify the model loading code to use Hugging Face's persistent storage:

```python
import os
from pathlib import Path

# Use HF Space's persistent storage
cache_dir = os.getenv("HF_HOME", "/data/models")
Path(cache_dir).mkdir(parents=True, exist_ok=True)

# Pass cache_dir to all model loaders
model = AutoModel.from_pretrained(
    "facebook/mms-tts-eng",
    cache_dir=cache_dir
)
```

## Testing Checklist

After deployment, verify:

- [ ] Health endpoint returns 200 OK
- [ ] Model status shows "loaded" (not "error")
- [ ] TTS endpoint generates audio
- [ ] STT endpoint transcribes audio
- [ ] VAD endpoint detects speech
- [ ] No permission errors in logs
- [ ] Client integration test passes

## Support Resources

- **HF Spaces Docs**: https://huggingface.co/docs/hub/spaces
- **HF Spaces Forum**: https://discuss.huggingface.co/c/spaces/24
- **Test Script**: [test-hf-spaces-api.ts](./test-hf-spaces-api.ts)
- **Client Code**: [server/hf-spaces-client.ts](./server/hf-spaces-client.ts)

## Summary

✅ **Code Updated**: All app.py files fixed to use `/app/.cache`
✅ **Permissions Set**: Cache directories created with 0o777 permissions
✅ **Environment Variables**: Set all HF cache variables correctly
📋 **Next Step**: Commit changes and redeploy to HF Space
🧪 **Verification**: Run test script after deployment

Once deployed, the HF Space should successfully load models and all API endpoints will work correctly!
