#!/usr/bin/env npx tsx

/**
 * Script to configure Twilio phone number webhook URLs
 * Updates all active Twilio numbers to use our webhook endpoint
 */

import twilio from "twilio";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const WEBHOOK_BASE_URL = process.env.BASE_URL || process.env.WEBHOOK_URL || "http://localhost:5000";

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error("❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  console.error("");
  console.error("Usage:");
  console.error("  export TWILIO_ACCOUNT_SID=your_account_sid");
  console.error("  export TWILIO_AUTH_TOKEN=your_auth_token");
  console.error("  export BASE_URL=https://your-server-url.com");
  console.error("  npx tsx configure-twilio-webhooks.ts");
  process.exit(1);
}

// Webhook URLs
const VOICE_WEBHOOK_URL = `${WEBHOOK_BASE_URL}/api/telephony/webhook/voice`;
const STATUS_CALLBACK_URL = `${WEBHOOK_BASE_URL}/api/telephony/webhook/status`;

console.log("==========================================");
console.log("Configuring Twilio Phone Number Webhooks");
console.log("==========================================");
console.log("");
console.log("Account SID:", TWILIO_ACCOUNT_SID.substring(0, 10) + "...");
console.log("Voice Webhook URL:", VOICE_WEBHOOK_URL);
console.log("Status Callback URL:", STATUS_CALLBACK_URL);
console.log("");

// Initialize Twilio client
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function configureWebhooks() {
  try {
    // Get all phone numbers
    console.log("📞 Fetching active phone numbers...");
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    
    if (phoneNumbers.length === 0) {
      console.log("⚠️  No phone numbers found in your Twilio account");
      return;
    }
    
    console.log(`✅ Found ${phoneNumbers.length} phone number(s)`);
    console.log("");
    
    // Update each phone number
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const number of phoneNumbers) {
      try {
        console.log(`Updating ${number.phoneNumber}...`);
        
        // Update the phone number with webhook URLs
        await client.incomingPhoneNumbers(number.sid).update({
          voiceUrl: VOICE_WEBHOOK_URL,
          voiceMethod: 'POST',
          statusCallback: STATUS_CALLBACK_URL,
          statusCallbackMethod: 'POST',
        });
        
        console.log(`  ✅ Updated ${number.phoneNumber}`);
        console.log(`     Voice URL: ${VOICE_WEBHOOK_URL}`);
        updated++;
      } catch (error: any) {
        console.error(`  ❌ Failed to update ${number.phoneNumber}:`, error.message);
        errors++;
      }
    }
    
    console.log("");
    console.log("==========================================");
    console.log("Configuration Complete");
    console.log("==========================================");
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log("");
    console.log("All phone numbers are now configured to use:");
    console.log(`  Voice Webhook: ${VOICE_WEBHOOK_URL}`);
    console.log(`  Status Callback: ${STATUS_CALLBACK_URL}`);
    console.log("");
    console.log("📞 Incoming calls will now be handled by your server!");
    
  } catch (error: any) {
    console.error("❌ Error configuring webhooks:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  }
}

// Run configuration
configureWebhooks();

