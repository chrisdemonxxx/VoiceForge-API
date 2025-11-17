# Troubleshooting Guide

## Issue: Calls Disconnect with "Application Error"

### Symptoms
- Call is initiated successfully (get Call SID)
- Call immediately disconnects
- No webhook requests in server logs
- Error message: "Application error has occurred goodbye and disconnected"

### Root Cause
**Twilio cannot reach the server through the tunnel URL**

The server code is correct, but Twilio's webhook requests are not reaching the server.

### Diagnosis Steps

1. **Check Server Logs**
   ```bash
   tail -f /tmp/voiceforge-server.log
   ```
   - Look for `[TwilioWebhook]` messages
   - If none appear, Twilio isn't reaching the server

2. **Check Twilio Dashboard**
   - Go to: Twilio Console → Monitor → Logs
   - Find your call (Call SID: CAxxxxx)
   - Check the error message - it will show why the webhook failed
   - Common errors:
     - "Connection timeout"
     - "DNS resolution failed"
     - "SSL certificate error"
     - "URL not accessible"

3. **Test Webhook Manually**
   ```bash
   curl -X POST "https://your-tunnel-url.com/api/telephony/webhook/voice" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "CallSid=test&From=%2B18444588448&To=%2B19517458409"
   ```
   - If this works, the endpoint is fine
   - If it fails, the tunnel isn't working

### Solutions

#### Option 1: Use ngrok (Recommended for Testing)
```bash
# Install ngrok
# Get free account at ngrok.com
ngrok http 5000 --domain=your-fixed-domain.ngrok-free.app

# Update BASE_URL
export BASE_URL=https://your-fixed-domain.ngrok-free.app

# Reconfigure webhooks
npx tsx configure-twilio-webhooks.ts
```

#### Option 2: Use Cloudflared with Fixed Domain
```bash
# Set up cloudflared with a fixed domain
cloudflared tunnel create voiceforge
cloudflared tunnel route dns voiceforge webhook.yourdomain.com
cloudflared tunnel run voiceforge
```

#### Option 3: Deploy to Public Server
- Deploy to VPS (DigitalOcean, AWS, etc.)
- Use a public domain name
- Configure DNS properly
- Update BASE_URL to your production URL

#### Option 4: Check Firewall/Network
- Ensure port 5000 is accessible
- Check if cloudflared is properly forwarding
- Verify tunnel URL hasn't expired

### Current Configuration

- **Webhook Endpoint**: `/api/telephony/webhook/voice`
- **Status Callback**: `/api/telephony/webhook/status`
- **Tunnel URL**: `https://web-gold-blogging-cio.trycloudflare.com`
- **All 6 phone numbers configured**

### Next Steps

1. **Check Twilio Dashboard** - This will show the exact error
2. **Test webhook manually** - Verify tunnel is working
3. **Use ngrok** - More reliable for webhook testing
4. **Deploy to production** - Best long-term solution

The code is working correctly - the issue is infrastructure/network connectivity.

