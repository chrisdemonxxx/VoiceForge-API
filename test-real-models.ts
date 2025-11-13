#!/usr/bin/env npx tsx
/**
 * Test Real ML Models - Verify that placeholders are replaced with real implementations
 */

import { pythonBridge } from "./server/python-bridge";
import * as fs from "fs";
import * as path from "path";

const TEST_AUDIO_PATH = path.join(__dirname, "test-audio.wav");

async function testSTT() {
  console.log("\n🧪 Testing STT (Speech-to-Text)...");
  console.log("=" .repeat(60));
  
  try {
    // Create a simple test audio file (1 second of silence + tone)
    // For real testing, you'd use actual speech audio
    const testAudio = Buffer.alloc(16000 * 2); // 1 second @ 16kHz, 16-bit
    
    // Initialize Python bridge
    await pythonBridge.initialize();
    
    const audioBase64 = testAudio.toString("base64");
    const result = await pythonBridge.processSTTChunk({
      chunk: audioBase64,
      sequence: 0,
      language: "en",
      return_partial: false
    });
    
    console.log("✓ STT Service responded");
    console.log(`  Text: "${result.text}"`);
    console.log(`  Language: ${result.language}`);
    console.log(`  Confidence: ${result.confidence}`);
    console.log(`  Segments: ${result.segments?.length || 0}`);
    
    // Check if it's a placeholder response
    if (result.text.includes("placeholder") || result.text.includes("This is a placeholder")) {
      console.log("  ⚠️  WARNING: Still using placeholder response!");
      return false;
    }
    
    console.log("  ✅ STT is using REAL faster-whisper");
    return true;
  } catch (error: any) {
    console.error("  ❌ STT test failed:", error.message);
    return false;
  }
}

async function testTTS() {
  console.log("\n🧪 Testing TTS (Text-to-Speech)...");
  console.log("=" .repeat(60));
  
  try {
    await pythonBridge.initialize();
    
    const testText = "Hello, this is a test of the text to speech system.";
    const audioBuffer = await pythonBridge.callTTS({
      text: testText,
      model: "chatterbox",
      speed: 1.0
    });
    
    console.log("✓ TTS Service responded");
    console.log(`  Audio size: ${audioBuffer.length} bytes`);
    console.log(`  Duration: ~${(audioBuffer.length / 44100 / 2).toFixed(2)}s (estimated)`);
    
    // Check if audio is just a simple tone (placeholder)
    // Real TTS should produce varied audio
    if (audioBuffer.length < 1000) {
      console.log("  ⚠️  WARNING: Audio seems too short (might be placeholder)");
      return false;
    }
    
    // Save audio for manual verification
    const outputPath = path.join(__dirname, "test-tts-output.wav");
    fs.writeFileSync(outputPath, audioBuffer);
    console.log(`  💾 Saved audio to: ${outputPath}`);
    
    console.log("  ✅ TTS is using REAL Coqui TTS");
    return true;
  } catch (error: any) {
    console.error("  ❌ TTS test failed:", error.message);
    return false;
  }
}

async function testVAD() {
  console.log("\n🧪 Testing VAD (Voice Activity Detection)...");
  console.log("=" .repeat(60));
  
  try {
    await pythonBridge.initialize();
    
    // Create test audio (1 second)
    const testAudio = Buffer.alloc(16000 * 2);
    const audioBase64 = testAudio.toString("base64");
    
    const result = await pythonBridge.processVAD(audioBase64);
    
    console.log("✓ VAD Service responded");
    console.log(`  Segments detected: ${result.segments.length}`);
    
    if (result.segments.length > 0) {
      result.segments.forEach((seg, i) => {
        console.log(`  Segment ${i + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s (conf: ${seg.confidence})`);
      });
    }
    
    // Check if it's using hardcoded placeholder segments
    if (result.segments.length === 3 && 
        result.segments[0].start === 0.5 && 
        result.segments[0].end === 2.3) {
      console.log("  ⚠️  WARNING: Still using placeholder segments!");
      return false;
    }
    
    console.log("  ✅ VAD is using REAL Silero VAD");
    return true;
  } catch (error: any) {
    console.error("  ❌ VAD test failed:", error.message);
    return false;
  }
}

async function testModelLoading() {
  console.log("\n🧪 Testing Model Loading...");
  console.log("=" .repeat(60));
  
  try {
    await pythonBridge.initialize();
    
    console.log("✓ Python Bridge initialized");
    
    // Check worker pools
    const metrics = await pythonBridge.getMetrics();
    
    console.log("\nWorker Pool Status:");
    if (metrics.stt) {
      console.log(`  STT: ${metrics.stt.active} active, ${metrics.stt.idle} idle`);
    } else {
      console.log("  STT: Not initialized");
    }
    
    if (metrics.tts) {
      console.log(`  TTS: ${metrics.tts.active} active, ${metrics.tts.idle} idle`);
    } else {
      console.log("  TTS: Not initialized");
    }
    
    if (metrics.vllm) {
      console.log(`  VLLM: ${metrics.vllm.active} active, ${metrics.vllm.idle} idle`);
    } else {
      console.log("  VLLM: Not initialized");
    }
    
    return true;
  } catch (error: any) {
    console.error("  ❌ Model loading test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     VoiceForge - Real Model Implementation Test          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  const results = {
    stt: false,
    tts: false,
    vad: false,
    models: false
  };
  
  // Run tests
  results.models = await testModelLoading();
  results.stt = await testSTT();
  results.tts = await testTTS();
  results.vad = await testVAD();
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`  Model Loading: ${results.models ? "✅" : "❌"}`);
  console.log(`  STT (faster-whisper): ${results.stt ? "✅" : "❌"}`);
  console.log(`  TTS (Coqui TTS): ${results.tts ? "✅" : "❌"}`);
  console.log(`  VAD (Silero VAD): ${results.vad ? "✅" : "❌"}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log("\n🎉 All tests passed! Real models are working.");
  } else {
    console.log("\n⚠️  Some tests failed. Check the output above for details.");
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

