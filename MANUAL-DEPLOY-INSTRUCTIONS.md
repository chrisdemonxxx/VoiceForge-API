# Manual Vercel Deployment Instructions

## Current Situation

- ✅ **Latest commit with fixes**: `d0e1784bafa0514da2d83caca1accaec7c0e85e3`
- ⏳ **Vercel auto-deploy**: Not working (may need configuration)

## Manual Deployment Steps

### Option 1: Deploy from Deployments Page

1. **Go to Vercel Deployments**:
   - URL: https://vercel.com/chrisdemonxxxs-projects/voiceforge/deployments
   - Or: Dashboard → voiceforge → Deployments tab

2. **Find Latest Commit**:
   - Look for commit: `d0e1784bafa0514da2d83caca1accaec7c0e85e3`
   - Or any commit with message: "Trigger Vercel auto-deploy from latest commit"
   - Or: "Trigger Vercel frontend redeploy"

3. **Redeploy**:
   - Click the `...` (three dots) menu next to the commit
   - Click "Redeploy"
   - Wait for deployment (~2-3 minutes)

### Option 2: Check Auto-Deploy Settings

1. **Go to Project Settings**:
   - URL: https://vercel.com/chrisdemonxxxs-projects/voiceforge/settings
   - Or: Dashboard → voiceforge → Settings

2. **Check Git Integration**:
   - Go to "Git" section
   - Verify branch: `claude/init-project-voiceforge-011CV2gpZZMiZ1z4LtptWqF9`
   - Ensure "Auto Deploy" is **enabled**
   - If disabled, enable it and save

3. **Trigger Deployment**:
   - After enabling, Vercel should auto-detect new commits
   - Or manually trigger from Deployments page

## What Will Be Deployed

✅ **Frontend API Client Fix**:
- Supports Vercel proxy (relative URLs)
- Fallback to `VITE_API_URL` env var

✅ **Vercel Configuration**:
- `vercel.json` with API proxy rewrites
- WebSocket proxy configuration

✅ **All Previous Fixes**:
- GET `/api/keys` is public (backend)
- 81 pre-trained voices available

## After Deployment

Once deployed, test:
1. **API Keys**: Should load without "No active API key found" error
2. **Voice Library**: All 81 voices should display
3. **Real-Time Testing**: Playground should work

---

**Status**: All fixes ready, waiting for Vercel deployment 🚀

