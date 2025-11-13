# Plan 1: Backend API Wiring - Replace Mock Endpoints

**Agent Assignment**: Agent 1  
**Priority**: Critical  
**Estimated Time**: 3-4 hours  
**Dependencies**: None

## Objective
Replace all mock implementations in backend API endpoints with real ML client calls to enable production-ready STT, VAD, and VLLM functionality.

## Current State
- STT endpoint returns mock transcription
- VAD endpoint returns hardcoded segments
- VLLM endpoint returns mock responses
- TTS endpoint already works (uses mlClient)

## Tasks

### Task 1.1: Wire STT Endpoint
**File**: `server/routes.ts` (lines 336-361)

**Current Code**:
```typescript
// Mock STT transcription - will be replaced with Whisper
const transcription = {
  text: "This is a mock transcription of the uploaded audio.",
  language: data.language,
  duration: 3.5,
  confidence: 0.98,
};
```

**Target Implementation**:
```typescript
const audioBuffer = req.file.buffer;

// Use mlClient to process STT
const transcriptionResult = await mlClient.processSTTChunk({
  chunk: audioBuffer.toString('base64'),
  sequence: 0,
  language: data.language || 'en',
  return_partial: false,
});

const transcription = {
  text: transcriptionResult.text,
  language: transcriptionResult.language,
  duration: transcriptionResult.duration,
  confidence: transcriptionResult.confidence,
  segments: transcriptionResult.segments || [],
};
```

**Success Criteria**:
- [ ] Endpoint accepts audio file upload
- [ ] Returns real transcription from Whisper
- [ ] Includes language detection
- [ ] Returns confidence scores
- [ ] Handles errors gracefully

**Testing**:
```bash
curl -X POST http://localhost:5000/api/stt \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "audio=@test.wav" \
  -F "language=en"
```

---

### Task 1.2: Wire VAD Endpoint
**File**: `server/routes.ts` (lines 363-381)

**Current Code**:
```typescript
// Mock VAD - will be replaced with Silero VAD
const segments = [
  { start: 0.5, end: 2.3, confidence: 0.95 },
  { start: 3.1, end: 5.7, confidence: 0.92 },
  { start: 6.2, end: 8.9, confidence: 0.97 },
];
```

**Target Implementation**:
```typescript
const audioBuffer = req.file.buffer;

// Check if mlClient has VAD method (may need to add to interface)
try {
  // Option 1: If HF Spaces has VAD endpoint
  if (typeof (mlClient as any).processVAD === 'function') {
    const vadResult = await (mlClient as any).processVAD(audioBuffer);
    return res.json({ segments: vadResult.segments });
  }
  
  // Option 2: Use Python bridge VAD service directly
  const { pythonBridge } = await import("./python-bridge");
  const vadResult = await pythonBridge.processVAD?.(audioBuffer);
  
  if (vadResult && vadResult.segments) {
    return res.json({ segments: vadResult.segments });
  }
  
  // Fallback: Return error if VAD not available
  return res.status(501).json({ 
    error: "VAD service not available",
    message: "Silero VAD integration pending"
  });
} catch (error: any) {
  console.error("[VAD] Error:", error);
  res.status(500).json({ error: error.message });
}
```

**Note**: May need to add `processVAD` method to mlClient interface if not present.

**Success Criteria**:
- [ ] Returns real voice activity segments
- [ ] Accurate start/end timestamps
- [ ] Confidence scores included
- [ ] Handles errors gracefully

**Testing**:
```bash
curl -X POST http://localhost:5000/api/vad \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "audio=@test.wav"
```

---

### Task 1.3: Wire VLLM Endpoint
**File**: `server/routes.ts` (lines 590-609)

**Current Code**:
```typescript
// Mock VLLM response - will be replaced with actual Llama/Qwen
const response = {
  text: "This is a mock response from the VLLM...",
  audioUrl: voice ? "/api/tts/mock-response.wav" : null,
};
```

