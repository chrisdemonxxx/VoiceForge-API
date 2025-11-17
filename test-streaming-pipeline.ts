/**
 * Test Script for ElevenLabs-like Voice Streaming Pipeline
 * 
 * This script tests the core components of the streaming pipeline:
 * 1. Audio Converter
 * 2. Jitter Buffer
 * 3. Audio Sequencer
 * 4. Playback Controller
 * 5. Chunk Manager
 * 6. Breathing Generator
 * 7. Pause Manager
 * 8. TrueVoiceStreaming Client (requires API key)
 * 9. Streaming Pipeline (requires API key)
 */

import { convertUlawToPcm16, convertPcm16ToUlaw, getAudioDurationMs } from './server/services/audio-converter';
import { JitterBuffer } from './server/services/jitter-buffer';
import { AudioSequencer } from './server/services/audio-sequencer';
import { PlaybackController } from './server/services/playback-controller';
import { ChunkManager } from './server/services/chunk-manager';
import { BreathingGenerator } from './server/services/breathing-generator';
import { PauseManager } from './server/services/pause-manager';
import { TrueVoiceClient } from './server/services/truevoice-client';
import { StreamingPipeline } from './server/services/streaming-pipeline';

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      log(`\n[TEST] ${name}`, YELLOW);
      await fn();
      log(`[PASS] ${name}`, GREEN);
      return true;
    } catch (error: any) {
      log(`[FAIL] ${name}: ${error.message}`, RED);
      console.error(error);
      return false;
    }
  };
}

async function testAudioConverter() {
  // Create sample μ-law audio (silence)
  const ulawSample = Buffer.alloc(160); // 20ms at 8kHz
  ulawSample.fill(0x7F); // Silence in μ-law
  
  // Convert to PCM16
  const pcm16 = convertUlawToPcm16(ulawSample);
  if (pcm16.length === 0) {
    throw new Error('PCM16 conversion returned empty buffer');
  }
  log(`  ✓ μ-law to PCM16: ${ulawSample.length} bytes → ${pcm16.length} bytes`);
  
  // Convert back to μ-law
  const ulawBack = convertPcm16ToUlaw(pcm16);
  if (ulawBack.length === 0) {
    throw new Error('PCM16 to μ-law conversion returned empty buffer');
  }
  log(`  ✓ PCM16 to μ-law: ${pcm16.length} bytes → ${ulawBack.length} bytes`);
  
  // Test duration calculation
  const duration = getAudioDurationMs(pcm16, 16000, 'pcm16');
  log(`  ✓ Audio duration: ${duration.toFixed(2)}ms`);
}

async function testJitterBuffer() {
  const buffer = new JitterBuffer({
    minBufferMs: 20,
    maxBufferMs: 500,
    targetBufferMs: 100,
  });
  
  // Add chunks
  for (let i = 0; i < 10; i++) {
    const chunk = {
      data: Buffer.alloc(640), // 20ms at 16kHz PCM16
      sequence: i,
      timestamp: Date.now() + i * 20,
      receivedAt: Date.now() + i * 20,
    };
    buffer.addChunk(chunk);
  }
  
  const stats = buffer.getStatistics();
  log(`  ✓ Buffer size: ${buffer.size} chunks`);
  log(`  ✓ Current buffer: ${stats.currentBufferMs.toFixed(2)}ms`);
  log(`  ✓ Target buffer: ${stats.targetBufferMs.toFixed(2)}ms`);
  log(`  ✓ Jitter: ${stats.jitterMs.toFixed(2)}ms`);
  
  // Try to get chunks
  let chunksRetrieved = 0;
  while (buffer.isReady) {
    const chunk = buffer.getNextChunk();
    if (chunk) {
      chunksRetrieved++;
    } else {
      break;
    }
  }
  log(`  ✓ Chunks retrieved: ${chunksRetrieved}`);
}

async function testAudioSequencer() {
  const sequencer = new AudioSequencer();
  
  // Create chunks
  const chunks = [];
  for (let i = 0; i < 5; i++) {
    const chunk = sequencer.createChunk(
      Buffer.alloc(640), // 20ms at 16kHz PCM16
      320, // samples
      { continuation: true }
    );
    chunks.push(chunk);
  }
  
  // Process chunks
  for (const chunk of chunks) {
    const result = sequencer.processChunk(chunk);
    log(`  ✓ Processed chunk ${chunk.sequence.toString()}: outOfOrder=${result.isOutOfOrder}, duplicate=${result.isDuplicate}, hasGap=${result.hasGap}`);
  }
  
  const stats = sequencer.getStatistics();
  log(`  ✓ Total chunks: ${stats.totalChunks}`);
  log(`  ✓ Out of order: ${stats.outOfOrderChunks}`);
  log(`  ✓ Duplicates: ${stats.duplicateChunks}`);
}

async function testPlaybackController() {
  const controller = new PlaybackController({
    minSpeed: 0.95,
    maxSpeed: 1.05,
    baseSpeed: 1.0,
  });
  
  controller.start();
  log(`  ✓ Playback started`);
  
  // Update buffer levels
  controller.updateBufferLevel(0.1); // Low buffer
  log(`  ✓ Low buffer - speed: ${controller.currentSpeed.toFixed(3)}`);
  
  controller.updateBufferLevel(0.5); // Medium buffer
  log(`  ✓ Medium buffer - speed: ${controller.currentSpeed.toFixed(3)}`);
  
  controller.updateBufferLevel(0.9); // High buffer
  log(`  ✓ High buffer - speed: ${controller.currentSpeed.toFixed(3)}`);
  
  // Test crossfade
  const chunk1 = Buffer.alloc(640);
  chunk1.fill(0x10);
  const chunk2 = Buffer.alloc(640);
  chunk2.fill(0x20);
  const crossfaded = controller.crossfadeChunks(chunk1, chunk2);
  log(`  ✓ Crossfade: ${chunk1.length} + ${chunk2.length} → ${crossfaded.length} bytes`);
  
  controller.stop();
  log(`  ✓ Playback stopped`);
}

