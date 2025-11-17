# Making Test Calls

## Quick Start

**Important**: Always run commands from the project directory:

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
```

## Option 1: Direct Call Script

```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge

export BASE_URL=https://voiceforge-api-fresh.onrender.com
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
export TWILIO_PHONE_NUMBER=+18444588448

npx tsx make-call-direct.ts +19517458409
```

## Option 2: Call Your Twilio Number

Simply call any of your configured Twilio numbers:
- +18444588448
- +18776118846
- +18778663959
- +18666165667
- +9721809456331
- +18666555667

The call will automatically connect to your Render service.

## Monitoring

### Render Logs
https://dashboard.render.com/web/srv-d4d7jf6r433s73duopvg

### Twilio Console
https://console.twilio.com → Monitor → Logs

### What to Look For

**In Render Logs:**
- `[TwilioWebhook] Stream URL: wss://voiceforge-api-fresh.onrender.com/...`
- `[TwilioMedia] Stream authenticated for session: ...`
- `[StreamingPipeline] Pipeline started`
- `[TrueVoice] Connected`
- `[TrueVoice] Audio chunk received`
- `[TrueVoice] Audio chunk sent`

**In Twilio Console:**
- Call status: `queued` → `ringing` → `in-progress` → `completed`
- Webhook requests: Should show 200 OK responses
- Media Stream: Should show connected status

## Troubleshooting

### "Cannot find module" Error

**Problem**: Running script from wrong directory

**Solution**: Always `cd` to the project directory first:
```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
```

### Call Connects But No Audio

1. Check Render logs for `[TrueVoice] Connected`
2. Verify `TRUEVOICE_API_KEY` is set in Render environment variables
3. Check if TrueVoiceStreaming API is accessible

### Call Disconnects Immediately

1. Check Render logs for errors
2. Verify WebSocket URL in TwiML is `wss://` (not `ws://`)
3. Check Twilio logs for webhook errors

### Webhook Not Being Called

1. Verify webhook URL in Twilio Dashboard → Phone Numbers
2. Check Twilio Console → Monitor → Logs for webhook errors
3. Test webhook endpoint manually:
   ```bash
   curl -X POST "https://voiceforge-api-fresh.onrender.com/api/telephony/webhook/voice?sessionId=test123" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "CallSid=test456&From=%2B1234567890&To=%2B19517458409&CallStatus=ringing"
   ```

## Environment Variables

Make sure these are set:

```bash
export BASE_URL=https://voiceforge-api-fresh.onrender.com
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
export TWILIO_PHONE_NUMBER=+18444588448  # Your Twilio number
```

## Service URLs

- **Service**: https://voiceforge-api-fresh.onrender.com
- **Health Check**: https://voiceforge-api-fresh.onrender.com/api/health
- **Render Dashboard**: https://dashboard.render.com/web/srv-d4d7jf6r433s73duopvg