**Target Implementation**:
```typescript
const { message, voice, session_id, mode, system_prompt } = req.body;

if (!message) {
  return res.status(400).json({ error: "Message is required" });
}

// Use mlClient to call VLLM
const vllmResult = await mlClient.callVLLM({
  session_id: session_id || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  message: message,
  mode: mode || "assistant",
  system_prompt: system_prompt,
  stream: false,
});

const response: any = {
  text: vllmResult.response,
  session_id: vllmResult.session_id,
  processing_time: vllmResult.processing_time,
  tokens: vllmResult.tokens,
  context_size: vllmResult.context_size,
};

// If voice is requested, generate TTS audio
if (voice) {
  try {
    const audioBuffer = await mlClient.callTTS({
      text: vllmResult.response,
      model: "chatterbox",
      voice: voice,
      speed: 1.0,
    });
    
    // Option 1: Return base64 audio in response
    response.audioBase64 = audioBuffer.toString('base64');
    response.audioFormat = 'wav';
    
    // Option 2: Store and return URL (if file storage implemented)
    // const audioUrl = await storeAudioFile(audioBuffer);
    // response.audioUrl = audioUrl;
  } catch (ttsError: any) {
    console.error("[VLLM] TTS generation error:", ttsError);
    // Continue without audio if TTS fails
  }
}

res.json(response);
```

**Success Criteria**:
- [ ] Returns real LLM responses
- [ ] Maintains conversation context via session_id
- [ ] Optional TTS generation works
- [ ] Handles errors gracefully
- [ ] Returns processing metrics

**Testing**:
```bash
curl -X POST http://localhost:5000/api/vllm/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "session_id": "test-session-123",
    "mode": "assistant"
  }'
```

---

## Additional Tasks

### Task 1.4: Verify mlClient Interface
**Files**: `server/ml-client.ts`, `server/python-bridge.ts`, `server/hf-spaces-client.ts`

**Action Items**:
- [ ] Verify `mlClient.processSTTChunk()` method exists
- [ ] Verify `mlClient.callVLLM()` method exists
- [ ] Check if `processVAD()` method exists (may need to add)
- [ ] Ensure both pythonBridge and hfSpacesClient implement all methods
- [ ] Add missing methods if needed

### Task 1.5: Error Handling Enhancement
**File**: `server/routes.ts`

**Action Items**:
- [ ] Add specific error handling for ML service failures
- [ ] Add retry logic for transient failures
- [ ] Add timeout handling
- [ ] Improve error messages for users
- [ ] Log errors for debugging

### Task 1.6: Testing & Validation
**Action Items**:
- [ ] Test STT endpoint with various audio files
- [ ] Test VAD endpoint with different audio types
- [ ] Test VLLM endpoint with various messages
- [ ] Test error scenarios (invalid input, service down)
- [ ] Verify response formats match API documentation
- [ ] Test with both local Python bridge and HF Spaces client

## Success Criteria (Final Checklist)

- [ ] STT endpoint returns real transcriptions
- [ ] VAD endpoint returns real segments (or proper error if not available)
- [ ] VLLM endpoint returns real LLM responses
- [ ] All endpoints handle errors gracefully
- [ ] Response formats are consistent
- [ ] All tests pass
- [ ] No console errors
- [ ] API documentation updated if needed

## Notes

- The `mlClient` automatically switches between local Python bridge and HF Spaces API based on environment variables
- If HF Spaces endpoints don't exist yet, the Python bridge will be used as fallback
- All changes should maintain backward compatibility with existing API contracts
- Consider adding request/response logging for debugging

## Files to Modify

1. `server/routes.ts` - Main endpoint implementations
2. `server/ml-client.ts` - Verify interface (may need updates)
3. `server/python-bridge.ts` - Verify methods exist
4. `server/hf-spaces-client.ts` - Verify methods exist

## Dependencies

- None - This plan is independent and can be executed first

