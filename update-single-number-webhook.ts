#!/usr/bin/env npx tsx

/**
 * Script to update webhook URL for a single Twilio phone number
 */

import twilio from "twilio";

const PHONE_NUMBER = process.argv[2] || "+18776118846";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WEBHOOK_BASE_URL = process.env.BASE_URL || process.env.WEBHOOK_URL || "http://localhost:5000";

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error("❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  process.exit(1);
}

// Webhook URLs
const VOICE_WEBHOOK_URL = `${WEBHOOK_BASE_URL}/api/telephony/webhook/voice`;
const STATUS_CALLBACK_URL = `${WEBHOOK_BASE_URL}/api/telephony/webhook/status`;

console.log("==========================================");
console.log("Updating Single Phone Number Webhook");
console.log("==========================================");
console.log("");
console.log("Phone Number:", PHONE_NUMBER);
console.log("Voice Webhook URL:", VOICE_WEBHOOK_URL);
console.log("Status Callback URL:", STATUS_CALLBACK_URL);
console.log("");

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function updateWebhook() {
  try {
    // Find the phone number
    console.log(`📞 Looking up phone number ${PHONE_NUMBER}...`);
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: PHONE_NUMBER,
    });
    
    if (phoneNumbers.length === 0) {
      console.error(`❌ Phone number ${PHONE_NUMBER} not found in your Twilio account`);
      process.exit(1);
    }
    
    const number = phoneNumbers[0];
    console.log(`✅ Found: ${number.phoneNumber} (SID: ${number.sid})`);
    console.log("");
    
    // Update the phone number
    console.log("Updating webhook URLs...");
    const updated = await client.incomingPhoneNumbers(number.sid).update({
      voiceUrl: VOICE_WEBHOOK_URL,
      voiceMethod: 'POST',
      statusCallback: STATUS_CALLBACK_URL,
      statusCallbackMethod: 'POST',
    });
    
    console.log("✅ Webhook updated successfully!");
    console.log("");
    console.log("Updated configuration:");
    console.log(`  Phone Number: ${updated.phoneNumber}`);
    console.log(`  Voice URL: ${updated.voiceUrl}`);
    console.log(`  Status Callback: ${updated.statusCallback}`);
    console.log("");
    console.log("📞 This number is now configured to use your webhook!");
    console.log("");
    console.log("Test by calling this number or making an outbound call from it.");
    
  } catch (error: any) {
    console.error("❌ Error updating webhook:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  }
}

// Run update
updateWebhook();

