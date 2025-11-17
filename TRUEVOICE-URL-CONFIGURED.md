# TrueVoiceStreaming URL Configuration ✅

## Status

**TRUEVOICE_BASE_URL** has been updated in Render environment variables.

## Current Configuration

- **Tunnel URL**: `wss://consolidated-optical-incentives-cognitive.trycloudflare.com`
- **Local Service**: Running on `http://localhost:8000`
- **Tunnel Type**: Cloudflared (temporary)

## Important Notes

⚠️ **Temporary Tunnel**: This cloudflared tunnel URL will expire. For production use:

### Option 1: Restart Cloudflare Tunnel Service

```bash
cd /mnt/projects/projects/TrueVoiceStreaming
sudo systemctl restart cloudflared-truevoice
```

This will use the configured tunnel from `cloudflared-config.yml` which should provide a stable URL.

### Option 2: Use Permanent Domain

The `cloudflared-config.yml` shows the tunnel is configured for `api.loopercreations.org`. If this domain is properly configured, you can use:

```bash
TRUEVOICE_BASE_URL=wss://api.loopercreations.org
```

### Option 3: Keep Temporary Tunnel Running

The current tunnel is running in the background. To keep it alive:

```bash
# Check if tunnel is running
ps aux | grep cloudflared | grep 8000

# If not running, start it:
cd /mnt/projects/projects/TrueVoiceStreaming
nohup cloudflared tunnel --url http://localhost:8000 > /tmp/truevoice-tunnel.log 2>&1 &
```

## Testing

After the Render service redeploys, make a test call:

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
export BASE_URL=https://voiceforge-api-fresh.onrender.com
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
export TWILIO_PHONE_NUMBER=+18444588448

npx tsx make-call-direct.ts +19517458409
```

## Monitoring

Check Render logs for:
- `[TrueVoice] Connected` - Connection successful
- `[StreamingPipeline] Pipeline started` - Pipeline active
- `[TrueVoice] WebSocket error` - Connection issues

## Troubleshooting

### Still Getting HTTP 530

1. **Check tunnel is running**:
   ```bash
   ps aux | grep cloudflared | grep 8000
   ```

2. **Check tunnel URL**:
   ```bash
   tail -20 /tmp/truevoice-tunnel.log | grep "https://"
   ```

3. **Test tunnel directly**:
   ```bash
   curl https://consolidated-optical-incentives-cognitive.trycloudflare.com/healthz
   ```

4. **Restart tunnel**:
   ```bash
   pkill -f "cloudflared tunnel --url http://localhost:8000"
   cd /mnt/projects/projects/TrueVoiceStreaming
   nohup cloudflared tunnel --url http://localhost:8000 > /tmp/truevoice-tunnel.log 2>&1 &
   ```

### Tunnel URL Expired

If the tunnel URL expires, get a new one:

```bash
cd /mnt/projects/projects/TrueVoiceStreaming
pkill -f "cloudflared tunnel"
nohup cloudflared tunnel --url http://localhost:8000 > /tmp/truevoice-tunnel.log 2>&1 &
sleep 5
NEW_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/truevoice-tunnel.log | head -1)
echo "New tunnel URL: ${NEW_URL/https/wss}"
```

Then update Render environment variable with the new URL.

## Production Setup

For production, set up a permanent tunnel:

1. **Use systemd service** (recommended):
   ```bash
   sudo systemctl restart cloudflared-truevoice
   sudo systemctl enable cloudflared-truevoice
   ```

2. **Or use ngrok with authtoken** (more stable):
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ngrok http 8000
   ```

3. **Update Render** with the permanent URL

## Current Status

✅ Tunnel running: `wss://consolidated-optical-incentives-cognitive.trycloudflare.com`  
✅ Render environment variable updated  
🔄 Service redeploying  
⏳ Waiting for deployment to complete

