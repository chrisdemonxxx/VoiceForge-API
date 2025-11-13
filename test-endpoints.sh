#!/bin/bash

# VoiceForge API Endpoint Test Script
# Tests STT, VAD, and VLLM endpoints after Plan 1 implementation

# Configuration
API_KEY="${API_KEY:-}"
BASE_URL="${BASE_URL:-http://localhost:5000}"
AUDIO_FILE="${AUDIO_FILE:-test.wav}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to print test header
print_test_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to print test result
print_test_result() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS: $2${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL: $2${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to check if server is running
check_server() {
    print_test_header "Checking Server Status"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        print_test_result 0 "Server is running"
        echo "Response: $body" | head -c 200
        echo ""
        return 0
    else
        print_test_result 1 "Server is not running (HTTP $http_code)"
        return 1
    fi
}

# Function to get API key
get_api_key() {
    print_test_header "Getting API Key"
    
    if [ -z "$API_KEY" ]; then
        echo -e "${YELLOW}API_KEY not set. Attempting to get from server...${NC}"
        
        # Try to get API keys from server (requires admin token or no admin token set)
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/keys" 2>/dev/null)
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [ "$http_code" -eq 200 ]; then
            # Try to extract first API key from response
            API_KEY=$(echo "$body" | grep -o '"key":"[^"]*' | head -n1 | cut -d'"' -f4)
            if [ -n "$API_KEY" ]; then
                print_test_result 0 "Retrieved API key from server"
                echo "API Key: ${API_KEY:0:20}..."
            else
                print_test_result 1 "Could not extract API key from response"
                echo -e "${YELLOW}Please set API_KEY environment variable or check server logs${NC}"
                return 1
            fi
        else
            print_test_result 1 "Could not get API keys (HTTP $http_code)"
            echo -e "${YELLOW}Please set API_KEY environment variable or check server logs${NC}"
            return 1
        fi
    else
        print_test_result 0 "Using provided API key"
        echo "API Key: ${API_KEY:0:20}..."
    fi
    
    return 0
}

# Function to create test audio file
create_test_audio() {
    print_test_header "Creating Test Audio File"
    
    if [ -f "$AUDIO_FILE" ]; then
        print_test_result 0 "Test audio file exists: $AUDIO_FILE"
        return 0
    fi
    
    # Try to create a simple test audio file using sox or ffmpeg if available
    if command -v sox &> /dev/null; then
        echo -e "${YELLOW}Creating test audio file using sox...${NC}"
        sox -n -r 16000 -c 1 -b 16 "$AUDIO_FILE" synth 3 sine 440 2>/dev/null
        if [ -f "$AUDIO_FILE" ]; then
            print_test_result 0 "Created test audio file: $AUDIO_FILE"
            return 0
        fi
    fi
    
    if command -v ffmpeg &> /dev/null; then
        echo -e "${YELLOW}Creating test audio file using ffmpeg...${NC}"
        ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ar 16000 -ac 1 "$AUDIO_FILE" -y 2>/dev/null
        if [ -f "$AUDIO_FILE" ]; then
            print_test_result 0 "Created test audio file: $AUDIO_FILE"
            return 0
        fi
    fi
    
    # Check if placeholder audio exists
    if [ -f "public/placeholder-audio.mp3" ]; then
        echo -e "${YELLOW}Using placeholder audio file...${NC}"
        AUDIO_FILE="public/placeholder-audio.mp3"
        print_test_result 0 "Using placeholder audio file: $AUDIO_FILE"
        return 0
    fi
    
    print_test_result 1 "Could not create test audio file"
    echo -e "${YELLOW}Please create a test audio file or install sox/ffmpeg${NC}"
    return 1
}

# Function to test STT endpoint
test_stt() {
    print_test_header "Testing STT Endpoint"
    
    if [ ! -f "$AUDIO_FILE" ]; then
        print_test_result 1 "Audio file not found: $AUDIO_FILE"
        return 1
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/stt" \
        -H "Authorization: Bearer $API_KEY" \
        -F "audio=@$AUDIO_FILE" \
        -F "language=en" \
        -F "format=wav" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Check if response has required fields
        if echo "$body" | grep -q '"text"'; then
            print_test_result 0 "STT endpoint returned 200 OK"
            echo "Response preview: $(echo "$body" | head -c 200)..."
            
            # Check for error messages (might be mock response)
            if echo "$body" | grep -q "mock"; then
                echo -e "${YELLOW}Warning: Response contains 'mock' - endpoint may not be fully implemented${NC}"
            fi
        else
            print_test_result 1 "STT response missing 'text' field"
            echo "Response: $body"
        fi
    elif [ "$http_code" -eq 503 ]; then
        print_test_result 1 "STT service unavailable (503)"
        echo "Response: $body"
    elif [ "$http_code" -eq 401 ]; then
        print_test_result 1 "STT authentication failed (401)"
        echo "Response: $body"
    else
        print_test_result 1 "STT endpoint returned HTTP $http_code"
        echo "Response: $body"
    fi
}

# Function to test VAD endpoint
test_vad() {
    print_test_header "Testing VAD Endpoint"
    
    if [ ! -f "$AUDIO_FILE" ]; then
        print_test_result 1 "Audio file not found: $AUDIO_FILE"
        return 1
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/vad" \
        -H "Authorization: Bearer $API_KEY" \
        -F "audio=@$AUDIO_FILE" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Check if response has segments
        if echo "$body" | grep -q '"segments"'; then
            print_test_result 0 "VAD endpoint returned 200 OK"
            echo "Response preview: $(echo "$body" | head -c 200)..."
            
            # Check for mock responses
            if echo "$body" | grep -q "mock\|Mock"; then
                echo -e "${YELLOW}Warning: Response may contain mock data${NC}"
            fi
        else
            print_test_result 1 "VAD response missing 'segments' field"
            echo "Response: $body"
        fi
    elif [ "$http_code" -eq 501 ]; then
        print_test_result 1 "VAD service not implemented (501)"
        echo "Response: $body"
    elif [ "$http_code" -eq 503 ]; then
        print_test_result 1 "VAD service unavailable (503)"
        echo "Response: $body"
    elif [ "$http_code" -eq 401 ]; then
        print_test_result 1 "VAD authentication failed (401)"
        echo "Response: $body"
    else
        print_test_result 1 "VAD endpoint returned HTTP $http_code"
        echo "Response: $body"
    fi
}

# Function to test VLLM endpoint
test_vllm() {
    print_test_header "Testing VLLM Endpoint"
    
    # Test 1: Basic VLLM (text only)
    echo -e "${YELLOW}Test 1: Basic VLLM (text only)${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/vllm/chat" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "message": "Hello, how are you?",
            "session_id": "test-session-123",
            "mode": "assistant"
        }' 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        if echo "$body" | grep -q '"text"'; then
            print_test_result 0 "VLLM endpoint returned 200 OK (text only)"
            echo "Response preview: $(echo "$body" | head -c 200)..."
            
            # Check for mock responses
            if echo "$body" | grep -q "mock\|Mock"; then
                echo -e "${YELLOW}Warning: Response may contain mock data${NC}"
            fi
        else
            print_test_result 1 "VLLM response missing 'text' field"
            echo "Response: $body"
        fi
    elif [ "$http_code" -eq 503 ]; then
        print_test_result 1 "VLLM service unavailable (503)"
        echo "Response: $body"
    elif [ "$http_code" -eq 401 ]; then
        print_test_result 1 "VLLM authentication failed (401)"
        echo "Response: $body"
    else
        print_test_result 1 "VLLM endpoint returned HTTP $http_code"
        echo "Response: $body"
    fi
    
    # Test 2: VLLM with voice (TTS)
    echo -e "\n${YELLOW}Test 2: VLLM with voice (TTS)${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/vllm/chat" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "message": "Hello, this is a test with voice.",
            "session_id": "test-session-456",
            "mode": "assistant",
            "voice": "chatterbox"
        }' 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        if echo "$body" | grep -q '"text"'; then
            if echo "$body" | grep -q '"audioBase64"'; then
                print_test_result 0 "VLLM endpoint returned 200 OK (with voice)"
                echo "Response includes audioBase64 field"
            else
                print_test_result 1 "VLLM response missing 'audioBase64' field (voice requested)"
                echo "Response: $body" | head -c 500
            fi
        else
            print_test_result 1 "VLLM response missing 'text' field"
            echo "Response: $body"
        fi
    else
        print_test_result 1 "VLLM endpoint returned HTTP $http_code (with voice)"
        echo "Response: $body"
    fi
}

