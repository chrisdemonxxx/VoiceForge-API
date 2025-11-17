#!/bin/bash

# Script to make a test call to a phone number
# Usage: ./make-test-call.sh +19517458409

PHONE_NUMBER="${1:-+19517458409}"
API_KEY="vf_sk_19798aa99815232e6d53e1af34f776e1"
BASE_URL="http://localhost:5000"

echo "=========================================="
echo "Making Test Call"
echo "=========================================="
echo ""
echo "Phone Number: $PHONE_NUMBER"
echo "API Key: ${API_KEY:0:20}..."
echo ""

# Check if Twilio credentials are set
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "⚠️  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
  echo ""
  echo "Please set them:"
  echo "  export TWILIO_ACCOUNT_SID=your_account_sid"
  echo "  export TWILIO_AUTH_TOKEN=your_auth_token"
  echo ""
  exit 1
fi

# Check if we have a Twilio phone number
if [ -z "$TWILIO_PHONE_NUMBER" ]; then
  echo "⚠️  TWILIO_PHONE_NUMBER not set"
  echo "Using a placeholder - you'll need to update this with your actual Twilio number"
  TWILIO_PHONE_NUMBER="+1234567890"
fi

echo "Twilio Account SID: ${TWILIO_ACCOUNT_SID:0:10}..."
echo "Twilio Phone Number: $TWILIO_PHONE_NUMBER"
echo ""

# Step 1: Create a Twilio provider (if database is available)
echo "Step 1: Creating Twilio provider..."
PROVIDER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/telephony/providers" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Twilio Test Provider\",
    \"type\": \"twilio\",
    \"credentials\": {
      \"accountSid\": \"$TWILIO_ACCOUNT_SID\",
      \"authToken\": \"$TWILIO_AUTH_TOKEN\"
    },
    \"active\": true
  }")

echo "Provider Response: $PROVIDER_RESPONSE"
echo ""

# Extract provider ID (if successful)
PROVIDER_ID=$(echo "$PROVIDER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROVIDER_ID" ]; then
  echo "⚠️  Could not create provider (database might not be available)"
  echo ""
  echo "Trying direct call method..."
  echo ""
  
  # Try to make call directly using Twilio SDK if provider creation fails
  echo "Note: For direct calls without database, you need to:"
  echo "  1. Set up DATABASE_URL environment variable"
  echo "  2. Or use the Twilio SDK directly"
  echo ""
  exit 1
fi

echo "✅ Provider created: $PROVIDER_ID"
echo ""

# Step 2: Add phone number to provider
echo "Step 2: Adding phone number to provider..."
NUMBER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/telephony/numbers" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerId\": \"$PROVIDER_ID\",
    \"phoneNumber\": \"$TWILIO_PHONE_NUMBER\",
    \"active\": true
  }")

echo "Number Response: $NUMBER_RESPONSE"
echo ""

# Step 3: Make the call
echo "Step 3: Initiating call to $PHONE_NUMBER..."
CALL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/telephony/calls" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerId\": \"$PROVIDER_ID\",
    \"from\": \"$TWILIO_PHONE_NUMBER\",
    \"to\": \"$PHONE_NUMBER\"
  }")

echo "Call Response:"
echo "$CALL_RESPONSE" | jq . 2>/dev/null || echo "$CALL_RESPONSE"
echo ""

if echo "$CALL_RESPONSE" | grep -q "error"; then
  echo "❌ Call failed"
  exit 1
else
  echo "✅ Call initiated successfully!"
  echo ""
  echo "Monitor the server logs to see the streaming pipeline in action."
fi

