# Test Call Instructions

## Making a Test Call to +19517458409

To make a test call, you need Twilio credentials. Here are your options:

### Option 1: Direct Call Script (Recommended)

This bypasses the database and makes the call directly using Twilio SDK:

```bash
# Set your Twilio credentials
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number

# Make the call
npx tsx make-call-direct.ts +19517458409
```

### Option 2: Via API (Requires Database)

If you have a database set up:

```bash
# Set Twilio credentials
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_PHONE_NUMBER=+1234567890

# Run the test call script
./make-test-call.sh +19517458409
```

### Option 3: Manual API Call

```bash
API_KEY="vf_sk_19798aa99815232e6d53e1af34f776e1"

# 1. Create a provider
curl -X POST "http://localhost:5000/api/telephony/providers" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Twilio Test",
    "type": "twilio",
    "credentials": {
      "accountSid": "YOUR_TWILIO_ACCOUNT_SID",
      "authToken": "YOUR_TWILIO_AUTH_TOKEN"
    },
    "active": true
  }'

# 2. Get the provider ID from the response, then make the call
curl -X POST "http://localhost:5000/api/telephony/calls" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "PROVIDER_ID_FROM_STEP_1",
    "from": "YOUR_TWILIO_PHONE_NUMBER",
    "to": "+19517458409"
  }'
```

## Important Notes

### 1. Server Must Be Accessible

For local testing, your server needs to be accessible from the internet so Twilio can send webhooks. Use one of these:

- **ngrok**: `ngrok http 5000`
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:5000`
- **localtunnel**: `npx localtunnel --port 5000`

Then update `BASE_URL` in the script or set it as an environment variable.

### 2. Twilio Webhook Configuration

The server automatically generates TwiML callback URLs:
- `/api/telephony/twiml/:sessionId` - TwiML instructions for the call
- `/api/telephony/status/:callId` - Status callbacks

These are automatically configured when you make a call.

### 3. Streaming Pipeline

Once the call connects:
- ✅ Streaming pipeline will initialize automatically
- ✅ Audio will be processed in real-time
- ✅ Transcripts will appear in server logs
- ✅ LLM responses will be synthesized and streamed back
- ✅ Voice will be played through the call

### 4. Monitor the Call

Watch the server logs for:
```
[TelephonyService] Call initiated: CAxxxxx
[StreamingPipeline] Pipeline started
[TrueVoice] Connected
[TwilioMedia] Stream authenticated
[TwilioMedia] Audio received
[StreamingPipeline] Transcript: <text>
[StreamingPipeline] LLM Response: <text>
[TwilioMedia] Audio sent
```

## Quick Start

If you have Twilio credentials ready:

```bash
# Set credentials
export TWILIO_ACCOUNT_SID=ACxxxxx
export TWILIO_AUTH_TOKEN=your_token
export TWILIO_PHONE_NUMBER=+1234567890

# Make the call
npx tsx make-call-direct.ts +19517458409
```

The call will connect and the streaming pipeline will handle the conversation automatically! 🚀

