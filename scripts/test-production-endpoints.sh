#!/bin/bash
# Production Endpoint Testing Script
# Tests all API endpoints after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${1:-http://localhost:5000}"
API_KEY="${2:-}"

if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠️  API_KEY not provided${NC}"
    echo "Usage: $0 [API_BASE_URL] [API_KEY]"
    echo "Example: $0 https://your-backend.onrender.com vf_sk_..."
    exit 1
fi

echo "=========================================="
echo "VoiceForge Production Endpoint Testing"
echo "=========================================="
echo "Base URL: $API_BASE_URL"
echo ""

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET \
            -H "Authorization: Bearer $API_KEY" \
            "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Health Check
echo "1. Health Check"
test_endpoint "Health" "GET" "/api/health" ""

# Test 2: Ready Check
echo "2. Ready Check"
test_endpoint "Ready" "GET" "/api/ready" ""

# Test 3: Live Check
echo "3. Live Check"
test_endpoint "Live" "GET" "/api/live" ""

# Test 4: Voice Library
echo "4. Voice Library"
test_endpoint "Voice Library" "GET" "/api/voice-library" ""

# Test 5: TTS (simple)
echo "5. TTS Endpoint"
test_endpoint "TTS" "POST" "/api/tts" '{"text":"Hello world","model":"chatterbox","voice":"default"}'

# Test 6: VLLM
echo "6. VLLM Endpoint"
test_endpoint "VLLM" "POST" "/api/vllm/chat" '{"message":"Hello","session_id":"test-123"}'

# Test 7: Usage Stats
echo "7. Usage Stats"
test_endpoint "Usage" "GET" "/api/usage" ""

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi


