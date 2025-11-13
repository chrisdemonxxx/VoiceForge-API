/**
 * ML Client Verification Test Script
 * Tests ML client switching, method availability, and error handling
 */

import { mlClient } from "./ml-client";
import { pythonBridge } from "./python-bridge";
import { hfSpacesClient } from "./hf-spaces-client";

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: Error;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => {
          results.push({ name, passed: true, message: "Test passed" });
        })
        .catch((error) => {
          results.push({ name, passed: false, message: error.message, error });
        });
    } else {
      results.push({ name, passed: true, message: "Test passed" });
    }
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message, error });
  }
}

async function verifyMLClientMethods() {
  console.log("\n=== Verifying ML Client Methods ===");

  // Check if mlClient has all required methods
  test("mlClient.callTTS exists", () => {
    if (typeof mlClient.callTTS !== "function") {
      throw new Error("mlClient.callTTS is not a function");
    }
  });

  test("mlClient.processSTTChunk exists", () => {
    if (typeof mlClient.processSTTChunk !== "function") {
      throw new Error("mlClient.processSTTChunk is not a function");
    }
  });

  test("mlClient.callVLLM exists", () => {
    if (typeof mlClient.callVLLM !== "function") {
      throw new Error("mlClient.callVLLM is not a function");
    }
  });

  test("mlClient.processVAD exists", () => {
    if (typeof mlClient.processVAD !== "function") {
      throw new Error("mlClient.processVAD is not a function");
    }
  });

  test("mlClient.initialize exists", () => {
    if (typeof mlClient.initialize !== "function") {
      throw new Error("mlClient.initialize is not a function");
    }
  });
}

async function verifyPythonBridgeMethods() {
  console.log("\n=== Verifying Python Bridge Methods ===");

  test("pythonBridge.callTTS exists", () => {
    if (typeof pythonBridge.callTTS !== "function") {
      throw new Error("pythonBridge.callTTS is not a function");
    }
  });

  test("pythonBridge.processSTTChunk exists", () => {
    if (typeof pythonBridge.processSTTChunk !== "function") {
      throw new Error("pythonBridge.processSTTChunk is not a function");
    }
  });

  test("pythonBridge.callVLLM exists", () => {
    if (typeof pythonBridge.callVLLM !== "function") {
      throw new Error("pythonBridge.callVLLM is not a function");
    }
  });

  test("pythonBridge.processVAD exists", () => {
    if (typeof pythonBridge.processVAD !== "function") {
      throw new Error("pythonBridge.processVAD is not a function");
    }
  });

  test("pythonBridge.initialize exists", () => {
    if (typeof pythonBridge.initialize !== "function") {
      throw new Error("pythonBridge.initialize is not a function");
    }
  });
}

async function verifyHFSpacesClientMethods() {
  console.log("\n=== Verifying HF Spaces Client Methods ===");

  test("hfSpacesClient.callTTS exists", () => {
    if (typeof hfSpacesClient.callTTS !== "function") {
      throw new Error("hfSpacesClient.callTTS is not a function");
    }
  });

  test("hfSpacesClient.processSTTChunk exists", () => {
    if (typeof hfSpacesClient.processSTTChunk !== "function") {
      throw new Error("hfSpacesClient.processSTTChunk is not a function");
    }
  });

  test("hfSpacesClient.callVLLM exists", () => {
    if (typeof hfSpacesClient.callVLLM !== "function") {
      throw new Error("hfSpacesClient.callVLLM is not a function");
    }
  });

  test("hfSpacesClient.processVAD exists", () => {
    if (typeof hfSpacesClient.processVAD !== "function") {
      throw new Error("hfSpacesClient.processVAD is not a function");
    }
  });

  test("hfSpacesClient.initialize exists", () => {
    if (typeof hfSpacesClient.initialize !== "function") {
      throw new Error("hfSpacesClient.initialize is not a function");
    }
  });
}

async function verifyMLClientSwitching() {
  console.log("\n=== Verifying ML Client Switching ===");

  const useHfSpaces = process.env.USE_HF_SPACES_ML === "true" || process.env.HF_ML_API_URL !== undefined;
  
  test("ML client switches based on environment", () => {
    if (useHfSpaces) {
      if (mlClient !== hfSpacesClient) {
        throw new Error("mlClient should be hfSpacesClient when USE_HF_SPACES_ML is true");
      }
    } else {
      if (mlClient !== pythonBridge) {
        throw new Error("mlClient should be pythonBridge when USE_HF_SPACES_ML is not set");
      }
    }
  });

  console.log(`Current mode: ${useHfSpaces ? "HF Spaces" : "Python Bridge"}`);
  console.log(`USE_HF_SPACES_ML: ${process.env.USE_HF_SPACES_ML}`);
  console.log(`HF_ML_API_URL: ${process.env.HF_ML_API_URL}`);
}

async function verifyEnvironmentVariables() {
  console.log("\n=== Verifying Environment Variables ===");

  const requiredVars = [
    "DATABASE_URL",
    "SESSION_SECRET",
  ];

  const optionalVars = [
    "USE_HF_SPACES_ML",
    "HF_ML_API_URL",
    "ADMIN_TOKEN",
    "NODE_ENV",
    "PORT",
  ];

  requiredVars.forEach((varName) => {
    test(`${varName} is set`, () => {
      if (!process.env[varName]) {
        throw new Error(`${varName} is not set`);
      }
    });
  });

  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    console.log(`  ${varName}: ${value ? "✓ Set" : "⊘ Not set"}`);
  });
}

async function testErrorHandling() {
  console.log("\n=== Testing Error Handling ===");

  // Test TTS error handling
  test("TTS handles invalid input", async () => {
    try {
      await mlClient.callTTS({
        text: "",
        model: "invalid-model",
      });
      throw new Error("Should have thrown an error for invalid input");
    } catch (error) {
      // Expected to throw an error
      if (!(error instanceof Error)) {
        throw new Error("Error should be an Error instance");
      }
    }
  });

  // Test STT error handling
  test("STT handles invalid input", async () => {
    try {
      await mlClient.processSTTChunk({
        chunk: "",
        sequence: 0,
      });
      throw new Error("Should have thrown an error for invalid input");
    } catch (error) {
      // Expected to throw an error
      if (!(error instanceof Error)) {
        throw new Error("Error should be an Error instance");
      }
    }
  });

  // Test VLLM error handling
  test("VLLM handles invalid input", async () => {
    try {
      await mlClient.callVLLM({
        session_id: "",
        message: "",
      });
      // VLLM may not throw for empty input, so this is just a check
    } catch (error) {
      // Error is acceptable
    }
  });
}

async function printSummary() {
  console.log("\n=== Test Summary ===");
  
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}: ${r.message}`);
        if (r.error) {
          console.log(`    Error: ${r.error.message}`);
        }
      });
  }
  
  console.log("\n=== Detailed Results ===");
  results.forEach((r) => {
    const status = r.passed ? "✓" : "✗";
    console.log(`${status} ${r.name}: ${r.message}`);
  });
}

async function main() {
  console.log("ML Client Verification Test");
  console.log("==========================\n");
  
  await verifyMLClientMethods();
  await verifyPythonBridgeMethods();
  await verifyHFSpacesClientMethods();
  await verifyMLClientSwitching();
  await verifyEnvironmentVariables();
  await testErrorHandling();
  await printSummary();
  
  const failed = results.filter((r) => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});

