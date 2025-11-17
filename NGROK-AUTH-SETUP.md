# Ngrok Authentication Setup

## Current Status

✅ **Ngrok is installed** (via snap)
❌ **Ngrok requires authentication** to use

## Quick Setup

### Step 1: Get Your Authtoken

1. Sign up at https://dashboard.ngrok.com/signup (free account)
2. Go to https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your authtoken

### Step 2: Configure ngrok

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Step 3: Start ngrok

```bash
ngrok http 5000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
```

### Step 4: Configure Twilio

```bash
# Get the ngrok URL from the output above
export BASE_URL=https://abc123.ngrok-free.app
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN

# Configure webhooks
npx tsx configure-twilio-webhooks.ts
```

## Alternative: Use Cloudflared

If you don't want to set up ngrok authentication, we can continue using cloudflared:

```bash
# Cloudflared is already running
export BASE_URL=https://web-gold-blogging-cio.trycloudflare.com
npx tsx configure-twilio-webhooks.ts
```

However, cloudflared URLs may not be accessible by Twilio. Check the Twilio dashboard for the actual error.

## Testing

Once configured, test with:
```bash
export BASE_URL=<your-ngrok-url>
export TWILIO_PHONE_NUMBER=+18444588448
npx tsx make-call-direct.ts +19517458409
```

## Ngrok Dashboard

While ngrok is running, view requests at:
- **Local**: http://localhost:4040
- See all incoming webhook requests from Twilio in real-time

