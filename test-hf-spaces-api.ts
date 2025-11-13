#!/usr/bin/env npx tsx
/**
 * Test script for Hugging Face Spaces API
 * Tests all ML service endpoints after deployment
 */

const HF_SPACE_URL = process.env.HF_SPACE_URL || "https://chrisdemonxxx-voiceforge-v1-0.hf.space";
const API_KEY = process.env.API_KEY || "vf_sk_19798aa99815232e6d53e1af34f776e1"; // Default key

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  message: string;
  latency?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const url = `${HF_SPACE_URL}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        ...headers,
      },
    };

    if (body) {
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        name,
        status: "fail",
        message: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
        latency,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      name,
      status: "pass",
      message: `OK (${response.status})`,
      latency,
    };
  } catch (error: any) {
    return {
      name,
      status: "fail",
      message: error.message || "Unknown error",
      latency: Date.now() - startTime,
    };
  }
}

async function runTests() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     VoiceForge - Hugging Face Spaces API Test                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Testing: ${HF_SPACE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log("");

  // Health check
  console.log("1. Health Check...");
  results.push(await testEndpoint("Health Check", "GET", "/api/health"));

  // API Keys
  console.log("2. API Keys...");
  results.push(await testEndpoint("Get API Keys", "GET", "/api/keys"));

  // Voice Library
  console.log("3. Voice Library...");
  results.push(await testEndpoint("Get Voice Library", "GET", "/api/voice-library"));

  // TTS
  console.log("4. Text-to-Speech...");
  results.push(
    await testEndpoint("TTS", "POST", "/api/tts", {
      text: "Hello, this is a test.",
      model: "chatterbox",
      voice: "en-us-sarah-f",
    })
  );

  // STT (mock - would need audio file)
  console.log("5. Speech-to-Text...");
  results.push({
    name: "STT",
    status: "skip",
    message: "Requires audio file upload",
  });

  // VAD
  console.log("6. Voice Activity Detection...");
  results.push({
    name: "VAD",
    status: "skip",
    message: "Requires audio file upload",
  });

  // VLLM
  console.log("7. Voice LLM...");
  results.push(
    await testEndpoint("VLLM Chat", "POST", "/api/vllm/chat", {
      message: "Hello, how are you?",
      session_id: "test-session",
    })
  );

  // Print results
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        TEST RESULTS                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  results.forEach((result) => {
    const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⏭️ ";
    const latency = result.latency ? ` (${result.latency}ms)` : "";
    console.log(`${icon} ${result.name}: ${result.message}${latency}`);
    
    if (result.status === "pass") passed++;
    else if (result.status === "fail") failed++;
    else skipped++;
  });

  console.log("");
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log("");

  if (failed > 0) {
    console.log("❌ Some tests failed. Check the Space logs and configuration.");
    process.exit(1);
  } else {
    console.log("✅ All tests passed! Your HF Space is working correctly.");
  }
}

runTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});

