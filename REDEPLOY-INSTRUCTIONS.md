# How to Redeploy After Removing Vite Files

## Quick Fix: Manual Redeploy (Fastest - 2 minutes)

### Step 1: Delete vite files via Render Shell
1. Go to Render Dashboard: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900
2. Click **"Shell"** tab (or use SSH)
3. Run these commands:
   ```bash
   rm -f server/vite.ts
   rm -f vite.config.ts
   ```

### Step 2: Trigger Manual Redeploy
1. Go to **"Events"** tab in Render dashboard
2. Click **"Manual Deploy"** button
3. Select **"Deploy latest commit"**
4. Wait 2-5 minutes for deployment

**OR**

1. Click **"Manual Deploy"** → **"Clear build cache & deploy"** (recommended for clean deploy)

---

## Automatic Redeploy: Push to Git (Permanent Fix)

### Option A: Push to Current Branch
```bash
git push origin HEAD
```
Then merge the branch to `main` in GitHub. Render will auto-deploy.

### Option B: Merge to Main Directly
```bash
# Pull latest main
git checkout main
git pull origin main

# Merge your fix
git merge <your-branch-name>

# Push to main
git push origin main
```
Render will automatically detect the push and redeploy.

### Option C: Create New Branch
```bash
git checkout -b fix/remove-vite
git push origin fix/remove-vite
```
Then create a PR in GitHub and merge to main.

---

## Verify Deployment

After redeploy, test the service:
```bash
curl https://voiceforge-api-node.onrender.com/api/health
```

Should return: `{"status":"ok"}`

---

## What Was Fixed

✅ Removed `server/vite.ts` (imported vite package)
✅ Removed `vite.config.ts` 
✅ Updated start command to `npx tsx server/index.ts`
✅ Moved `tsx` to dependencies

---

## Service Details

- **Service**: voiceforge-api-node
- **URL**: https://voiceforge-api-node.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900
- **Branch**: main (auto-deploy enabled)

---

## Troubleshooting

If deployment still fails:
1. Check Render logs: Dashboard → Events → Latest deploy → View logs
2. Verify start command is: `npx tsx server/index.ts`
3. Ensure `tsx` is in `dependencies` (not `devDependencies`)
4. Clear build cache: Manual Deploy → Clear build cache & deploy

