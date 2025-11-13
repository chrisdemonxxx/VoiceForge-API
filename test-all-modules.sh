#!/bin/bash
# Comprehensive test script for all AI modules

HF_SPACE_URL="${HF_SPACE_URL:-https://chrisdemonxxx-voiceforge-v1-0.hf.space}"
API_KEY="${API_KEY:-vf_sk_19798aa99815232e6d53e1af34f776e1}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     VoiceForge - Complete AI Modules Test                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Testing: $HF_SPACE_URL"
echo ""

# Use existing test.wav file or create a simple one
AUDIO_FILE="test.wav"
if [ ! -f "$AUDIO_FILE" ]; then
    echo -e "${YELLOW}Creating test audio file...${NC}"
    # Create 1 second of 440Hz tone at 16kHz
    python3 -c "
import numpy as np
import wave
import sys

sample_rate = 16000
duration = 1.0
frequency = 440.0

t = np.linspace(0, duration, int(sample_rate * duration), False)
audio = np.sin(2 * np.pi * frequency * t)
audio = (audio * 32767).astype(np.int16)

with wave.open('test.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    wav_file.writeframes(audio.tobytes())
" 2>/dev/null || echo "⚠️  Could not create audio file"
fi

if [ ! -f "$AUDIO_FILE" ]; then
    echo -e "${RED}❌ No audio file available for testing${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Using audio file: $AUDIO_FILE${NC}"
echo ""

# Test results
PASSED=0
FAILED=0
SKIPPED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local file_field=$5
    local file_path=$6
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ -n "$file_path" ] && [ -f "$file_path" ]; then
        # File upload test
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            -F "$file_field=@$file_path" \
            $data \
            "$HF_SPACE_URL$endpoint")
    else
        # JSON test
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$HF_SPACE_URL$endpoint")
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ $name: PASSED${NC}"
        echo "$BODY" | jq '.' 2>/dev/null | head -10 || echo "$BODY" | head -5
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ $name: FAILED (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | head -5
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 1. Health Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Health Check" "GET" "/api/health" "" "" ""

# 2. Voice Library
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Voice Library" "GET" "/api/voice-library" "" "" ""

# 3. TTS
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello, this is a test of the text-to-speech system.","model":"chatterbox","voice":"en-us-sarah-f"}' \
    "$HF_SPACE_URL/api/tts" \
    -o /tmp/tts_output.wav)

TTS_HTTP_CODE=$(echo "$TTS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
if [ "$TTS_HTTP_CODE" = "200" ] && [ -f /tmp/tts_output.wav ] && [ -s /tmp/tts_output.wav ]; then
    echo -e "${GREEN}✅ TTS: PASSED${NC}"
    echo "   Audio file generated: $(ls -lh /tmp/tts_output.wav | awk '{print $5}')"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ TTS: FAILED (HTTP $TTS_HTTP_CODE)${NC}"
    FAILED=$((FAILED + 1))
fi

# 4. STT
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Speech-to-Text (STT)" "POST" "/api/stt" '{"language":"en"}' "audio" "$AUDIO_FILE"

# 5. VAD
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Voice Activity Detection (VAD)" "POST" "/api/vad" "" "audio" "$AUDIO_FILE"

# 6. VLLM
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Voice LLM (VLLM)" "POST" "/api/vllm/chat" '{"message":"Hello, how are you?","session_id":"test-session"}' "" ""

# 7. Voice Cloning - Synthetic
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CLONE_RESPONSE=$(test_endpoint "Voice Cloning (Synthetic)" "POST" "/api/clone-voice" \
    '{"cloningMode":"synthetic","name":"Test Synthetic Voice","model":"chatterbox","voiceDescription":"A clear and professional female voice"}' \
    "" "")

if [ $? -eq 0 ]; then
    # Extract voice ID and test TTS with it
    VOICE_ID=$(echo "$CLONE_RESPONSE" | jq -r '.id' 2>/dev/null)
    if [ -n "$VOICE_ID" ] && [ "$VOICE_ID" != "null" ]; then
        echo ""
        echo -e "${BLUE}Testing TTS with cloned voice (ID: $VOICE_ID)...${NC}"
        TTS_CLONE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"This is a test of the cloned voice.\",\"model\":\"chatterbox\",\"voice\":\"$VOICE_ID\"}" \
            "$HF_SPACE_URL/api/tts" \
            -o /tmp/cloned_voice_test.wav)
        
        TTS_CLONE_HTTP_CODE=$(echo "$TTS_CLONE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        if [ "$TTS_CLONE_HTTP_CODE" = "200" ] && [ -f /tmp/cloned_voice_test.wav ] && [ -s /tmp/cloned_voice_test.wav ]; then
            echo -e "${GREEN}✅ TTS with cloned voice: PASSED${NC}"
        else
            echo -e "${YELLOW}⚠️  TTS with cloned voice: FAILED (HTTP $TTS_CLONE_HTTP_CODE)${NC}"
        fi
    fi
fi

# 8. Voice Cloning - Instant
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Voice Cloning (Instant)" "POST" "/api/clone-voice" \
    '{"cloningMode":"instant","name":"Test Instant Voice","model":"chatterbox"}' \
    "reference" "$AUDIO_FILE"

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        TEST SUMMARY                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⏭️  Skipped: $SKIPPED${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "${BLUE}Success Rate: ${SUCCESS_RATE}%${NC}"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the results above.${NC}"
    exit 1
fi

