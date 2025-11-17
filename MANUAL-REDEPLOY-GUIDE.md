# Manual Redeploy Guide - Fix Vite Issues

Since the branches have unrelated histories, we'll use manual redeploy which is faster and more reliable.

## Step-by-Step Instructions

### Step 1: Access Render Shell
1. Go to Render Dashboard: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900
2. Click the **"Shell"** tab (or use SSH)
3. You'll see a terminal prompt

### Step 2: Delete Vite Files
In the Render Shell, run these commands:
```bash
cd /opt/render/project/src
rm -f server/vite.ts
rm -f vite.config.ts
ls server/vite.ts 2>/dev/null && echo "File still exists!" || echo "✅ vite.ts deleted"
ls vite.config.ts 2>/dev/null && echo "File still exists!" || echo "✅ vite.config.ts deleted"
```

### Step 3: Update Start Command (if needed)
1. Go to **"Settings"** tab in Render dashboard
2. Scroll to **"Start Command"**
3. Ensure it says: `npx tsx server/index.ts`
4. If different, update it and save

### Step 4: Trigger Manual Deploy
1. Go to **"Events"** tab
2. Click **"Manual Deploy"** button
3. Select **"Clear build cache & deploy"** (recommended)
4. Wait 2-5 minutes for deployment

### Step 5: Verify Deployment
After deployment completes, test:
```bash
curl https://voiceforge-api-node.onrender.com/api/health
```

Expected: `{"status":"ok"}`

---

## Alternative: Update via Render Dashboard

If Shell access doesn't work, you can also:

1. Go to **"Settings"** tab
2. Update **"Start Command"** to: `npx tsx server/index.ts`
3. Go to **"Environment"** tab
4. Ensure `tsx` is installed (it should be in dependencies)
5. Go to **"Events"** tab
6. Click **"Manual Deploy"** → **"Clear build cache & deploy"**

---

## What This Fixes

✅ Removes `server/vite.ts` (causing `ERR_MODULE_NOT_FOUND`)  
✅ Removes `vite.config.ts`  
✅ Uses correct start command: `npx tsx server/index.ts`  
✅ Ensures `tsx` is available in production  

---

## Troubleshooting

**If deployment still fails:**
1. Check logs: Dashboard → Events → Latest deploy → View logs
2. Verify start command: Should be `npx tsx server/index.ts`
3. Check package.json: `tsx` should be in `dependencies` (not `devDependencies`)
4. Clear build cache: Manual Deploy → Clear build cache & deploy

**If Shell doesn't work:**
- Use SSH: `ssh srv-d4d76gggjchc73dq2900@ssh.oregon.render.com`
- Or update files via Render's file editor (if available)

---

## Service Details

- **Service**: voiceforge-api-node
- **URL**: https://voiceforge-api-node.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900
- **Region**: Oregon

