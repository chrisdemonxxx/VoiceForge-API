#!/bin/bash

# Setup ngrok for Twilio webhook testing

echo "=========================================="
echo "Setting up ngrok for Twilio Webhooks"
echo "=========================================="
echo ""

# Check if ngrok is installed
if ! which ngrok > /dev/null 2>&1; then
  echo "📦 Installing ngrok..."
  curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
  sudo apt update && sudo apt install ngrok -y
fi

# Check if ngrok is authenticated
if ! ngrok config check > /dev/null 2>&1; then
  echo "⚠️  Ngrok requires authentication"
  echo ""
  echo "To get your authtoken:"
  echo "  1. Sign up at https://ngrok.com (free)"
  echo "  2. Go to https://dashboard.ngrok.com/get-started/your-authtoken"
  echo "  3. Copy your authtoken"
  echo ""
  read -p "Enter your ngrok authtoken (or press Enter to skip): " authtoken
  if [ ! -z "$authtoken" ]; then
    ngrok config add-authtoken "$authtoken"
    echo "✅ Ngrok authenticated"
  else
    echo "⚠️  Skipping authentication - ngrok may have limited functionality"
  fi
fi

# Start ngrok
echo ""
echo "🚀 Starting ngrok tunnel..."
pkill -f "ngrok http" 2>/dev/null
ngrok http 5000 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

sleep 5

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
  echo "❌ Failed to get ngrok URL"
  echo "Check /tmp/ngrok.log for errors"
  tail -20 /tmp/ngrok.log
  exit 1
fi

echo "✅ Ngrok tunnel active: $NGROK_URL"
echo "$NGROK_URL" > /tmp/ngrok_url.txt

# Configure Twilio webhooks
echo ""
echo "📞 Configuring Twilio webhooks..."
export BASE_URL="$NGROK_URL"
export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-YOUR_TWILIO_ACCOUNT_SID}"
export TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-YOUR_TWILIO_AUTH_TOKEN}"

if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "⚠️  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
  echo "Run:"
  echo "  export TWILIO_ACCOUNT_SID=your_sid"
  echo "  export TWILIO_AUTH_TOKEN=your_token"
  echo "  ./setup-ngrok.sh"
else
  npx tsx configure-twilio-webhooks.ts
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Ngrok URL: $NGROK_URL"
echo "Ngrok Dashboard: http://localhost:4040"
echo ""
echo "Your Twilio numbers are now configured to use:"
echo "  Voice Webhook: $NGROK_URL/api/telephony/webhook/voice"
echo ""
echo "To stop ngrok: kill $NGROK_PID"
echo "Or: pkill -f 'ngrok http'"

