#!/bin/bash

# Script to make a test call with automatic tunnel setup
# Usage: ./make-call-with-tunnel.sh +19517458409

PHONE_NUMBER="${1:-+19517458409}"

# Twilio credentials from dashboard (set these as environment variables)
export TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-YOUR_TWILIO_ACCOUNT_SID}"
export TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-YOUR_TWILIO_AUTH_TOKEN}"
export TWILIO_PHONE_NUMBER=+18444588448

echo "=========================================="
echo "Making Test Call with Tunnel"
echo "=========================================="
echo ""
echo "Phone Number: $PHONE_NUMBER"
echo "From: $TWILIO_PHONE_NUMBER"
echo ""

# Check if server is running
if ! curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
  echo "⚠️  Server is not running. Starting server..."
  cd "$(dirname "$0")"
  export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
  export PORT=5000
  npx tsx server/index.ts > /tmp/voiceforge-server.log 2>&1 &
  SERVER_PID=$!
  echo "Server started (PID: $SERVER_PID)"
  sleep 3
fi

# Check for tunnel tools
if command -v ngrok &> /dev/null; then
  echo "✅ Found ngrok"
  echo ""
  echo "Starting ngrok tunnel..."
  ngrok http 5000 > /tmp/ngrok.log 2>&1 &
  NGROK_PID=$!
  sleep 3
  
  # Get ngrok URL
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok[^"]*' | head -1)
  
  if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    echo "Check ngrok status at http://localhost:4040"
    kill $NGROK_PID 2>/dev/null
    exit 1
  fi
  
  echo "✅ Ngrok tunnel active: $NGROK_URL"
  export BASE_URL="$NGROK_URL"
  
elif command -v cloudflared &> /dev/null; then
  echo "✅ Found cloudflared"
  echo ""
  echo "Starting cloudflared tunnel..."
  cloudflared tunnel --url http://localhost:5000 > /tmp/cloudflared.log 2>&1 &
  CLOUDFLARE_PID=$!
  sleep 3
  
  # Try to extract URL from logs
  CLOUDFLARE_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
  
  if [ -z "$CLOUDFLARE_URL" ]; then
    echo "⚠️  Could not extract cloudflared URL from logs"
    echo "Please check /tmp/cloudflared.log and set BASE_URL manually"
    exit 1
  fi
  
  echo "✅ Cloudflare tunnel active: $CLOUDFLARE_URL"
  export BASE_URL="$CLOUDFLARE_URL"
  
else
  echo "❌ No tunnel tool found (ngrok or cloudflared)"
  echo ""
  echo "Please install one:"
  echo "  - ngrok: https://ngrok.com/download"
  echo "  - cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
  echo ""
  echo "Or manually expose your server and set BASE_URL:"
  echo "  export BASE_URL=https://your-public-url"
  echo "  npx tsx make-call-direct.ts $PHONE_NUMBER"
  exit 1
fi

echo ""
echo "Making call with BASE_URL: $BASE_URL"
echo ""

# Make the call
cd "$(dirname "$0")"
npx tsx make-call-direct.ts "$PHONE_NUMBER"

CALL_EXIT_CODE=$?

if [ $CALL_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Call initiated successfully!"
  echo ""
  echo "Monitor the server logs:"
  echo "  tail -f /tmp/voiceforge-server.log"
  echo ""
  echo "To stop the tunnel, press Ctrl+C or run:"
  if [ ! -z "$NGROK_PID" ]; then
    echo "  kill $NGROK_PID"
  elif [ ! -z "$CLOUDFLARE_PID" ]; then
    echo "  kill $CLOUDFLARE_PID"
  fi
else
  echo ""
  echo "❌ Call failed. Check the error above."
fi

exit $CALL_EXIT_CODE

