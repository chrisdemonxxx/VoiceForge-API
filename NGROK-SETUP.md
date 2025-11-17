# Ngrok Setup for Twilio Webhooks

## Quick Setup

### Step 1: Install ngrok

If ngrok is not installed, you can:

**Option A: Download binary (no sudo required)**
```bash
cd /tmp
wget https://bin.equinox.io/c/bNyj1mQV2kg/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/  # or move to a directory in your PATH
```

**Option B: Use package manager (requires sudo)**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok -y
```

### Step 2: Authenticate ngrok (Optional but Recommended)

1. Sign up at https://ngrok.com (free)
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. Run:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```

### Step 3: Start ngrok

```bash
ngrok http 5000
```

This will start ngrok and show you a URL like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5000
```

### Step 4: Configure Twilio Webhooks

In a new terminal:

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge

# Get the ngrok URL (from the ngrok output or dashboard at http://localhost:4040)
export BASE_URL=https://abc123.ngrok-free.app  # Replace with your ngrok URL
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN

# Configure webhooks
npx tsx configure-twilio-webhooks.ts
```

### Step 5: Test

Make a test call:
```bash
export TWILIO_PHONE_NUMBER=+18444588448
export BASE_URL=https://abc123.ngrok-free.app  # Your ngrok URL
npx tsx make-call-direct.ts +19517458409
```

## Alternative: Get ngrok URL Programmatically

If ngrok is running, you can get the URL:
```bash
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "Ngrok URL: $NGROK_URL"
export BASE_URL="$NGROK_URL"
```

## Ngrok Dashboard

While ngrok is running, you can view:
- **Local dashboard**: http://localhost:4040
- See all requests in real-time
- Inspect webhook calls from Twilio

## Benefits of ngrok

- ✅ More reliable than cloudflared for webhooks
- ✅ Better debugging (dashboard shows all requests)
- ✅ Free tier available
- ✅ Works well with Twilio

## Troubleshooting

**Ngrok not starting?**
- Check if port 5000 is already in use
- Make sure server is running on port 5000

**Webhook still not working?**
- Check ngrok dashboard at http://localhost:4040
- Look for incoming requests from Twilio
- Check Twilio dashboard for error messages

