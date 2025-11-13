# Render Environment Variables Configuration

## Required Environment Variables for Backend Deployment

Copy these environment variables to your Render service:

### Server Configuration
```
NODE_ENV=production
PORT=5000
```

### Database Configuration
```
DATABASE_URL=postgresql://voiceforge_ucpb_user:xo7F9IdJSYYEbqfrsEtpA7KdOfr09V6K@dpg-d4aj56pr0fns73eb88ug-a.oregon-postgres.render.com/voiceforge_ucpb
```

### Security Configuration
```
SESSION_SECRET=e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a
ADMIN_TOKEN=7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162
```

### ML Services Configuration
```
USE_HF_SPACES_ML=true
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

---

## How to Set Environment Variables in Render

1. Go to your Render service dashboard
2. Click on your service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable above (one at a time)
6. Click **Save Changes**

---

## Optional: Telephony Configuration

If you're using telephony features, add these:

### Twilio (if using)
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Zadarma (if using)
```
ZADARMA_API_KEY=your_zadarma_api_key
ZADARMA_API_SECRET=your_zadarma_api_secret
```

---

## Verification

After setting environment variables:
1. Restart your Render service
2. Check logs to verify database connection
3. Test health endpoint: `https://your-service.onrender.com/api/health`


