# ElevenLabs-like Voice Streaming Pipeline - Complete Implementation Plan

## Overview
Build a production-ready real-time voice streaming pipeline that matches ElevenLabs' quality, stability, and naturalness for live calls.

## Research Summary: ElevenLabs Techniques

### Core Streaming Features
1. **Adaptive Jitter Buffering**: 50-200ms target buffer, dynamically adjusts 20-500ms
2. **Audio Chunk Sequencing**: 0.1-1.0s chunks with sequence numbers and timestamps
3. **Packet Reordering**: Handle out-of-order packets gracefully
4. **Adaptive Playback Speed**: ±5% speed adjustment to maintain buffer levels
5. **Error Concealment**: Smooth handling of packet loss
6. **Natural Breathing**: Subtle breathing sounds (0.1-0.3s) at pause points
7. **Context-Aware Pauses**: Punctuation-based pause insertion
8. **Stream Synchronization**: Maintain timing across multiple streams

## Implementation Phases

### Phase 1: Foundation - Audio Format Conversion
**File**: `server/services/audio-converter.ts`

**Features**:
- μ-law 8kHz ↔ PCM16 16kHz conversion
- Sample rate conversion (8kHz ↔ 16kHz)
- Format validation and error handling
- Efficient conversion using native Node.js or Web Audio API

### Phase 2: Core API Integration - TrueVoiceStreaming Client
**File**: `server/services/truevoice-client.ts`

**Features**:
- WebSocket connection to `wss://api.loopercreations.org/ws/conversation`
- Connection management with auto-reconnect (exponential backoff)
- Message protocol handling:
  - Text: `{"type": "transcript", "text": "..."}`
  - Text: `{"type": "llm_token", "text": "..."}`
  - Text: `{"type": "llm_done"}`
  - Binary: TTS audio chunks (PCM16, 16kHz)
- Error handling and retry logic
- Connection pooling for bulk calls

### Phase 3: Stability - Adaptive Jitter Buffer
**File**: `server/services/jitter-buffer.ts`

**Features**:
- Dynamic buffer size: 20ms (min) to 500ms (max), target 50-200ms
- Jitter measurement: Calculate inter-arrival time variance
- Automatic buffer size adaptation based on jitter statistics
- Buffer underrun prevention (pause/resume logic)
- Buffer overrun handling (skip/drop excess chunks)
- Statistics tracking (jitter, packet loss, buffer levels)

### Phase 4: Ordering - Audio Sequencer
**File**: `server/services/audio-sequencer.ts`

**Features**:
- 64-bit sequence numbers (monotonically increasing)
- High-precision timestamps (microsecond resolution)
- Out-of-order packet detection and reordering
- Gap detection and interpolation for missing chunks
- Duplicate packet detection and removal
- Chunk metadata: sequence, timestamp, duration, quality flags

### Phase 5: Playback - Stable Playback Controller
**File**: `server/services/playback-controller.ts`

**Features**:
- Adaptive playback speed adjustment (±5% speed variation)
- Clock synchronization between sender and receiver
- Smooth transitions between chunks (crossfade)
- Buffer level monitoring and adjustment
- Playback state management (playing, paused, buffering)
- Packet loss handling: error concealment, interpolation

### Phase 6: Optimization - Chunk Manager
**File**: `server/services/chunk-manager.ts`

**Features**:
- Dynamic chunk sizing: 0.1-1.0 seconds (adjustable)
- Network-aware sizing: smaller chunks (0.1-0.3s) for high latency
- Stable networks: larger chunks (0.5-1.0s) for efficiency
- Real-time chunk size adaptation based on network conditions
- Chunk metadata system with flags (FIRST, LAST, CONTINUATION)

### Phase 7: Naturalness - Breathing and Pause Management
**Files**: 
- `server/services/breathing-generator.ts`
- `server/services/pause-manager.ts`

**Features**:
- **Breathing Sounds**:
  - Detect natural pause points (sentence boundaries, commas)
  - Generate breathing: 0.1-0.3s duration, varying intensity
  - Support types: normal, deep, quick, sigh
  - SSML-like tags: `[breath]`, `[breath type="deep"]`, `[sigh]`
  
