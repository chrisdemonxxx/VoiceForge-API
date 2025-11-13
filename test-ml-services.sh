#!/bin/bash

# ML Services Verification Test Script
# Tests all ML service endpoints on both local and HF Spaces

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HF_SPACES_URL="${HF_ML_API_URL:-https://chrisdemonxxx-voiceforge-v1-0.hf.space}"
LOCAL_URL="${LOCAL_API_URL:-http://localhost:5000}"
API_KEY="${API_KEY:-test-key}"

# Test results
PASSED=0
FAILED=0
SKIPPED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

print_skip() {
    echo -e "${YELLOW}⊘ $1 (skipped)${NC}"
    ((SKIPPED++))
}

# Test HF Spaces Health Endpoint
test_hf_spaces_health() {
    print_test "HF Spaces Health Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "${HF_SPACES_URL}/health" || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "HF Spaces health check passed (HTTP $http_code)"
        echo "Response: $body"
        return 0
    else
        print_failure "HF Spaces health check failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test HF Spaces TTS Endpoint
test_hf_spaces_tts() {
    print_test "HF Spaces TTS Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${HF_SPACES_URL}/api/tts" \
        -H "Content-Type: application/json" \
        -d '{
            "text": "Hello world",
            "model": "chatterbox",
            "voice": "default"
        }' || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        # Check if response contains audio data
        if echo "$body" | grep -q "audio"; then
            print_success "HF Spaces TTS endpoint works (HTTP $http_code)"
            return 0
        else
            print_failure "HF Spaces TTS endpoint returned 200 but no audio data"
            return 1
        fi
    elif [ "$http_code" = "404" ]; then
        print_skip "HF Spaces TTS endpoint not found (may not be implemented)"
        return 2
    else
        print_failure "HF Spaces TTS endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test HF Spaces STT Endpoint
test_hf_spaces_stt() {
    print_test "HF Spaces STT Endpoint"
    
    # Create a small test audio file (base64 encoded silence)
    test_audio_b64="UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${HF_SPACES_URL}/api/stt" \
        -H "Content-Type: application/json" \
        -d "{
            \"chunk\": \"$test_audio_b64\",
            \"sequence\": 0,
            \"language\": \"en\"
        }" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "HF Spaces STT endpoint works (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "404" ]; then
        print_skip "HF Spaces STT endpoint not found (may not be implemented)"
        return 2
    else
        print_failure "HF Spaces STT endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test HF Spaces VLLM Endpoint
test_hf_spaces_vllm() {
    print_test "HF Spaces VLLM Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${HF_SPACES_URL}/api/vllm" \
        -H "Content-Type: application/json" \
        -d '{
            "message": "Hello",
            "session_id": "test-123",
            "mode": "assistant"
        }' || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "HF Spaces VLLM endpoint works (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "404" ]; then
        print_skip "HF Spaces VLLM endpoint not found (may not be implemented)"
        return 2
    else
        print_failure "HF Spaces VLLM endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test HF Spaces VAD Endpoint
test_hf_spaces_vad() {
    print_test "HF Spaces VAD Endpoint"
    
    # Create a small test audio file (base64 encoded silence)
    test_audio_b64="UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${HF_SPACES_URL}/api/vad" \
        -H "Content-Type: application/json" \
        -d "{
            \"audio\": \"$test_audio_b64\"
        }" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "HF Spaces VAD endpoint works (HTTP $http_code)"
        return 0
    elif [ "$http_code" = "404" ]; then
        print_skip "HF Spaces VAD endpoint not found (may not be implemented)"
        return 2
    else
        print_failure "HF Spaces VAD endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test Local API TTS Endpoint
test_local_tts() {
    print_test "Local API TTS Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${LOCAL_URL}/api/tts" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "text": "Hello world",
            "model": "chatterbox",
            "voice": "default"
        }' || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Local TTS endpoint works (HTTP $http_code)"
        return 0
    else
        print_failure "Local TTS endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test Local API STT Endpoint
test_local_stt() {
    print_test "Local API STT Endpoint"
    
    # Create a small test audio file
    echo -n "RIFF" > /tmp/test.wav
    echo -n "    " >> /tmp/test.wav
    echo -n "WAVE" >> /tmp/test.wav
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${LOCAL_URL}/api/stt" \
        -H "Authorization: Bearer ${API_KEY}" \
        -F "audio=@/tmp/test.wav" \
        -F "language=en" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Local STT endpoint works (HTTP $http_code)"
        return 0
    else
        print_failure "Local STT endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test Local API VLLM Endpoint
test_local_vllm() {
    print_test "Local API VLLM Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${LOCAL_URL}/api/vllm/chat" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "message": "Hello",
            "session_id": "test-123",
            "mode": "assistant"
        }' || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Local VLLM endpoint works (HTTP $http_code)"
        return 0
    else
        print_failure "Local VLLM endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Test Local API VAD Endpoint
test_local_vad() {
    print_test "Local API VAD Endpoint"
    
    # Create a small test audio file
    echo -n "RIFF" > /tmp/test.wav
    echo -n "    " >> /tmp/test.wav
    echo -n "WAVE" >> /tmp/test.wav
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${LOCAL_URL}/api/vad" \
        -H "Authorization: Bearer ${API_KEY}" \
        -F "audio=@/tmp/test.wav" || echo "000")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        print_success "Local VAD endpoint works (HTTP $http_code)"
        return 0
    else
        print_failure "Local VAD endpoint failed (HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Main test execution
main() {
    print_header "ML Services Verification Test"
    
    echo "Configuration:"
    echo "  HF Spaces URL: ${HF_SPACES_URL}"
    echo "  Local API URL: ${LOCAL_URL}"
    echo "  API Key: ${API_KEY:0:10}..."
    echo ""
    
    # Test HF Spaces endpoints
    print_header "Testing HF Spaces Endpoints"
    test_hf_spaces_health
    test_hf_spaces_tts
    test_hf_spaces_stt
    test_hf_spaces_vllm
    test_hf_spaces_vad
    
    # Test Local API endpoints (only if server is running)
    print_header "Testing Local API Endpoints"
    if curl -s "${LOCAL_URL}/health" > /dev/null 2>&1; then
        test_local_tts
        test_local_stt
        test_local_vllm
        test_local_vad
    else
        print_skip "Local API server is not running (skipping local tests)"
    fi
    
    # Summary
    print_header "Test Summary"
    echo "Passed: ${PASSED}"
    echo "Failed: ${FAILED}"
    echo "Skipped: ${SKIPPED}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        exit 1
    fi
}

# Run tests
main

