#!/bin/bash
# Test script for remaining AI modules: STT, VAD, Voice Cloning

HF_SPACE_URL="${HF_SPACE_URL:-https://chrisdemonxxx-voiceforge-v1-0.hf.space}"
API_KEY="${API_KEY:-vf_sk_19798aa99815232e6d53e1af34f776e1}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     VoiceForge - Testing Remaining AI Modules                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Testing: $HF_SPACE_URL"
echo ""

# Create a simple test audio file (1 second of silence at 16kHz)
echo "1. Creating test audio file..."
sox -n -r 16000 -c 1 -b 16 /tmp/test_audio.wav trim 0 1 2>/dev/null || \
ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -ar 16000 -ac 1 /tmp/test_audio.wav -y 2>/dev/null || \
echo "⚠️  Could not create audio file - will test with base64 encoding instead"

# Test STT endpoint
echo ""
echo "2. Testing Speech-to-Text (STT)..."
if [ -f /tmp/test_audio.wav ]; then
    STT_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -F "audio=@/tmp/test_audio.wav" \
        -F "language=en" \
        "$HF_SPACE_URL/api/stt" \
        -w "\nHTTP_CODE:%{http_code}")
    
    HTTP_CODE=$(echo "$STT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    STT_BODY=$(echo "$STT_RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ STT test passed"
        echo "$STT_BODY" | jq '.' 2>/dev/null || echo "$STT_BODY"
    else
        echo "❌ STT test failed - HTTP $HTTP_CODE"
        echo "$STT_BODY" | head -20
    fi
else
    # Test with base64 encoded audio
    echo "   Testing STT with base64 audio..."
    AUDIO_B64=$(base64 -w 0 /tmp/test_audio.wav 2>/dev/null || echo "")
    if [ -n "$AUDIO_B64" ]; then
        STT_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"audio\":\"$AUDIO_B64\",\"language\":\"en\"}" \
            "$HF_SPACE_URL/api/stt" \
            -w "\nHTTP_CODE:%{http_code}")
        
        HTTP_CODE=$(echo "$STT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        STT_BODY=$(echo "$STT_RESPONSE" | grep -v "HTTP_CODE")
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ STT test passed (base64)"
            echo "$STT_BODY" | jq '.' 2>/dev/null || echo "$STT_BODY"
        else
            echo "❌ STT test failed - HTTP $HTTP_CODE"
            echo "$STT_BODY" | head -20
        fi
    else
        echo "⏭️  STT test skipped - no audio file available"
    fi
fi

# Test VAD endpoint
echo ""
echo "3. Testing Voice Activity Detection (VAD)..."
if [ -f /tmp/test_audio.wav ]; then
    VAD_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -F "audio=@/tmp/test_audio.wav" \
        "$HF_SPACE_URL/api/vad" \
        -w "\nHTTP_CODE:%{http_code}")
    
    HTTP_CODE=$(echo "$VAD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    VAD_BODY=$(echo "$VAD_RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ VAD test passed"
        echo "$VAD_BODY" | jq '.' 2>/dev/null || echo "$VAD_BODY"
    else
        echo "❌ VAD test failed - HTTP $HTTP_CODE"
        echo "$VAD_BODY" | head -20
    fi
else
    # Test with base64 encoded audio
    echo "   Testing VAD with base64 audio..."
    AUDIO_B64=$(base64 -w 0 /tmp/test_audio.wav 2>/dev/null || echo "")
    if [ -n "$AUDIO_B64" ]; then
        VAD_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"audio\":\"$AUDIO_B64\"}" \
            "$HF_SPACE_URL/api/vad" \
            -w "\nHTTP_CODE:%{http_code}")
        
        HTTP_CODE=$(echo "$VAD_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        VAD_BODY=$(echo "$VAD_RESPONSE" | grep -v "HTTP_CODE")
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ VAD test passed (base64)"
            echo "$VAD_BODY" | jq '.' 2>/dev/null || echo "$VAD_BODY"
        else
            echo "❌ VAD test failed - HTTP $HTTP_CODE"
            echo "$VAD_BODY" | head -20
        fi
    else
        echo "⏭️  VAD test skipped - no audio file available"
    fi
fi

# Test Voice Cloning - Synthetic mode (no audio required)
echo ""
echo "4. Testing Voice Cloning - Synthetic Mode..."
CLONE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "cloningMode": "synthetic",
        "name": "Test Synthetic Voice",
        "model": "chatterbox",
        "voiceDescription": "A clear and professional female voice",
        "pitch": 150,
        "tone": "neutral",
        "pace": 1.0
    }' \
    "$HF_SPACE_URL/api/clone-voice" \
    -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$CLONE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
CLONE_BODY=$(echo "$CLONE_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Voice Cloning (Synthetic) test passed"
    echo "$CLONE_BODY" | jq '.' 2>/dev/null || echo "$CLONE_BODY"
    
    # Extract voice ID if available
    VOICE_ID=$(echo "$CLONE_BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$VOICE_ID" ] && [ "$VOICE_ID" != "null" ]; then
        echo ""
        echo "5. Testing TTS with cloned voice..."
        TTS_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer $API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"This is a test of the cloned voice.\",\"model\":\"chatterbox\",\"voice\":\"$VOICE_ID\"}" \
            "$HF_SPACE_URL/api/tts" \
            -w "\nHTTP_CODE:%{http_code}" \
            -o /tmp/cloned_voice_test.wav)
        
        TTS_HTTP_CODE=$(echo "$TTS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
        if [ "$TTS_HTTP_CODE" = "200" ] && [ -f /tmp/cloned_voice_test.wav ] && [ -s /tmp/cloned_voice_test.wav ]; then
            echo "✅ TTS with cloned voice test passed"
            echo "   Audio file generated: /tmp/cloned_voice_test.wav"
        else
            echo "⚠️  TTS with cloned voice test failed - HTTP $TTS_HTTP_CODE"
        fi
    fi
else
    echo "❌ Voice Cloning (Synthetic) test failed - HTTP $HTTP_CODE"
    echo "$CLONE_BODY" | head -20
fi

# Test Voice Cloning - Instant mode (requires audio)
echo ""
echo "6. Testing Voice Cloning - Instant Mode..."
if [ -f /tmp/test_audio.wav ]; then
    CLONE_INSTANT_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -F "reference=@/tmp/test_audio.wav" \
        -F "cloningMode=instant" \
        -F "name=Test Instant Voice" \
        -F "model=chatterbox" \
        "$HF_SPACE_URL/api/clone-voice" \
        -w "\nHTTP_CODE:%{http_code}")
    
    HTTP_CODE=$(echo "$CLONE_INSTANT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    CLONE_BODY=$(echo "$CLONE_INSTANT_RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Voice Cloning (Instant) test passed"
        echo "$CLONE_BODY" | jq '.' 2>/dev/null || echo "$CLONE_BODY"
    else
        echo "❌ Voice Cloning (Instant) test failed - HTTP $HTTP_CODE"
        echo "$CLONE_BODY" | head -20
    fi
else
    echo "⏭️  Voice Cloning (Instant) test skipped - no audio file available"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Tests completed. Check results above."
echo ""
echo "Cleanup:"
rm -f /tmp/test_audio.wav /tmp/cloned_voice_test.wav 2>/dev/null