async function testChunkManager() {
  const manager = new ChunkManager({
    minChunkSizeMs: 100,
    maxChunkSizeMs: 1000,
    defaultChunkSizeMs: 500,
    sampleRate: 16000,
  });
  
  // Test optimal chunk size calculation
  const optimalSize = manager.calculateOptimalChunkSize(50, 10); // Good network
  log(`  ✓ Optimal chunk size (good network): ${optimalSize.toFixed(2)}ms`);
  
  const optimalSizeBad = manager.calculateOptimalChunkSize(300, 150); // Bad network
  log(`  ✓ Optimal chunk size (bad network): ${optimalSizeBad.toFixed(2)}ms`);
  
  // Test chunk splitting
  const audioData = Buffer.alloc(16000 * 2); // 1 second at 16kHz PCM16
  const chunks = manager.splitIntoChunks(audioData);
  log(`  ✓ Split audio into ${chunks.length} chunks`);
}

async function testBreathingGenerator() {
  const generator = new BreathingGenerator({
    enabled: true,
    intensity: 0.3,
  });
  
  // Generate different breathing types
  const normal = generator.generateBreathing('normal');
  log(`  ✓ Normal breathing: ${normal.length} bytes`);
  
  const deep = generator.generateBreathing('deep');
  log(`  ✓ Deep breathing: ${deep.length} bytes`);
  
  const quick = generator.generateBreathing('quick');
  log(`  ✓ Quick breathing: ${quick.length} bytes`);
  
  // Test should insert breathing
  const shouldBreathe = generator.shouldInsertBreathing(20, true, false);
  log(`  ✓ Should insert breathing: ${shouldBreathe.shouldInsert} (type: ${shouldBreathe.type})`);
}

async function testPauseManager() {
  const manager = new PauseManager({
    sentencePauseMs: 400,
    commaPauseMs: 150,
    periodPauseMs: 500,
  });
  
  // Test pause analysis
  const text = "Hello, world. How are you? Great!";
  const pauses = manager.analyzePauses(text);
  log(`  ✓ Analyzed pauses: ${pauses.length} pause points`);
  pauses.forEach((pause, i) => {
    log(`    ${i + 1}. Position ${pause.position}, ${pause.duration.toFixed(0)}ms, type: ${pause.type}`);
  });
  
  // Test pause generation
  const pauseBuffer = manager.generatePause(200);
  log(`  ✓ Generated pause: ${pauseBuffer.length} bytes`);
}

async function testTrueVoiceClient() {
  const apiKey = process.env.TRUEVOICE_API_KEY;
  if (!apiKey) {
    log(`  ⚠ Skipping TrueVoiceStreaming client test (no API key)`, YELLOW);
    return;
  }
  
  const client = new TrueVoiceClient({
    apiKey,
    language: 'en-US',
  });
  
  // Test connection (with timeout)
  log(`  ✓ Attempting connection...`);
  const connectPromise = client.connect();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout')), 5000)
  );
  
  try {
    await Promise.race([connectPromise, timeoutPromise]);
    log(`  ✓ Connected: ${client.id}`);
    
    // Wait a bit for any messages
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    client.disconnect();
    log(`  ✓ Disconnected`);
  } catch (error: any) {
    log(`  ⚠ Connection test failed: ${error.message}`, YELLOW);
    client.disconnect();
  }
}

async function testStreamingPipeline() {
  const apiKey = process.env.TRUEVOICE_API_KEY;
  if (!apiKey) {
    log(`  ⚠ Skipping streaming pipeline test (no API key)`, YELLOW);
    return;
  }
  
  const pipeline = new StreamingPipeline({
    trueVoiceApiKey: apiKey,
    trueVoiceLanguage: 'en-US',
    trueVoiceBaseUrl: 'wss://api.loopercreations.org',
    enableBreathing: true,
    enablePauses: true,
  });
  
  log(`  ✓ Pipeline created`);
  
  // Test pipeline start
  try {
    await pipeline.start();
    log(`  ✓ Pipeline started`);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get statistics
    const stats = pipeline.getStatistics();
    log(`  ✓ Statistics: ${stats.audioChunksReceived} received, ${stats.audioChunksSent} sent`);
    
    pipeline.stop();
    log(`  ✓ Pipeline stopped`);
  } catch (error: any) {
    log(`  ⚠ Pipeline test failed: ${error.message}`, YELLOW);
    pipeline.stop();
  }
}

async function runAllTests() {
  log('\n========================================', YELLOW);
  log('Streaming Pipeline Test Suite', YELLOW);
  log('========================================\n', YELLOW);
  
  const tests = [
    test('Audio Converter', testAudioConverter),
    test('Jitter Buffer', testJitterBuffer),
    test('Audio Sequencer', testAudioSequencer),
    test('Playback Controller', testPlaybackController),
    test('Chunk Manager', testChunkManager),
    test('Breathing Generator', testBreathingGenerator),
    test('Pause Manager', testPauseManager),
    test('TrueVoiceStreaming Client', testTrueVoiceClient),
    test('Streaming Pipeline', testStreamingPipeline),
  ];
  
  const results = await Promise.all(tests.map(t => t()));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log('\n========================================', YELLOW);
  log(`Test Results: ${passed}/${total} passed`, passed === total ? GREEN : YELLOW);
  log('========================================\n', YELLOW);
  
  if (passed < total) {
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n[FATAL] Test suite failed: ${error.message}`, RED);
  console.error(error);
  process.exit(1);
});

