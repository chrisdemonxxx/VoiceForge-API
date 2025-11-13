# Plan 2: Telephony Bidirectional Audio - Complete Two-Way Voice Conversations

**Agent Assignment**: Agent 2  
**Priority**: Critical  
**Estimated Time**: 4-5 hours  
**Dependencies**: Plan 1 (Backend API Wiring) should be completed first

## Objective
Implement full bidirectional audio in telephony system to enable complete voice conversations: receive audio from phone → STT → VLLM → TTS → send audio back to phone.

## Current State
- Telephony service receives audio from Twilio
- Audio is processed through STT → VLLM → TTS pipeline
- **Missing**: Audio is not sent back to Twilio (unidirectional only)
- TODO comment at line 1405 in routes.ts: "Implement bidirectional audio"

## Tasks

### Task 2.1: Fix Telephony Service ML Client Reference
**File**: `server/services/telephony-service.ts` (line 227)

**Current Issue**:
```typescript
// Uses pythonBridge directly instead of mlClient
const transcriptionResult = await this.pythonBridge.processSTTChunk({
```

**Problem**: The service uses `pythonBridge` directly, which won't work when `USE_HF_SPACES_ML=true`. It should use `mlClient` instead.

**Target Fix**:
```typescript
// At top of file, import mlClient
import { mlClient } from "../ml-client";

// In processAudioChunk method, replace all pythonBridge calls:

// STT call
const transcriptionResult = await mlClient.processSTTChunk({
  chunk: audioChunk.toString("base64"),
  sequence: session.audioBuffer.length - 1,
  language: "en",
  return_partial: false,
});

// VLLM call
const vllmResult = await mlClient.callVLLM({
  message: transcriptionResult.text,
  session_id: sessionId,
  mode: "assistant",
});

// TTS call
const ttsAudioBuffer = await mlClient.callTTS({
  text: agentResponse,
  model: "chatterbox",
  speed: 1.0,
});
```

**Success Criteria**:
- [ ] Telephony service uses mlClient (not pythonBridge directly)
- [ ] Works with both local Python bridge and HF Spaces modes
- [ ] All ML calls go through unified mlClient interface

---

### Task 2.2: Implement Bidirectional Audio in Twilio Stream
**File**: `server/routes.ts` (lines 1306-1437, especially line 1405)

**Current State**:
```typescript
case 'media':
  // ... audio conversion code ...
  await telephonyService.processAudioChunk(sessionId, pcm16k);
  
  // TODO: Implement bidirectional audio
  // 1. Get synthesized response from ML pipeline (STT → VLLM → TTS)
  // 2. Convert PCM 16kHz response to μ-law 8kHz using converter.convertMLToTelephony()
  // 3. Send back to Twilio using media 'mark' and 'media' events
  break;
```

**Target Implementation**:
```typescript
case 'media':
  // Twilio sends base64-encoded μ-law audio at 8kHz
  const payload = message.media.payload;
  const audioChunk = Buffer.from(payload, 'base64');
  
  // Convert μ-law 8kHz → PCM 16kHz for ML processing
  try {
    const { getAudioConverter } = await import("./services/audio-converter-bridge");
    const converter = await getAudioConverter();
    const pcm16k = await converter.convertTelephonyToML(audioChunk);
    
    // Process audio through telephony service (STT → VLLM → TTS)
    const responseAudio = await telephonyService.processAudioChunk(sessionId, pcm16k);
    
    if (responseAudio && responseAudio.length > 0) {
      // Convert PCM 16kHz response → μ-law 8kHz for Twilio
      const ulaw8k = await converter.convertMLToTelephony(responseAudio);
      
      // Send mark event first (for synchronization)
      const markMessage = {
        event: 'mark',
        streamSid: streamSid,
        mark: {
          name: `response_${Date.now()}`
        }
      };
      ws.send(JSON.stringify(markMessage));
      
      // Send audio back to Twilio in chunks (20ms frames)
      const chunkSize = 160; // 20ms at 8kHz = 160 samples
      const ulawBuffer = Buffer.from(ulaw8k);
      
      for (let i = 0; i < ulawBuffer.length; i += chunkSize) {
        const chunk = ulawBuffer.slice(i, i + chunkSize);
        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: chunk.toString('base64')
          }
        };
        ws.send(JSON.stringify(mediaMessage));
      }
    }
  } catch (conversionError: any) {
    console.error('[TwilioMedia] Audio processing error:', conversionError.message);
    // Continue without sending response if conversion fails
  }
  break;
```

**Success Criteria**:
- [ ] Audio flows: Twilio → STT → VLLM → TTS → Twilio
- [ ] Format conversion works (PCM ↔ μ-law)
- [ ] Audio sent in proper chunks
- [ ] Low latency maintained (<1 second end-to-end)
- [ ] No audio dropouts or quality issues

**Testing**:
1. Initiate call via `/api/telephony/calls`
2. Speak into phone
3. Verify response plays on phone
4. Check logs for any errors

