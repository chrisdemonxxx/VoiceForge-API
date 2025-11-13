# Plan 4: ML Services Verification & HF Spaces Integration

**Agent Assignment**: Agent 4  
**Priority**: Critical  
**Estimated Time**: 2-3 hours  
**Dependencies**: None (can run in parallel with Plan 1)

## Objective
Verify HF Spaces deployment, test all ML services end-to-end, ensure environment variables are configured correctly, and fix any ML service integration issues.

## Current State
- HF Spaces deployed at: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`
- ML client switches between local Python bridge and HF Spaces API
- Need to verify which endpoints exist on HF Spaces
- Need to test all ML services work correctly

## Tasks

### Task 4.1: Verify HF Spaces Endpoints
**Action**: Test all expected endpoints on HF Spaces

**Test Commands**:
```bash
# Test Health Endpoint
curl https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health

# Test TTS Endpoint
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "Hello world",
    "model": "chatterbox",
    "voice": "default"
  }'

# Test STT Endpoint (if exists)
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/stt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "chunk": "base64encodedaudio",
    "language": "en",
    "sequence": 0
  }'

# Test VLLM Endpoint (if exists)
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/vllm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "message": "Hello",
    "session_id": "test-123",
    "mode": "assistant"
  }'

# Test VAD Endpoint (if exists)
curl -X POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/vad \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "audio": "base64encodedaudio"
  }'