- **Natural Pauses**:
  - Sentence boundary: 0.3-0.5s
  - Comma: 0.1-0.2s
  - Period: 0.4-0.6s
  - Question mark: 0.5-0.7s
  - Emphasis: 0.15-0.25s (before important words)
  - Adaptive duration based on speech rate

### Phase 8: Integration - Telephony Service Update
**Files to modify**:
- `server/services/telephony-service.ts`
- `server/routes.ts`

**Features**:
- Replace Python bridge with TrueVoiceStreaming WebSocket
- Bridge Twilio/Zadarma audio streams to TrueVoiceStreaming
- Integrate jitter buffer, sequencer, and playback controller
- Real-time audio streaming with all stability features
- Handle streaming responses (TTS chunks) in real-time

## Technical Specifications

### Audio Pipeline Flow
```
Telephony (μ-law 8kHz) 
  → Audio Converter (PCM16 16kHz)
  → Jitter Buffer
  → Audio Sequencer
  → TrueVoiceStreaming WebSocket
  → [STT → LLM → TTS]
  → Playback Controller
  → Chunk Manager
  → Breathing/Pause Injection
  → Audio Converter (μ-law 8kHz)
  → Telephony
```

### Jitter Buffer Algorithm
- Measure inter-arrival time variance
- Calculate optimal buffer size: `target = base + (jitter * multiplier)`
- Adjust buffer size every 100ms based on statistics
- Minimum buffer: 20ms (low latency mode)
- Maximum buffer: 500ms (high jitter networks)

### Chunk Sequencing Protocol
```typescript
interface AudioChunk {
  sequence: bigint;      // 64-bit monotonic counter
  timestamp: number;     // High-precision timestamp (microseconds)
  duration: number;     // Audio duration in samples
  data: Buffer;          // PCM16 audio data
  flags: {
    first: boolean;
    last: boolean;
    continuation: boolean;
    retransmit: boolean;
  };
  quality: {
    snr: number;
    bitrate: number;
  };
}
```

### Playback Speed Adaptation
- Monitor buffer fill level
- If buffer < 20%: slow down playback by 2-5%
- If buffer > 80%: speed up playback by 2-5%
- Smooth transitions to avoid pitch artifacts
- Maximum adjustment: ±5% speed variation

## Environment Configuration

```env
TRUEVOICE_API_URL=https://api.loopercreations.org
TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
TRUEVOICE_WS_URL=wss://api.loopercreations.org/ws/conversation
JITTER_BUFFER_MIN_MS=20
JITTER_BUFFER_MAX_MS=500
JITTER_BUFFER_TARGET_MS=100
CHUNK_SIZE_MIN_MS=100
CHUNK_SIZE_MAX_MS=1000
CHUNK_SIZE_DEFAULT_MS=500
PLAYBACK_SPEED_ADJUSTMENT_MAX=0.05
```

## Testing Requirements

1. **Unit Tests**:
   - Audio format conversion accuracy
   - Jitter buffer size adaptation
   - Sequence number ordering
   - Chunk reordering logic

2. **Integration Tests**:
   - TrueVoiceStreaming WebSocket connection
   - End-to-end audio pipeline
   - Telephony integration

3. **Performance Tests**:
   - Latency benchmarks (target: <500ms end-to-end)
   - Jitter handling under various network conditions
   - Packet loss recovery
   - Concurrent call handling

4. **Quality Tests**:
   - Audio quality assessment
   - Naturalness evaluation
   - Breathing and pause naturalness

## Success Metrics

- **Latency**: <500ms end-to-end (STT → LLM → TTS → playback)
- **Stability**: Zero audio glitches under normal network conditions
- **Jitter Handling**: Smooth playback with up to 200ms jitter
- **Packet Loss**: Graceful degradation with <5% packet loss
- **Naturalness**: Subjective quality score >4.0/5.0

## Implementation Order

1. Audio Converter (foundation)
2. TrueVoiceStreaming Client (API integration)
3. Jitter Buffer (stability)
4. Audio Sequencer (ordering)
5. Playback Controller (smooth playback)
6. Chunk Manager (optimization)
7. Breathing/Pause Manager (naturalness)
8. Telephony Integration (end-to-end)

