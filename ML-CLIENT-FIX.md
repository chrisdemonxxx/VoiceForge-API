# ML Client Python Bridge Fix

## 🐛 Issue

HF Space was failing to initialize ML client with error:
```
[WorkerPool:stt] python3: can't open file '/app/dist/ml-services/worker_pool.py': [Errno 2] No such file or directory
```

## 🔍 Root Cause

1. TypeScript build process (`npm run build`) only bundles `.ts` files to `dist/`
2. Python ML service files (`.py`) are not copied to `dist/ml-services/`
3. Python bridge was looking for files in `dist/ml-services/` which didn't exist

## ✅ Solution

### 1. Added Path Resolution Helper

Created `resolvePythonScript()` function in `server/python-bridge.ts`:
- Checks `dist/ml-services/` first (if files were copied)
- Falls back to `server/ml-services/` (source location)
- Works in both development and production

### 2. Updated All Python Script Paths

Replaced hardcoded paths with helper function:
- `worker_pool.py` ✅
- `tts_streaming.py` ✅
- `tts_service.py` ✅
- `voice_cloning_service.py` ✅

### 3. Updated Dockerfile

Added step to copy Python ML services after build:
```dockerfile
# Copy Python ML services to dist (needed for Python bridge)
RUN mkdir -p /app/dist/ml-services && \
    cp -r /app/server/ml-services/* /app/dist/ml-services/
```

## 🧪 Testing

After redeploy:

1. **Check ML client initialization**:
   - Should see: `[MLClient] Using local Python Bridge for ML operations`
   - Should NOT see: `Worker pool startup timeout`

2. **Test health endpoint**:
   ```bash
   curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health
   ```
   - Should show: `"ml_workers": { "status": "available" }`

3. **Test ML endpoints**:
   ```bash
   curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"Hello","model":"parler-tts-mini"}'
   ```

## 📝 Files Changed

1. `server/python-bridge.ts`
   - Added `resolvePythonScript()` helper
   - Updated 4 Python script path references

2. `Dockerfile`
   - Added Python ML services copy step

## 🚀 Deployment

1. Push changes to GitHub
2. HF Space will auto-rebuild
3. Verify ML client initializes successfully

---

**Status**: ✅ Fixed, ready for deployment

**Last Updated**: 2025-11-13 10:50 UTC

