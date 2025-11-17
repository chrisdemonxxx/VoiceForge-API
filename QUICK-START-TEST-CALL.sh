#!/bin/bash

# Quick Start Script for Testing Real Call with Streaming Pipeline

set -e

echo "=========================================="
echo "Quick Start - Real Call Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check environment
echo -e "${YELLOW}Checking environment...${NC}"

if [ -z "$TRUEVOICE_API_KEY" ]; then
    echo -e "${RED}❌ TRUEVOICE_API_KEY not set${NC}"
    echo "   Setting it now..."
    export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
    echo -e "${GREEN}✅ TRUEVOICE_API_KEY set${NC}"
else
    echo -e "${GREEN}✅ TRUEVOICE_API_KEY is set${NC}"
fi

# Check if server is running
echo ""
echo -e "${YELLOW}Checking server status...${NC}"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running on port 5000${NC}"
    SERVER_RUNNING=true
else
    echo -e "${RED}❌ Server is not running${NC}"
    SERVER_RUNNING=false
fi

# Start server if not running
if [ "$SERVER_RUNNING" = false ]; then
    echo ""
    echo -e "${YELLOW}Starting server...${NC}"
    echo "   Run this in a separate terminal:"
    echo ""
    echo -e "${GREEN}   export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80${NC}"
    echo -e "${GREEN}   npx tsx server/index.ts${NC}"
    echo ""
    echo "   Or if you have npm scripts:"
    echo -e "${GREEN}   npm run dev${NC}"
    echo ""
    read -p "Press Enter when server is started..."
    
    # Check again
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is now running${NC}"
        SERVER_RUNNING=true
    else
        echo -e "${RED}❌ Server still not responding${NC}"
        exit 1
    fi
fi

# Get API key
echo ""
echo -e "${YELLOW}Getting API key...${NC}"
API_KEY_RESPONSE=$(curl -s http://localhost:5000/api/api-keys 2>&1)
if [ $? -eq 0 ]; then
    # Try to extract first API key (this is a simple approach)
    API_KEY=$(echo "$API_KEY_RESPONSE" | grep -o '"key":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -n "$API_KEY" ]; then
        echo -e "${GREEN}✅ API key found: ${API_KEY:0:20}...${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not extract API key from response${NC}"
        echo "   Response: $API_KEY_RESPONSE"
        echo ""
        echo "   You may need to create an API key manually via the API"
        API_KEY=""
    fi
else
    echo -e "${RED}❌ Failed to get API keys${NC}"
    API_KEY=""
fi

# Display test instructions
echo ""
echo "=========================================="
echo -e "${GREEN}Ready to Test!${NC}"
echo "=========================================="
echo ""
echo "To make a test call, you need:"
echo ""
echo "1. Twilio Provider configured:"
echo "   POST http://localhost:5000/api/telephony/providers"
echo "   Headers: Authorization: Bearer $API_KEY"
echo "   Body: {"
echo "     \"name\": \"Twilio Test\","
echo "     \"type\": \"twilio\","
echo "     \"credentials\": {"
echo "       \"accountSid\": \"YOUR_TWILIO_SID\","
echo "       \"authToken\": \"YOUR_TWILIO_TOKEN\""
echo "     },"
echo "     \"active\": true"
echo "   }"
echo ""
echo "2. Make a test call:"
echo "   POST http://localhost:5000/api/telephony/calls"
echo "   Headers: Authorization: Bearer $API_KEY"
echo "   Body: {"
echo "     \"providerId\": \"PROVIDER_ID\","
echo "     \"from\": \"+1234567890\","
echo "     \"to\": \"+0987654321\""
echo "   }"
echo ""
echo "3. Monitor server logs for:"
echo "   - [StreamingPipeline] Pipeline started"
echo "   - [TrueVoice] Connected"
echo "   - [TwilioMedia] Audio received/sent"
echo ""
echo "=========================================="
echo ""
echo "Quick test commands (if you have curl and jq):"
if command -v curl > /dev/null && command -v jq > /dev/null && [ -n "$API_KEY" ]; then
    echo ""
    echo "# List providers:"
    echo "curl -s http://localhost:5000/api/telephony/providers \\"
    echo "  -H 'Authorization: Bearer $API_KEY' | jq"
    echo ""
    echo "# List calls:"
    echo "curl -s http://localhost:5000/api/telephony/calls \\"
    echo "  -H 'Authorization: Bearer $API_KEY' | jq"
else
    echo ""
    echo "Install curl and jq for easier testing"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"

