# VoiceForge Production Deployment Guide

## Overview
Step-by-step guide to deploy VoiceForge to production on Render (backend) and Vercel (frontend).

---

## Prerequisites

✅ **Completed**:
- Code verified and built
- Secrets generated
- TypeScript errors fixed

⏳ **Need from you**:
- DATABASE_URL (PostgreSQL connection string)
- HF Spaces URL confirmation

---

## Phase 1: Environment Setup

### Step 1.1: Provide Required Information

**I need from you**:

1. **DATABASE_URL**
   - Get from Neon/Supabase dashboard
   - Format: `postgresql://user:password@host:port/database`
   - **Please provide this now**

2. **HF Spaces URL**
   - Current: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`
   - **Please confirm this is correct**

### Step 1.2: Create .env.production

Once you provide the information, I'll create the `.env.production` file with:
- Your DATABASE_URL
- Generated secrets
- HF Spaces configuration

---

## Phase 2: Local Testing

### Step 2.1: Test Production Build Locally

**Command**:
```bash
# Load environment variables
source .env.production  # or export them manually

# Start production server
npm start
```

**Expected**: Server starts on port 5000

**Test**:
```bash
curl http://localhost:5000/api/health
```

**Expected Response**: `{"status": "healthy", ...}`

### Step 2.2: Test Endpoints

**Use the test script**:
```bash
# First, create an API key
curl -X POST http://localhost:5000/api/keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key", "rateLimit": 1000}'

# Then test endpoints
./scripts/test-production-endpoints.sh http://localhost:5000 YOUR_API_KEY
```

---

## Phase 3: Backend Deployment (Render)

### Step 3.1: Prepare GitHub Repository

**Ensure code is pushed**:
```bash
git add .
git commit -m "Production ready: All plans complete"
git push origin main
```

### Step 3.2: Create Render Service

**Manual Steps** (I'll guide you):
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select the repository
5. Configure:
   - **Name**: `voiceforge-backend`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Root Directory**: `/` (root)
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### Step 3.3: Set Environment Variables on Render

**In Render Dashboard** → Your Service → "Environment":

Add these variables:
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=[YOUR_DATABASE_URL]
SESSION_SECRET=e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a
ADMIN_TOKEN=7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162
USE_HF_SPACES_ML=true
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

**I'll provide exact values once you give me DATABASE_URL**

### Step 3.4: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for build (5-10 minutes)
3. Check logs for errors
4. Note the service URL: `https://voiceforge-backend.onrender.com`

### Step 3.5: Verify Backend

```bash
curl https://your-backend.onrender.com/api/health
```

**Expected**: `{"status": "healthy", ...}`

---

## Phase 4: Frontend Deployment (Vercel)

### Step 4.1: Create Vercel Project

**Manual Steps** (I'll guide you):
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (or `cd client && npm run build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 4.2: Set Environment Variables on Vercel

**In Vercel Dashboard** → Project → "Settings" → "Environment Variables":

Add:
```bash
VITE_API_URL=https://your-backend.onrender.com
```

**Replace with your actual Render backend URL**

### Step 4.3: Deploy

1. Click "Deploy"
2. Wait for build (2-3 minutes)
3. Note the deployment URL: `https://voiceforge.vercel.app`

### Step 4.4: Verify Frontend

Visit the URL - frontend should load and connect to backend.

---

## Phase 5: Production Testing

### Step 5.1: Health Checks

```bash
# Backend
curl https://your-backend.onrender.com/api/health

# HF Spaces
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health

# Frontend (visit in browser)
https://your-frontend.vercel.app
```

### Step 5.2: Create API Key

**Via API**:
```bash
curl -X POST https://your-backend.onrender.com/api/keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Key", "rateLimit": 1000}'
```

**Via Frontend**:
- Visit frontend URL
- Go to API Keys page
- Create new key

### Step 5.3: Test All Endpoints

**Use test script**:
```bash
./scripts/test-production-endpoints.sh \
  https://your-backend.onrender.com \
  YOUR_API_KEY
```

### Step 5.4: Test User Flows

- [ ] Create API key via frontend
- [ ] Test TTS in playground
- [ ] Test STT with audio upload
- [ ] Test VLLM conversation
- [ ] Test voice cloning
- [ ] Test agent flow creation

---

## Phase 6: Monitoring Setup

### Step 6.1: Error Monitoring (Optional)

**Options**:
- Sentry (recommended)
- LogRocket
- Rollbar

### Step 6.2: Uptime Monitoring (Recommended)

**Options**:
- UptimeRobot (free)
- Pingdom
- StatusCake

**Monitor**:
- Backend health endpoint
- Frontend URL
- HF Spaces health

### Step 6.3: Performance Monitoring

**Render Dashboard**:
- Monitor CPU/Memory
- Check response times
- Review logs

**Vercel Dashboard**:
- Monitor build times
- Check deployment status
- Review analytics

---

## Troubleshooting

### Backend Issues

**Build fails**:
- Check Render logs
- Verify dependencies in package.json
- Check for TypeScript errors

**Health check fails**:
- Verify environment variables
- Check database connection
- Review server logs

**ML services fail**:
- Check HF Spaces URL
- Verify HF Spaces is running
- Check network connectivity

### Frontend Issues

**Build fails**:
- Check Vercel logs
- Verify VITE_API_URL is set
- Check for build errors

**API calls fail**:
- Verify VITE_API_URL points to backend
- Check CORS configuration
- Verify backend is accessible

---

## Success Criteria

After deployment:
- [ ] Backend accessible and healthy
- [ ] Frontend loads correctly
- [ ] All API endpoints work
- [ ] ML services connected
- [ ] User flows functional
- [ ] Monitoring in place

---

## Next Steps

**Right now, I need from you**:
1. ✅ DATABASE_URL
2. ✅ HF Spaces URL confirmation

**Then I'll**:
- Create .env.production
- Guide you through local testing
- Help deploy to Render
- Help deploy to Vercel
- Test everything end-to-end

---

## Files Ready

- ✅ `DEPLOYMENT-SECRETS.md` - Generated tokens
- ✅ `DEPLOYMENT-ENV-VARS-NEEDED.md` - What we need
- ✅ `scripts/setup-production-env.sh` - Setup helper
- ✅ `scripts/test-production-endpoints.sh` - Testing script
- ✅ `DEPLOYMENT-GUIDE.md` - This guide

---

**Status**: Waiting for DATABASE_URL and HF Spaces URL


