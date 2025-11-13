# Manual Redeploy Guide

## Option 1: Manual Deploy via Render Dashboard

### Steps:
1. **Go to Render Dashboard**
   - URL: https://dashboard.render.com/web/srv-d4ah1kq4d50c73ck8ce0
   - Or navigate to: Dashboard → voiceforge-api service

2. **Click "Manual Deploy"**
   - Look for the "Manual Deploy" button (usually in the top right or in the Deploys section)
   - Click it

3. **Select Commit**
   - Choose: **Latest commit** (`4facca6f1c99d1a9de3fe5668b4d7364ae08109e`)
   - Or select: "Deploy latest commit"
   - This commit contains the API key fix

4. **Wait for Deployment**
   - Build: ~2-3 minutes
   - Deploy: ~1-2 minutes
   - Total: ~3-5 minutes

---

## Option 2: Trigger Auto-Deploy (Alternative)

I can make a small commit to trigger auto-deploy automatically. This is often faster than manual deploy.

**Would you like me to:**
- Make a small commit (e.g., update a comment or README) to trigger auto-deploy?
- This will automatically trigger Render to deploy the latest code

---

## What Will Be Deployed

**Commit**: `4facca6f1c99d1a9de3fe5668b4d7364ae08109e`  
**Message**: "Make GET /api/keys public so frontend can fetch API keys"

**Changes**:
- ✅ GET `/api/keys` is now public (no admin auth required)
- ✅ Frontend can fetch API keys
- ✅ Fixes "No active API key found" error

---

## After Deployment

Test the fix:
```bash
# Should work without admin token
curl https://voiceforge-api.onrender.com/api/keys | jq
```

**Expected**: Returns array of API keys (including the default key)

---

**Status**: Ready for manual deploy or auto-deploy trigger

