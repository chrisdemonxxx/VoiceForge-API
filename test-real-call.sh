#!/bin/bash

# Test Script for Real Telephony Call with Streaming Pipeline
# This script helps test the streaming pipeline with a real Twilio call

set -e

echo "=========================================="
echo "Real Call Test - Streaming Pipeline"
echo "=========================================="
echo ""

# Check for required environment variables
if [ -z "$TRUEVOICE_API_KEY" ]; then
    echo "⚠️  WARNING: TRUEVOICE_API_KEY not set"
    echo "   The streaming pipeline will not be enabled"
    echo "   Set it with: export TRUEVOICE_API_KEY=your_key"
    echo ""
fi

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo "⚠️  WARNING: Twilio credentials not set"
    echo "   Set them with:"
    echo "   export TWILIO_ACCOUNT_SID=your_sid"
    echo "   export TWILIO_AUTH_TOKEN=your_token"
    echo ""
fi

# Check if server is running
echo "Checking if server is running..."
if ! curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "❌ Server is not running on port 5000"
    echo "   Start the server first with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Display configuration
echo "Configuration:"
echo "  - TRUEVOICE_API_KEY: ${TRUEVOICE_API_KEY:+Set (${#TRUEVOICE_API_KEY} chars)}${TRUEVOICE_API_KEY:-Not set}"
echo "  - Server URL: http://localhost:5000"
echo "  - Streaming Pipeline: ${TRUEVOICE_API_KEY:+Enabled}${TRUEVOICE_API_KEY:-Disabled}"
echo ""

# Instructions
echo "=========================================="
echo "Testing Instructions:"
echo "=========================================="
echo ""
echo "1. Make sure the server is running with:"
echo "   npm run dev"
echo ""
echo "2. Set environment variables:"
echo "   export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80"
echo ""
echo "3. Create a telephony provider in the database with Twilio credentials"
echo ""
echo "4. Make a test call using the API:"
echo "   curl -X POST http://localhost:5000/api/telephony/calls \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_API_KEY' \\"
echo "     -d '{\"providerId\": \"provider_id\", \"from\": \"+1234567890\", \"to\": \"+0987654321\"}'"
echo ""
echo "5. Monitor the server logs for:"
echo "   - [TwilioMedia] Stream authenticated"
echo "   - [StreamingPipeline] Pipeline started"
echo "   - [TrueVoice] Connected"
echo "   - [TwilioMedia] Audio received/sent"
echo ""
echo "6. Check the call status:"
echo "   curl http://localhost:5000/api/telephony/calls/CALL_ID"
echo ""
echo "=========================================="
echo ""

# Check for test phone numbers
if [ -n "$TEST_FROM_NUMBER" ] && [ -n "$TEST_TO_NUMBER" ]; then
    echo "Test phone numbers detected:"
    echo "  From: $TEST_FROM_NUMBER"
    echo "  To: $TEST_TO_NUMBER"
    echo ""
    echo "Would you like to make a test call? (y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        echo "Making test call..."
        # This would require API key and provider ID
        echo "⚠️  Manual call initiation required via API"
    fi
fi

echo "Test script complete. Follow the instructions above to test with a real call."

