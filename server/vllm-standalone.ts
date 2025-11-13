/**
 * Standalone VLLM API Service
 * 
 * This service provides a lightweight, standalone VLLM API that can be used
 * independently in other projects without requiring the full VoiceForge API.
 * 
 * Usage:
 *   - Deploy as a separate microservice
 *   - Use in other projects via HTTP API
 *   - Supports both local Python bridge and HF Spaces
 */

import express from "express";
import cors from "cors";
import { mlClient } from "./ml-client.js";

const app = express();
const PORT = process.env.VLLM_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "vllm-standalone",
    timestamp: new Date().toISOString(),
  });
});

// VLLM Chat Endpoint
app.post("/v1/chat", async (req, res) => {
  try {
    const { message, session_id, mode, system_prompt, stream } = req.body;

    if (!message) {
      return res.status(400).json({ 
        error: "Message is required",
        code: "MISSING_MESSAGE"
      });
    }

    // Call ML client for VLLM response
    const response = await mlClient.callVLLM({
      message,
      session_id: session_id || `session_${Date.now()}`,
      mode: mode || "assistant",
      system_prompt,
      stream: stream || false,
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error("[VLLM Standalone] Error:", error);
    
    if (error.message.includes("503") || error.message.includes("Model is loading")) {
      res.status(503).json({ 
        success: false,
        error: "Model is loading. Please try again in a few seconds.",
        code: "MODEL_LOADING",
        retry_after: 10
      });
    } else if (error.message.includes("HF API error") || error.message.includes("HF VLLM")) {
      res.status(503).json({ 
        success: false,
        error: "Hugging Face service temporarily unavailable. Please try again.",
        code: "SERVICE_UNAVAILABLE",
        service: "huggingface"
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: error.message || "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  }
});

// Session Management
app.post("/v1/sessions/:session_id/reset", async (req, res) => {
  try {
    const { session_id } = req.params;
    
    // Note: Session reset would need to be implemented in the ML client
    // For now, just return success
    res.json({
      success: true,
      message: `Session ${session_id} reset`,
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      error: error.message,
    });
  }
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[VLLM Standalone] Server running on port ${PORT}`);
    console.log(`[VLLM Standalone] Health check: http://localhost:${PORT}/health`);
    console.log(`[VLLM Standalone] Chat endpoint: http://localhost:${PORT}/v1/chat`);
  });
}

export default app;