```

**Action Items**:
- [ ] Document which endpoints exist
- [ ] Document which endpoints are missing
- [ ] Note response formats
- [ ] Check authentication requirements
- [ ] Test error responses

**Success Criteria**:
- [ ] Health endpoint works
- [ ] TTS endpoint works (critical)
- [ ] STT endpoint status known
- [ ] VLLM endpoint status known
- [ ] VAD endpoint status known
- [ ] Response formats documented

---

### Task 4.2: Update HF Spaces Client if Needed
**File**: `server/hf-spaces-client.ts`

**Action Items**:
- [ ] Verify all methods match actual HF Spaces endpoints
- [ ] Update endpoint URLs if different
- [ ] Fix request/response formats if mismatched
- [ ] Add missing methods if endpoints exist
- [ ] Add fallback logic for missing endpoints
- [ ] Improve error messages

**If Endpoints Don't Match**:
```typescript
// Example: If STT endpoint is different
async processSTTChunk(request: STTChunkRequest): Promise<STTChunkResponse> {
  // Check actual endpoint format
  // May need to adjust request body
  // May need to adjust response parsing
}
```

**Success Criteria**:
- [ ] All existing endpoints work
- [ ] Error handling improved
- [ ] Fallback logic for missing endpoints
- [ ] Clear error messages

---

### Task 4.3: Verify Environment Variables
**Files**: Deployment configs, Render dashboard, HF Spaces settings

**Check on Render Backend**:
- [ ] `USE_HF_SPACES_ML=true` OR `HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space`
- [ ] `DATABASE_URL` is set
- [ ] `ADMIN_TOKEN` is set (for production)
- [ ] `SESSION_SECRET` is set
- [ ] Any other required env vars

**Check on HF Spaces**:
- [ ] `DATABASE_URL` is set (if needed)
- [ ] `HUGGINGFACE_TOKEN` is set (if needed)
- [ ] Model cache paths configured
- [ ] GPU settings configured

**Action Items**:
- [ ] Document all required env vars
- [ ] Verify they're set correctly
- [ ] Test connection with current settings
- [ ] Update documentation if needed

**Success Criteria**:
- [ ] All required env vars documented
- [ ] All env vars set correctly
- [ ] Backend connects to HF Spaces
- [ ] Database connections work

---

### Task 4.4: Test TTS Service End-to-End
**Action**: Test TTS through entire pipeline

**Test Scenarios**:
1. **Basic TTS**:
   ```bash
   curl -X POST http://localhost:5000/api/tts \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello world",
       "model": "chatterbox",
       "voice": "default"
     }'
   ```

2. **TTS with Cloned Voice**:
   - Create a cloned voice first
   - Use cloned voice ID in TTS request
   - Verify audio uses cloned voice characteristics

3. **Different Models**:
   - Test chatterbox
   - Test higgs_audio_v2
   - Test styletts2
   - Verify all work

4. **Error Cases**:
   - Invalid model name
   - Missing text
   - Invalid voice ID
   - Service unavailable

**Action Items**:
- [ ] Test all TTS models
- [ ] Test with different voices
- [ ] Test with cloned voices
- [ ] Verify audio quality
- [ ] Check latency
- [ ] Test error handling

**Success Criteria**:
- [ ] All TTS models work
- [ ] Audio quality good
- [ ] Latency acceptable (<500ms)
- [ ] Error handling works
- [ ] Cloned voices work

---

### Task 4.5: Test STT Service End-to-End
**Action**: Test STT through entire pipeline

**Test Scenarios**:
1. **Basic STT**:
   ```bash
   curl -X POST http://localhost:5000/api/stt \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "audio=@test.wav" \
     -F "language=en"
   ```

2. **Different Languages**:
   - English
   - Spanish
   - French
   - Verify language detection

3. **Different Audio Formats**:
   - WAV
   - MP3
   - Verify format handling

4. **Error Cases**:
   - No audio file
   - Invalid format
   - Corrupted audio
   - Service unavailable

**Action Items**:
- [ ] Test with various audio files
   - Short audio (<5 seconds)
   - Long audio (>30 seconds)
   - Different languages
   - Different speakers
- [ ] Verify transcription accuracy
- [ ] Check confidence scores
- [ ] Test error handling

**Success Criteria**:
- [ ] STT returns accurate transcriptions
- [ ] Language detection works
- [ ] Confidence scores reasonable
- [ ] Error handling works
- [ ] Latency acceptable (<1 second)

---

### Task 4.6: Test VLLM Service End-to-End
**Action**: Test VLLM through entire pipeline

**Test Scenarios**:
1. **Basic VLLM**:
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

2. **Conversation Context**:
   - Send multiple messages with same session_id
   - Verify context maintained
   - Test conversation flow

3. **Different Modes**:
   - assistant mode
   - conversational mode
   - custom mode with system prompt

4. **With TTS**:
   - Request voice response
   - Verify audio generated
   - Check audio quality

5. **Error Cases**:
   - Missing message
   - Invalid session
   - Service unavailable

**Action Items**:
- [ ] Test basic VLLM calls
- [ ] Test conversation context
- [ ] Test different modes
- [ ] Test with TTS integration
- [ ] Verify response quality
- [ ] Check latency
- [ ] Test error handling

**Success Criteria**:
- [ ] VLLM returns real responses
- [ ] Context maintained across messages
- [ ] Different modes work
- [ ] TTS integration works
- [ ] Latency acceptable (<2 seconds)
- [ ] Error handling works

---

### Task 4.7: Test VAD Service End-to-End
**Action**: Test VAD through entire pipeline

**Test Scenarios**:
1. **Basic VAD**:
   ```bash
   curl -X POST http://localhost:5000/api/vad \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -F "audio=@test.wav"
   ```

2. **Different Audio Types**:
   - Speech only
   - Speech with silence
   - Music
   - Noise only

3. **Error Cases**:
   - No audio file
   - Invalid format
   - Service unavailable

**Action Items**:
- [ ] Test with various audio files
- [ ] Verify segment detection accuracy
- [ ] Check confidence scores
- [ ] Test error handling
- [ ] Verify if service available (may not be on HF Spaces)

**Success Criteria**:
- [ ] VAD returns real segments (if available)
- [ ] Segments accurate
- [ ] Confidence scores reasonable
- [ ] Error handling works (if service not available)

---

### Task 4.8: Test ML Client Switching
**Action**: Verify mlClient switches correctly between modes

**Test Scenarios**:
1. **HF Spaces Mode**:
   - Set `USE_HF_SPACES_ML=true`
   - Verify mlClient uses hfSpacesClient
   - Test all endpoints

2. **Local Python Bridge Mode**:
   - Unset `USE_HF_SPACES_ML`
   - Verify mlClient uses pythonBridge
   - Test all endpoints

3. **Automatic Detection**:
   - Set `HF_ML_API_URL` only
   - Verify automatic switching works

**Action Items**:
- [ ] Test mode switching
- [ ] Verify correct client used
- [ ] Test both modes work
- [ ] Document switching behavior

**Success Criteria**:
- [ ] Mode switching works correctly
- [ ] Both modes functional
- [ ] Automatic detection works
- [ ] No errors during switch

---

### Task 4.9: Verify Python Bridge Methods
**File**: `server/python-bridge.ts`

**Action Items**:
- [ ] Verify `callTTS()` method exists and works
- [ ] Verify `processSTTChunk()` method exists and works
- [ ] Verify `callVLLM()` method exists and works
- [ ] Check if `processVAD()` method exists (may need to add)
- [ ] Test all methods with real data
- [ ] Verify error handling

**If Methods Missing**:
- Add missing methods to pythonBridge
- Ensure worker pool supports them
- Test thoroughly

**Success Criteria**:
- [ ] All required methods exist
- [ ] All methods work correctly
- [ ] Error handling implemented
- [ ] Performance acceptable

---

### Task 4.10: Performance Testing
**Action**: Test performance of all ML services

**Metrics to Check**:
- TTS latency (target: <500ms)
- STT latency (target: <1 second)
- VLLM latency (target: <2 seconds)
- VAD latency (target: <200ms)
- End-to-end pipeline latency (target: <1 second)

**Action Items**:
- [ ] Measure latency for each service
- [ ] Test under load (multiple concurrent requests)
- [ ] Check for memory leaks
- [ ] Verify GPU utilization (if applicable)
- [ ] Document performance metrics

**Success Criteria**:
- [ ] All services meet latency targets
- [ ] No memory leaks
- [ ] Handles concurrent requests
- [ ] Performance documented

---

### Task 4.11: Error Handling & Resilience
**Files**: All ML service files

**Action Items**:
- [ ] Add retry logic for transient failures
- [ ] Add timeout handling
- [ ] Improve error messages
- [ ] Add fallback mechanisms
- [ ] Test error scenarios

**Success Criteria**:
- [ ] Retry logic implemented
- [ ] Timeouts handled
- [ ] Clear error messages
- [ ] Graceful degradation

---

## Additional Tasks

### Task 4.12: Documentation
**Action Items**:
- [ ] Document which endpoints exist on HF Spaces
- [ ] Document environment variables
- [ ] Document ML client switching behavior
- [ ] Document performance metrics
- [ ] Update API documentation

### Task 4.13: Monitoring & Logging
**Action Items**:
- [ ] Add logging for ML service calls
- [ ] Add metrics collection
- [ ] Add health check endpoints
- [ ] Set up alerts for failures

## Success Criteria (Final Checklist)

- [ ] HF Spaces endpoints verified
- [ ] All ML services tested end-to-end
- [ ] Environment variables configured
- [ ] ML client switching works
- [ ] Performance acceptable
- [ ] Error handling comprehensive
- [ ] Documentation updated
- [ ] Monitoring in place

## Notes

- This plan can run in parallel with Plan 1
- Focus on verification and testing
- Document findings for other agents
- Fix any integration issues found

## Files to Verify/Modify

1. `server/hf-spaces-client.ts` - Update if endpoints differ
2. `server/python-bridge.ts` - Verify methods exist
3. `server/ml-client.ts` - Verify switching logic
4. Environment configuration files
5. Documentation files

## Dependencies

- **None** - This plan is independent and can run in parallel
- **Helps**: Plan 1 (Backend API Wiring) - Provides test results for backend

