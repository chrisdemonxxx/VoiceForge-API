# Webhook Validation Fix

## Problem
The call was disconnecting because webhook validation was failing. For direct calls:
- No session exists when Twilio first requests TwiML
- Validation middleware couldn't get auth token from session/provider
- Returned 403 Forbidden, causing call to disconnect

## Fix Applied
Updated webhook validation middleware to fall back to `TWILIO_AUTH_TOKEN` environment variable when session doesn't exist:

```typescript
// Fall back to environment variable for direct calls
if (!authToken) {
  authToken = process.env.TWILIO_AUTH_TOKEN;
  if (authToken) {
    console.log("[Telephony] Using TWILIO_AUTH_TOKEN from environment for webhook validation");
  }
}
```

## How It Works Now

1. **First attempt**: Try to get auth token from session/provider (normal flow)
2. **Fallback**: If no session exists (direct calls), use `TWILIO_AUTH_TOKEN` from environment
3. **Validation**: Validate Twilio webhook signature using the auth token
4. **Session creation**: TwiML endpoint creates session from call metadata
5. **Stream connection**: WebSocket connects with proper authentication

## Testing

The server now has `TWILIO_AUTH_TOKEN` set in environment, so webhook validation should work for direct calls.

Monitor logs for:
- `[Telephony] Using TWILIO_AUTH_TOKEN from environment for webhook validation`
- `[Telephony] Created direct call session`
- `[TwilioMedia] Stream authenticated`

The call should now connect successfully! 🎉

