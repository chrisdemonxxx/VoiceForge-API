# Ready to Test Real Call! 🎉

## Quick Start

### 1. Start the Server

In one terminal, run:
```bash
export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
npx tsx server/index.ts
```

Or use the script:
```bash
./start-server.sh
```

You should see:
```
[Server] Checking database initialization...
[Server] Created default API key: <key>
[Routes] TrueVoiceStreaming pipeline enabled
serving on port 5000
```

### 2. Get Your API Key

The server creates a default API key on first run. Check the logs or:
```bash
curl http://localhost:5000/api/api-keys
```

### 3. Create Twilio Provider

```bash
curl -X POST http://localhost:5000/api/telephony/providers \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
    "name": "Twilio Test",
    "type": "twilio",
    "credentials": {
      "accountSid": "YOUR_TWILIO_ACCOUNT_SID",
      "authToken": "YOUR_TWILIO_AUTH_TOKEN"
    },
    "active": true
  }'
```

Save the `id` from the response as `PROVIDER_ID`.

### 4. Make a Test Call

```bash
curl -X POST http://localhost:5000/api/telephony/calls \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
    "providerId": "PROVIDER_ID",
    "from": "+1234567890",
    "to": "+0987654321"
  }'
```

### 5. Monitor the Call

Watch the server logs for:
- ✅ `[StreamingPipeline] Pipeline started`
- ✅ `[TrueVoice] Connected`
- ✅ `[TwilioMedia] Stream authenticated`
- ✅ `[TwilioMedia] Audio received`
- ✅ `[TwilioMedia] Audio sent`
- ✅ `[StreamingPipeline] Transcript: <text>`
- ✅ `[StreamingPipeline] LLM Response: <text>`

## What's Happening

1. **Call Initiated** → Session created → Pipeline initialized
2. **Twilio Connects** → WebSocket authenticated → Stream starts
3. **Audio Flows:**
   - **Incoming:** Caller → Twilio (μ-law) → Pipeline → TrueVoiceStreaming
   - **Outgoing:** TrueVoiceStreaming → Pipeline → Twilio (μ-law) → Caller

## Expected Behavior

- ✅ Low-latency bidirectional audio
- ✅ Natural speech with breathing and pauses
- ✅ Real-time transcription
- ✅ LLM responses
- ✅ Adaptive buffering

## Troubleshooting

### Server Won't Start
- Check Node.js is installed: `node --version`
- Check TypeScript runner: `npx tsx --version`
- Check port 5000 is available

### Pipeline Not Starting
- Verify `TRUEVOICE_API_KEY` is set
- Check API key is valid
- Check TrueVoiceStreaming service is accessible

### No Audio
- Check streaming pipeline is active in logs
- Verify WebSocket connection
- Check Twilio credentials

## Files Created

- `start-server.sh` - Quick server start script
- `test-real-call.sh` - Test script
- `QUICK-START-TEST-CALL.sh` - Quick start guide
- `REAL-CALL-TEST-GUIDE.md` - Detailed testing guide

## Next Steps

1. Start the server
2. Make a test call
3. Monitor logs
4. Verify audio quality
5. Tune settings based on results

**You're all set! Start the server and make your first test call!** 🚀

