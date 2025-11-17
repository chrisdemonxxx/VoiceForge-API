# Configure Twilio Webhook URLs

## Overview

This script configures all your Twilio phone numbers to use our webhook endpoints for handling calls.

## Webhook Endpoints

The server provides two webhook endpoints:

1. **Voice Webhook**: `/api/telephony/webhook/voice`
   - Called when a call comes in to your Twilio number
   - Returns TwiML instructions for handling the call
   - Automatically creates a session and sets up streaming

2. **Status Callback**: `/api/telephony/webhook/status`
   - Called when call status changes
   - Updates session status and handles call completion

## Usage

### Step 1: Set Environment Variables

```bash
export TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID
export TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN
export BASE_URL=https://your-server-url.com
```

**Important**: `BASE_URL` should be your publicly accessible server URL (e.g., ngrok URL, cloudflared URL, or production domain).

### Step 2: Run the Configuration Script

```bash
npx tsx configure-twilio-webhooks.ts
```

The script will:
- Fetch all active phone numbers from your Twilio account
- Update each number's webhook URLs to point to your server
- Show a summary of what was updated

### Step 3: Verify Configuration

After running the script, check your Twilio dashboard:
1. Go to Phone Numbers → Active Numbers
2. Click on a phone number
3. Verify the "Voice & Fax" webhook URL is set to: `https://your-server-url.com/api/telephony/webhook/voice`

## Example Output

```
==========================================
Configuring Twilio Phone Number Webhooks
==========================================

Account SID: YOUR_ACCOUNT_SID...
Voice Webhook URL: https://web-gold-blogging-cio.trycloudflare.com/api/telephony/webhook/voice
Status Callback URL: https://web-gold-blogging-cio.trycloudflare.com/api/telephony/webhook/status

📞 Fetching active phone numbers...
✅ Found 6 phone number(s)

Updating +18444588448...
  ✅ Updated +18444588448
     Voice URL: https://web-gold-blogging-cio.trycloudflare.com/api/telephony/webhook/voice
...

==========================================
Configuration Complete
==========================================
✅ Updated: 6
⏭️  Skipped: 0

All phone numbers are now configured to use:
  Voice Webhook: https://web-gold-blogging-cio.trycloudflare.com/api/telephony/webhook/voice
  Status Callback: https://web-gold-blogging-cio.trycloudflare.com/api/telephony/webhook/status

📞 Incoming calls will now be handled by your server!
```

## How It Works

1. **Incoming Call**: When someone calls your Twilio number
2. **Webhook Called**: Twilio calls `/api/telephony/webhook/voice`
3. **Session Created**: Server creates a session for the call
4. **TwiML Returned**: Server returns TwiML with streaming instructions
5. **Streaming Starts**: Audio streams through WebSocket
6. **Status Updates**: Twilio sends status updates to `/api/telephony/webhook/status`

## Troubleshooting

### Webhook Not Being Called

1. **Check BASE_URL**: Make sure it's publicly accessible
   ```bash
   curl https://your-server-url.com/api/health
   ```

2. **Check Twilio Logs**: Go to Twilio Console → Monitor → Logs
   - Look for webhook errors
   - Check if the URL is reachable

3. **Test Webhook Manually**:
   ```bash
   curl -X POST "https://your-server-url.com/api/telephony/webhook/voice" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "CallSid=test&From=%2B1234567890&To=%2B18444588448"
   ```

### Webhook Returns Error

- Check server logs: `tail -f /tmp/voiceforge-server.log`
- Look for error messages in the logs
- Verify `TRUEVOICE_API_KEY` is set if using streaming pipeline

## Notes

- The webhook endpoints don't require webhook signature validation (for easier testing)
- Sessions are automatically created from call metadata
- Streaming pipeline initializes automatically if configured
- All phone numbers are updated in one run

