# Frontend Debugging Guide

## Common Issues and Solutions

### Issue: "Nothing Works" After Frontend Redeploy

#### 1. Check Backend Status
```bash
curl https://voiceforge-api.onrender.com/api/health
```

**Expected**: `{"status": "healthy", "database": {"status": "connected"}}`

#### 2. Check API Proxy Configuration

The frontend uses Vercel's proxy rewrites. Verify `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://voiceforge-api.onrender.com/api/:path*"
    }
  ]
}
```

#### 3. Test API Proxy from Frontend

Open browser console on your frontend URL and run:

```javascript
// Test API keys endpoint
fetch('/api/keys')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test health endpoint
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**If these fail**, the Vercel proxy isn't working.

#### 4. Check CORS Headers

The backend should allow requests from your frontend domain. Check if CORS is configured.

#### 5. Check Environment Variables

Verify Vercel environment variables:
- No `VITE_API_URL` needed (uses proxy)
- If `VITE_API_URL` is set, it will bypass the proxy

#### 6. Check Browser Console

Open browser DevTools → Console and look for:
- CORS errors
- 404 errors (proxy not working)
- 401 errors (API key issues)
- Network errors

#### 7. Verify Vercel Deployment

1. Go to Vercel Dashboard
2. Check latest deployment logs
3. Verify `vercel.json` is included in build
4. Check if rewrites are applied

---

## Quick Fixes

### Fix 1: Force Direct Backend URL

If proxy isn't working, set environment variable in Vercel:

```
VITE_API_URL=https://voiceforge-api.onrender.com
```

This bypasses the proxy and connects directly.

### Fix 2: Check vercel.json Location

Ensure `vercel.json` is in the **root** of your repository, not in `client/` directory.

### Fix 3: Manual Redeploy

1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Deployments"
4. Click "Redeploy" on latest deployment
5. Or push a small change to trigger redeploy

### Fix 4: Check Build Output

Verify the build output directory matches `vercel.json`:
- `outputDirectory: "dist/public"` in vercel.json
- Vite builds to `dist/public` (check `vite.config.ts`)

---

## Testing Checklist

- [ ] Backend is healthy (`/api/health`)
- [ ] API keys endpoint works (`/api/keys`)
- [ ] Vercel proxy is configured (`vercel.json` exists)
- [ ] Frontend can reach `/api/keys` (browser console test)
- [ ] No CORS errors in browser console
- [ ] Environment variables are set correctly
- [ ] Build output directory matches configuration

---

## Common Error Messages

### "Failed to fetch"
- **Cause**: CORS issue or network error
- **Fix**: Check backend CORS configuration

### "404 Not Found" on `/api/*`
- **Cause**: Vercel proxy not working
- **Fix**: Check `vercel.json` configuration, verify rewrites

### "401 Unauthorized"
- **Cause**: API key missing or invalid
- **Fix**: Check API keys endpoint, verify default key exists

### "No active API key found"
- **Cause**: API keys endpoint not returning keys
- **Fix**: Check `/api/keys` endpoint, verify database connection

---

## Debug Commands

```bash
# Test backend directly
curl https://voiceforge-api.onrender.com/api/health
curl https://voiceforge-api.onrender.com/api/keys

# Test from frontend domain (replace with your Vercel URL)
curl https://your-frontend.vercel.app/api/health
curl https://your-frontend.vercel.app/api/keys
```

---

**Last Updated**: 2025-11-13

