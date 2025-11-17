#!/bin/bash
# Fix Tunnel 404 Errors - Setup ngrok for reliable POST routing

set -e

echo "=========================================="
echo "Fixing Twilio 404 Errors"
echo "=========================================="
echo ""

# Step 1: Check ngrok authentication
echo "Step 1: Checking ngrok authentication..."
if ! ngrok config check > /dev/null 2>&1; then
    echo "⚠️  ngrok is not authenticated"
    echo ""
    echo "To authenticate ngrok:"
    echo "  1. Sign up at https://ngrok.com (free)"
    echo "  2. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "  3. Run: ngrok config add-authtoken YOUR_AUTHTOKEN"
    echo ""
    read -p "Press Enter after you've authenticated ngrok, or Ctrl+C to cancel..."
fi

# Step 2: Clean up old tunnels
echo ""
echo "Step 2: Cleaning up old tunnels..."
pkill -f "cloudflared tunnel" || true
pkill -f "ngrok http" || true
sleep 2
echo "✅ Cleaned up"

# Step 3: Start ngrok
echo ""
echo "Step 3: Starting ngrok tunnel..."
ngrok http 5000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!
sleep 6

# Step 4: Get ngrok URL
echo ""
echo "Step 4: Getting ngrok URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
    echo "❌ Failed to get ngrok URL"
    echo "Check ngrok status: http://localhost:4040"
    echo "Or check logs: tail -f /tmp/ngrok.log"
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

echo "$NGROK_URL" > /tmp/base_url.txt
echo "✅ ngrok tunnel: $NGROK_URL"

# Step 5: Test webhook
echo ""
echo "Step 5: Testing webhook endpoint..."
TEST_RESPONSE=$(curl -X POST "$NGROK_URL/api/telephony/webhook/voice?sessionId=test123" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test456&From=%2B18776118846&To=%2B19517458409&CallStatus=ringing" \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s 2>/dev/null)

HTTP_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Webhook test successful (200 OK)"
else
    echo "⚠️  Webhook test returned: $HTTP_STATUS"
    echo "Response: $(echo "$TEST_RESPONSE" | head -3)"
fi

# Step 6: Restart server with new URL
echo ""
echo "Step 6: Restarting server with ngrok URL..."
export BASE_URL="$NGROK_URL"
export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
export PORT=5000
export TWILIO_AUTH_TOKEN=a1c5caa0aabc716e27c864f310fbd521

pkill -f "tsx server/index.ts" || true
sleep 2

npx tsx server/index.ts > /tmp/voiceforge-server.log 2>&1 &
sleep 5

if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server restarted successfully"
else
    echo "❌ Server failed to start"
    exit 1
fi

# Step 7: Update Twilio webhook
echo ""
echo "Step 7: Updating Twilio webhook URLs..."
export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-YOUR_TWILIO_ACCOUNT_SID}"
export TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-YOUR_TWILIO_AUTH_TOKEN}"
export BASE_URL="$NGROK_URL"

npx tsx update-single-number-webhook.ts +18776118846

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Tunnel URL: $NGROK_URL"
echo "Server: Running on port 5000"
echo "Webhook: Updated in Twilio"
echo ""
echo "Monitor logs:"
echo "  Server: tail -f /tmp/voiceforge-server.log"
echo "  ngrok:  http://localhost:4040"
echo ""
echo "Make a test call:"
echo "  export BASE_URL=$NGROK_URL"
echo "  npx tsx make-call-direct.ts +19517458409"
echo ""

