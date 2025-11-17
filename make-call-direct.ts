#!/usr/bin/env npx tsx

/**
 * Direct call script that bypasses database requirements
 * Makes a call directly using Twilio SDK
 */

import twilio from "twilio";

const PHONE_NUMBER = process.argv[2] || "+19517458409";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error("❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  console.error("");
  console.error("Usage:");
  console.error("  export TWILIO_ACCOUNT_SID=your_account_sid");
  console.error("  export TWILIO_AUTH_TOKEN=your_auth_token");
  console.error("  export TWILIO_PHONE_NUMBER=+1234567890");
  console.error("  npx tsx make-call-direct.ts +19517458409");
  process.exit(1);
}

if (!TWILIO_PHONE_NUMBER) {
  console.error("❌ Error: TWILIO_PHONE_NUMBER must be set");
  console.error("This should be your Twilio phone number (e.g., +1234567890)");
  process.exit(1);
}

console.log("==========================================");
console.log("Making Direct Test Call");
console.log("==========================================");
console.log("");
console.log("From:", TWILIO_PHONE_NUMBER);
console.log("To:", PHONE_NUMBER);
console.log("Base URL:", BASE_URL);
console.log("");

// For outbound calls, we can either:
// 1. Use the phone number's configured webhook (recommended)
// 2. Use a direct callback URL
// Since phone numbers are now configured with webhooks, we'll use option 1
// But we need to pass the session ID somehow, so we'll use a query parameter

// Generate a session ID for the call
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Use the webhook endpoint with session ID as query parameter
// The webhook will create the session automatically
const callbackUrl = `${BASE_URL}/api/telephony/webhook/voice?sessionId=${sessionId}`;
const statusCallbackUrl = `${BASE_URL}/api/telephony/webhook/status`;

console.log("Session ID:", sessionId);
console.log("Callback URL:", callbackUrl);
console.log("Status Callback URL:", statusCallbackUrl);
console.log("");

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

console.log("Initiating call through Twilio...");
console.log("");

try {
  const call = await client.calls.create({
    from: TWILIO_PHONE_NUMBER,
    to: PHONE_NUMBER,
    url: callbackUrl,
    statusCallback: statusCallbackUrl,
    statusCallbackMethod: "POST",
    record: true,
  });

  console.log("✅ Call initiated successfully!");
  console.log("");
  console.log("Call SID:", call.sid);
  console.log("Status:", call.status);
  console.log("Direction:", call.direction);
  console.log("");
  console.log("📞 The call is now connecting...");
  console.log("");
  console.log("Monitor the server logs to see:");
  console.log("  - Streaming pipeline initialization");
  console.log("  - Audio chunks being processed");
  console.log("  - Transcripts and LLM responses");
  console.log("  - Real-time voice streaming");
  console.log("");
  console.log("Note: The server must be running and accessible at:", BASE_URL);
  console.log("      If running locally, use ngrok or similar to expose it to Twilio.");
} catch (error: any) {
  console.error("❌ Call failed:", error.message);
  if (error.code) {
    console.error("Error code:", error.code);
  }
  if (error.moreInfo) {
    console.error("More info:", error.moreInfo);
  }
  process.exit(1);
}

