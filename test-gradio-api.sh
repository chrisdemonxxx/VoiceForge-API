#!/bin/bash
# Test script for Gradio API interface
# Tests all endpoints accessible through the Gradio UI

HF_SPACE_URL="${HF_SPACE_URL:-https://chrisdemonxxx-voiceforge-v1-0.hf.space}"
API_KEY="${API_KEY:-vf_sk_19798aa99815232e6d53e1af34f776e1}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     VoiceForge - Gradio API Testing                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing: $HF_SPACE_URL"
echo ""

# Test health endpoint
echo "1. Testing Health Check..."
HEALTH=$(curl -s -H "Authorization: Bearer $API_KEY" "$HF_SPACE_URL/api/health")
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH"
fi
echo ""

# Test voice library
echo "2. Testing Voice Library..."
VOICES=$(curl -s -H "Authorization: Bearer $API_KEY" "$HF_SPACE_URL/api/voice-library")
VOICE_COUNT=$(echo "$VOICES" | jq 'length' 2>/dev/null || echo "0")
if [ "$VOICE_COUNT" -gt 0 ]; then
    echo "✅ Voice library accessible: $VOICE_COUNT voices"
else
    echo "⚠️  Voice library returned: $VOICES"
fi
echo ""

# Test TTS endpoint
echo "3. Testing TTS..."
TTS_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"text":"Hello, this is a test.","model":"chatterbox","voice":"en-us-sarah-f"}' \
    "$HF_SPACE_URL/api/tts" \
    -o /tmp/tts_test.wav -w "%{http_code}")

if [ "$TTS_RESPONSE" = "200" ]; then
    if [ -f /tmp/tts_test.wav ] && [ -s /tmp/tts_test.wav ]; then
        echo "✅ TTS test passed - audio file generated"
        rm -f /tmp/tts_test.wav
    else
        echo "❌ TTS test failed - no audio file generated"
    fi
else
    echo "❌ TTS test failed - HTTP $TTS_RESPONSE"
fi
echo ""

# Test VLLM endpoint
echo "4. Testing VLLM..."
VLLM_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"message":"Hello, how are you?","session_id":"test-session"}' \
    "$HF_SPACE_URL/api/vllm/chat")

if echo "$VLLM_RESPONSE" | grep -q "response"; then
    echo "✅ VLLM test passed"
    echo "$VLLM_RESPONSE" | jq -r '.response' 2>/dev/null || echo "$VLLM_RESPONSE"
else
    echo "❌ VLLM test failed: $VLLM_RESPONSE"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        TEST COMPLETE                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"

