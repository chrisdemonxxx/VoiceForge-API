# ElevenLabs-like Voice Streaming Pipeline - Implementation Plan

## Goal
Build a complete real-time voice streaming pipeline that matches ElevenLabs' quality and stability for live calls.

## Core Components Required

### 1. TrueVoiceStreaming WebSocket Client
**File**: `server/services/truevoice-client.ts`
- WebSocket connection to `wss://api.loopercreations.org/ws/conversation`
- Connection management with auto-reconnect
- Message protocol handling (transcript, llm_token, llm_done, binary audio)
- Error handling and retry logic

### 2. Audio Format Converter
**File**: `server/services/audio-converter.ts`
- μ-law 8kHz ↔ PCM16 16kHz conversion
- Sample rate conversion
- Format validation

### 3. Adaptive Jitter Buffer
**File**: `server/services/jitter-buffer.ts`
- Dynamic buffer size: 20ms (min) to 500ms (max), target 50-200ms
- Jitter measurement and statistics
- Automatic buffer size adaptation
- Buffer underrun/overrun handling

### 4. Audio Sequencer
**File**: `server/services/audio-sequencer.ts`
- 64-bit sequence numbers (monotonic)
- High-precision timestamps
- Out-of-order packet detection and reordering
- Gap detection and interpolation
- Duplicate packet removal

### 5. Playback Controller
**File**: `server/services/playback-controller.ts`
- Adaptive playback speed adjustment (±5%)
- Clock synchronization
- Smooth chunk transitions (crossfade)
- Buffer level monitoring
- Playback state management

### 6. Chunk Manager
**File**: `server/services/chunk-manager.ts`
- Dynamic chunk sizing (0.1-1.0s)
- Network-aware sizing
- Chunk metadata (sequence, timestamp, duration, flags)

### 7. Breathing and Pause Manager
**Files**: 
- `server/services/breathing-generator.ts`
- `server/services/pause-manager.ts`
- Natural breathing sounds (0.1-0.3s)
- Context-aware pauses
- SSML-like breathing tags

### 8. Telephony Integration
**Files to modify**:
- `server/services/telephony-service.ts` - Integrate streaming pipeline
- `server/routes.ts` - Update Twilio media stream handler

## Implementation Order

1. **Audio Converter** (Foundation)
2. **TrueVoiceStreaming Client** (Core API integration)
3. **Jitter Buffer** (Stability)
4. **Audio Sequencer** (Ordering)
5. **Playback Controller** (Smooth playback)
6. **Chunk Manager** (Optimization)
7. **Breathing/Pause Manager** (Naturalness)
8. **Telephony Integration** (End-to-end)

## Success Criteria

- Sub-500ms end-to-end latency
- Stable playback with no audio glitches
- Natural breathing and pauses
- Handles network jitter gracefully
- Works with Twilio/Zadarma telephony
- Production-ready for bulk calling

