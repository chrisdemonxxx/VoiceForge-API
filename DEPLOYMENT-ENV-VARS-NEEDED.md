# Environment Variables Needed for Deployment

## Required Information

To proceed with deployment, I need the following information from you:

### 1. Database URL (Required)
**Format**: `postgresql://user:password@host:port/database`

**Where to get it**:
- **Neon**: Dashboard → Your project → Connection string
- **Supabase**: Project Settings → Database → Connection string
- **Other PostgreSQL**: Your database provider's connection string

**Please provide**: Your DATABASE_URL

---

### 2. HF Spaces URL (Verify)
**Current value**: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`

**Please confirm**: 
- Is this the correct URL for your HF Spaces deployment?
- Or do you have a different URL?

---

### 3. Admin Token ✅ GENERATED
**Purpose**: Secure access to API key management endpoints

**Generated Token**: `7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162`

**Status**: ✅ Ready to use (see DEPLOYMENT-SECRETS.md)

---

### 4. Session Secret ✅ GENERATED
**Purpose**: Session security and cookie signing

**Generated Secret**: `e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a`

**Status**: ✅ Ready to use (see DEPLOYMENT-SECRETS.md)

---

## Optional Information (Can set later)

### 5. Twilio Credentials (If using telephony)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### 6. Zadarma Credentials (If using telephony)
- `ZADARMA_API_KEY`
- `ZADARMA_API_SECRET`
- Or SIP credentials

---

## What I'll Do

Once you provide the required information, I will:
1. Generate secrets (if you choose Option A)
2. Create `.env.production` file (for local testing)
3. Prepare environment variable configuration for Render
4. Prepare environment variable configuration for Vercel
5. Guide you through setting them in each platform

---

## Security Note

- Never commit `.env` files to Git
- Use strong, random secrets for production
- Rotate secrets periodically
- Keep secrets secure and private

---

## Next Steps

Please provide:
1. ✅ DATABASE_URL
2. ✅ Confirm HF Spaces URL (or provide new one)
3. ✅ Choose Option A or B for Admin Token
4. ✅ Choose Option A or B for Session Secret

Once I have this information, I'll proceed with the deployment setup.

