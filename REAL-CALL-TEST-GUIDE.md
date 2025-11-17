# Real Call Test Guide - Streaming Pipeline

## Overview
This guide explains how to test the ElevenLabs-like streaming pipeline with a real Twilio telephony call.

## Prerequisites

1. **Environment Variables:**
   ```bash
   export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
   export PORT=5000
   ```

2. **Twilio Credentials:**
   - Twilio Account SID
   - Twilio Auth Token
   - Twilio Phone Number (verified)

3. **Server Running:**
   ```bash
   npm run dev
   ```

## Setup Steps

### 1. Create API Key
The server automatically creates a default API key on first run. Check logs for:
```
[Server] Created default API key: <key>
```

### 2. Create Telephony Provider
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

Save the provider ID from the response.

### 3. Make a Test Call
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

## What Happens During a Call

### 1. Call Initiation
- Server creates a call session
- Streaming pipeline is initialized (if API key is set)
- Twilio receives TwiML with WebSocket stream URL

### 2. WebSocket Connection
- Twilio connects to `/ws/twilio-media/:sessionId`
- Stream is authenticated with one-time token
- Pipeline starts and connects to TrueVoiceStreaming

### 3. Audio Flow

**Incoming Audio (Caller → System):**
1. Twilio sends μ-law 8kHz audio via WebSocket
2. Audio is converted to PCM16 16kHz
3. Sent to TrueVoiceStreaming WebSocket
4. STT transcribes speech
5. LLM generates response (if flow configured)
6. TTS generates audio chunks

**Outgoing Audio (System → Caller):**
1. TTS audio chunks received (PCM16 16kHz)
2. Processed through jitter buffer
3. Sequenced and ordered
4. Breathing and pauses added
5. Converted back to μ-law 8kHz
6. Sent back to Twilio via WebSocket

## Monitoring the Call

### Server Logs
Watch for these log messages:

```
[TelephonyService] Call initiated: <call_sid>
[TwilioMedia] Stream authenticated for session: <session_id>
[StreamingPipeline] Pipeline started
[TrueVoice] Connected: <connection_id>
[TwilioMedia] Stream started: <stream_sid>
[TwilioMedia] Audio received
[StreamingPipeline] Audio chunk processed
[TwilioMedia] Audio sent
```

### Check Call Status
```bash
curl http://localhost:5000/api/telephony/calls/CALL_ID \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Pipeline Statistics
The pipeline tracks:
- Audio chunks received/sent
- Transcriptions received
- LLM tokens received
- Jitter statistics
- Buffer levels
- Playback state

## Troubleshooting

### Pipeline Not Starting
- Check `TRUEVOICE_API_KEY` is set
- Verify API key is valid
- Check TrueVoiceStreaming service is accessible

### No Audio Output
- Verify streaming pipeline is active
- Check audio output callback is set
- Monitor WebSocket connection status

### High Latency
- Adjust jitter buffer settings:
  ```bash
  export TRUEVOICE_JITTER_BUFFER_TARGET_MS=50  # Lower = less latency
  ```
- Check network conditions
- Monitor buffer statistics

### Audio Quality Issues
- Enable breathing and pauses:
  ```bash
  export TRUEVOICE_ENABLE_BREATHING=true
  export TRUEVOICE_ENABLE_PAUSES=true
  ```
- Adjust buffer sizes based on network
- Check TrueVoiceStreaming service status

## Test Script

Run the test script:
```bash
./test-real-call.sh
```

This will:
- Check server is running
- Verify environment variables
- Display configuration
- Provide testing instructions

## Expected Behavior

### Successful Call
1. Call connects successfully
2. Streaming pipeline initializes
3. Audio flows bidirectionally
4. Natural conversation with low latency
5. Call ends cleanly

### Log Indicators
- ✅ `[StreamingPipeline] Pipeline started`
- ✅ `[TrueVoice] Connected`
- ✅ `[TwilioMedia] Audio received`
- ✅ `[TwilioMedia] Audio sent`
- ✅ `[StreamingPipeline] Transcript: <text>`
- ✅ `[StreamingPipeline] LLM Response: <text>`

## Next Steps

After successful testing:
1. Monitor production calls
2. Tune buffer sizes based on real data
3. Optimize for your network conditions
4. Add custom flows for specific use cases

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify all environment variables
3. Test TrueVoiceStreaming API directly
4. Check Twilio call logs
5. Review pipeline statistics

