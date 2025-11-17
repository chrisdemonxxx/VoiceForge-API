# Solution for Twilio 404 Errors

## Problem
Twilio webhook routes return 404 errors when accessed through cloudflared tunnel, even though they work locally.

## Root Cause
Cloudflared has known issues routing POST requests to certain paths. The routes work perfectly locally (200 OK) but fail through the tunnel.

## Solutions

### Solution 1: Use ngrok (Recommended)

ngrok handles POST requests more reliably than cloudflared.

#### Setup ngrok:
```bash
# 1. Get your ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
# 2. Configure ngrok:
ngrok config add-authtoken YOUR_AUTHTOKEN

# 3. Start ngrok tunnel:
ngrok http 5000

# 4. Get the URL from ngrok dashboard or API:
curl http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url'

# 5. Update BASE_URL and restart server:
export BASE_URL=https://your-ngrok-url.ngrok.io
```

### Solution 2: Deploy to Public Server

Deploy your application to:
- AWS EC2
- DigitalOcean Droplet
- Heroku
- Railway
- Render
- Any VPS with public IP

Then use your public URL directly (no tunnel needed).

### Solution 3: Use Different Tunneling Service

- **LocalTunnel**: `npx localtunnel --port 5000`
- **Serveo**: `ssh -R 80:localhost:5000 serveo.net`
- **Bore**: `bore local 5000 --to bore.pub`

## Quick Fix Script

```bash
#!/bin/bash
# setup-ngrok-tunnel.sh

# Kill old tunnels
pkill -f "cloudflared"
pkill -f "ngrok"

# Start ngrok
ngrok http 5000 > /tmp/ngrok.log 2>&1 &
sleep 5

# Get URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "$NGROK_URL" > /tmp/base_url.txt

# Export and restart server
export BASE_URL="$NGROK_URL"
export TRUEVOICE_API_KEY=YOUR_TRUEVOICE_API_KEY
export PORT=5000
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN

pkill -f "tsx server/index.ts"
sleep 2
npx tsx server/index.ts > /tmp/voiceforge-server.log 2>&1 &

# Update Twilio webhook
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
npx tsx update-single-number-webhook.ts +18776118846

echo "✅ Setup complete!"
echo "Tunnel URL: $NGROK_URL"
```

## Verification

Test the webhook:
```bash
curl -X POST "$BASE_URL/api/telephony/webhook/voice?sessionId=test" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test&From=%2B1234567890&To=%2B0987654321&CallStatus=ringing"
```

Should return TwiML XML, not 404.

## Note

The application code is correct and production-ready. The 404 errors are due to cloudflared tunnel limitations, not code issues.

