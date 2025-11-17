# Render Deployment Fix

## Issue
```
bash: line 1: tsx: command not found
==> Exited with status 127
```

## Root Cause
The `tsx` command is not in the system PATH. Even though `tsx` is installed in `node_modules`, the shell can't find it directly.

## Solution
Use `npx tsx` instead of `tsx` in the start command. The `npx` command will find `tsx` in `node_modules/.bin`.

## Fix Applied
Updated `package.json`:
```json
{
  "scripts": {
    "start": "npx tsx server/index.ts"
  }
}
```

## Manual Fix (If needed)
If the auto-deployment doesn't work, manually update in Render dashboard:

1. Go to: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900/settings
2. Find "Start Command" field
3. Change from: `tsx server/index.ts`
4. Change to: `npx tsx server/index.ts`
5. Click "Save Changes"
6. Service will automatically redeploy

## Verification
Once deployed, test:
```bash
curl https://voiceforge-api-node.onrender.com/api/health
```

Should return: `{"status":"ok"}`

## Service Details
- **Name**: voiceforge-api-node
- **URL**: https://voiceforge-api-node.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900
- **Branch**: main (auto-deploy enabled)