---

### Task 2.3: Verify Audio Converter Bridge
**File**: `server/services/audio-converter-bridge.ts`

**Action Items**:
- [ ] Verify `convertTelephonyToML()` method exists and works
  - Input: μ-law 8kHz audio
  - Output: PCM 16kHz audio
- [ ] Verify `convertMLToTelephony()` method exists and works
  - Input: PCM 16kHz audio
  - Output: μ-law 8kHz audio
- [ ] Test with sample audio files
- [ ] Add error handling if methods missing
- [ ] Verify audio quality maintained after conversion

**If Methods Missing**:
```typescript
// Add to audio-converter-bridge.ts if not present
export async function getAudioConverter() {
  // Implementation should handle:
  // - μ-law to PCM conversion
  // - Sample rate conversion (8kHz ↔ 16kHz)
  // - Proper audio format handling
}
```

**Success Criteria**:
- [ ] Both conversion directions work correctly
- [ ] Audio quality maintained
- [ ] Proper error handling
- [ ] Performance acceptable (<50ms conversion time)

---

### Task 2.4: Update Telephony Service Return Type
**File**: `server/services/telephony-service.ts` (method: `processAudioChunk`)

**Current Issue**: Method may return `Buffer | null`, but we need to ensure it returns the TTS audio properly.

**Verify**:
- [ ] Method signature: `async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<Buffer | null>`
- [ ] Returns TTS audio buffer when successful
- [ ] Returns null when no response needed (silence, error)
- [ ] Handles errors gracefully

**If Needed, Update**:
```typescript
async processAudioChunk(sessionId: string, audioChunk: Buffer): Promise<Buffer | null> {
  // ... existing code ...
  
  // Ensure we return the TTS audio buffer
  if (ttsAudioBuffer && ttsAudioBuffer.length > 0) {
    return ttsAudioBuffer;
  }
  
  return null;
}
```

---

### Task 2.5: Add Flow Integration
**File**: `server/services/telephony-service.ts`

**Enhancement**: If a call has a `flowId`, use the agent flow for conversation logic.

**Action Items**:
- [ ] Check if session has flowId
- [ ] Load agent flow from database
- [ ] Use flow configuration for VLLM system prompt
- [ ] Apply flow nodes/edges logic if needed
- [ ] Handle flow transitions

**Basic Implementation**:
```typescript
// In processAudioChunk, after STT:
if (session.flowId) {
  const flow = await storage.getAgentFlow(session.flowId);
  if (flow && flow.configuration) {
    // Use flow configuration for VLLM
    const systemPrompt = flow.configuration.systemPrompt || "You are a helpful assistant.";
    // ... apply flow logic ...
  }
}
```

---

### Task 2.6: Error Handling & Logging
**Files**: `server/routes.ts`, `server/services/telephony-service.ts`

**Action Items**:
- [ ] Add comprehensive error handling in Twilio stream handler
- [ ] Log audio processing errors
- [ ] Handle WebSocket disconnections gracefully
- [ ] Add timeout handling for ML operations
- [ ] Log latency metrics

---

## Additional Tasks

### Task 2.7: Test End-to-End Telephony Flow
**Action Items**:
1. [ ] Initiate call via API
2. [ ] Verify Twilio receives call
3. [ ] Speak into phone
4. [ ] Verify STT transcribes correctly
5. [ ] Verify VLLM generates response
6. [ ] Verify TTS generates audio
7. [ ] Verify audio plays on phone
8. [ ] Verify call completes successfully
9. [ ] Check latency (<1 second end-to-end)
10. [ ] Verify call recording works (if enabled)

### Task 2.8: Performance Optimization
**Action Items**:
- [ ] Optimize audio chunk processing
- [ ] Reduce latency in conversion pipeline
- [ ] Add audio buffering if needed
- [ ] Optimize WebSocket message sending

## Success Criteria (Final Checklist)

- [ ] Telephony service uses mlClient (not pythonBridge)
- [ ] Bidirectional audio works: receive and send
- [ ] Audio format conversion works correctly
- [ ] Full conversation loop: STT → VLLM → TTS
- [ ] Low latency maintained (<1 second)
- [ ] Error handling implemented
- [ ] End-to-end test passes
- [ ] No audio quality issues
- [ ] WebSocket connections stable

## Notes

- This plan depends on Plan 1 being completed (STT/VLLM endpoints working)
- Audio conversion is critical - test thoroughly
- Twilio media stream protocol requires specific message format
- Consider adding audio buffering for smoother playback

## Files to Modify

1. `server/services/telephony-service.ts` - Fix mlClient usage, verify return types
2. `server/routes.ts` - Implement bidirectional audio in Twilio stream handler
3. `server/services/audio-converter-bridge.ts` - Verify conversion methods

## Dependencies

- **Requires**: Plan 1 (Backend API Wiring) - STT and VLLM endpoints must work
- **Blocks**: None - This is the final telephony feature

