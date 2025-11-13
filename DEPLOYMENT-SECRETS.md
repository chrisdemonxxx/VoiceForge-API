# Generated Production Secrets

## ⚠️ SECURITY WARNING
**DO NOT commit this file to Git!**  
**Keep these secrets secure and private!**

## Generated Tokens

I've generated secure random tokens for you:

### Admin Token
```
7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162
```

**Usage**: Add to `ADMIN_TOKEN` environment variable  
**Purpose**: Secure access to API key management endpoints

### Session Secret
```
e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a
```

**Usage**: Add to `SESSION_SECRET` environment variable  
**Purpose**: Session security and cookie signing

---

## Next Steps

1. **Save these tokens securely** (password manager recommended)
2. **Provide your DATABASE_URL** (I'll ask for this)
3. **Confirm HF Spaces URL** (or provide new one)
4. I'll then create the complete environment configuration

---

## Environment Variables Summary

Once you provide DATABASE_URL, here's what we'll configure:

### Backend (Render)
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=[YOUR_DATABASE_URL]
SESSION_SECRET=e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a
ADMIN_TOKEN=7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162
USE_HF_SPACES_ML=true
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

### Frontend (Vercel)
```bash
VITE_API_URL=https://your-backend.onrender.com
```
(Will be set after backend deployment)

---

## Security Best Practices

- ✅ Tokens are 64 characters (32 bytes hex) - very secure
- ✅ Never share these tokens publicly
- ✅ Rotate tokens periodically (every 90 days recommended)
- ✅ Use different tokens for staging and production
- ✅ Store in secure password manager