# Function to test error scenarios
test_errors() {
    print_test_header "Testing Error Scenarios"
    
    # Test 1: Missing API key
    echo -e "${YELLOW}Test 1: Missing API key${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/stt" \
        -F "audio=@$AUDIO_FILE" \
        -F "language=en" \
        -F "format=wav" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 401 ]; then
        print_test_result 0 "Missing API key returns 401"
    else
        print_test_result 1 "Missing API key should return 401, got $http_code"
    fi
    
    # Test 2: Invalid API key
    echo -e "\n${YELLOW}Test 2: Invalid API key${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/stt" \
        -H "Authorization: Bearer INVALID_KEY" \
        -F "audio=@$AUDIO_FILE" \
        -F "language=en" \
        -F "format=wav" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 401 ]; then
        print_test_result 0 "Invalid API key returns 401"
    else
        print_test_result 1 "Invalid API key should return 401, got $http_code"
    fi
    
    # Test 3: Missing message in VLLM
    echo -e "\n${YELLOW}Test 3: Missing message in VLLM${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/vllm/chat" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "session_id": "test-session-123",
            "mode": "assistant"
        }' 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ]; then
        print_test_result 0 "Missing message returns 400"
    else
        print_test_result 1 "Missing message should return 400, got $http_code"
    fi
    
    # Test 4: Missing audio file in STT
    echo -e "\n${YELLOW}Test 4: Missing audio file in STT${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/stt" \
        -H "Authorization: Bearer $API_KEY" \
        -F "language=en" \
        -F "format=wav" 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ]; then
        print_test_result 0 "Missing audio file returns 400"
    else
        print_test_result 1 "Missing audio file should return 400, got $http_code"
    fi
}

# Function to print test summary
print_summary() {
    print_test_header "Test Summary"
    
    echo -e "Total Tests: ${TESTS_TOTAL}"
    echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
    echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     VoiceForge API Endpoint Test Suite (Plan 1)         ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Check if server is running
    if ! check_server; then
        echo -e "${RED}Server is not running. Please start the server first.${NC}"
        exit 1
    fi
    
    # Get API key
    if ! get_api_key; then
        echo -e "${RED}Cannot proceed without API key.${NC}"
        exit 1
    fi
    
    # Create test audio file
    create_test_audio
    
    # Run tests
    test_stt
    test_vad
    test_vllm
    test_errors
    
    # Print summary
    print_summary
    
    exit $?
}

# Run main function
main

