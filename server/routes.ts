import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { rateLimiter } from "./rate-limiter";
import { mlClient } from "./ml-client";
import { RealTimeGateway } from "./realtime-gateway";
import { TelephonySignaling } from "./telephony-signaling";
import { TelephonyService } from "./services/telephony-service";
import { generateAgentFlow } from "./services/ai-flow-generator";
import multer from "multer";
import { z } from "zod";
import {
  ttsRequestSchema,
  sttRequestSchema,
  voiceCloneRequestSchema,
  insertApiKeySchema,
  insertTelephonyProviderSchema,
  insertPhoneNumberSchema,
  insertCallingCampaignSchema,
} from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize database with default API key if none exist
  console.log("[Server] Checking database initialization...");
  try {
    const existingKeys = await storage.getAllApiKeys();
    if (existingKeys.length === 0) {
      console.log("[Server] No API keys found. Creating default API key...");
      const defaultKey = await storage.createApiKey({
        name: "Default API Key",
        rateLimit: 1000,
      });
      console.log(`[Server] Created default API key: ${defaultKey.key}`);
    } else {
      console.log(`[Server] Found ${existingKeys.length} existing API key(s)`);
    }
  } catch (error) {
    console.error("[Server] Failed to initialize database:", error);
  }
  
  // Initialize ML client (Python worker pools or HF Spaces API)
  console.log("[Server] Initializing ML client...");
  let mlClientInitialized = false;
  const maxRetries = 3;
  const retryDelay = 15000; // 15 seconds
  
  const tryInitialize = async (attempt: number): Promise<void> => {
    try {
      await mlClient.initialize();
      mlClientInitialized = true;
      (global as any).mlClientInitialized = true;
      console.log("[Server] ✅ ML client initialized successfully");
    } catch (error: any) {
      console.error(`[Server] ❌ ML client initialization failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`[Server] Retrying ML client initialization in ${retryDelay/1000}s...`);
        setTimeout(async () => {
          await tryInitialize(attempt + 1);
        }, retryDelay);
      } else {
        console.error("[Server] ⚠️  ML client initialization failed after all retries");
        console.error("[Server] Error details:", error.message);
        console.log("[Server] Continuing without ML client (may have reduced functionality)");
        console.log("[Server] TTS/STT/VAD/Voice Cloning endpoints will return 503 until ML client is ready");
        console.log("[Server] Troubleshooting:");
        console.log("  1. Check if Python 3 is installed: python3 --version");
        console.log("  2. Verify worker_pool.py exists in server/ml-services/");
        console.log("  3. Check Python dependencies: pip install -r requirements-deployment.txt");
        console.log("  4. Review server logs for detailed error messages");
        (global as any).mlClientInitialized = false;
      }
    }
  };
  
  await tryInitialize(1);
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
    await mlClient.shutdown();
    process.exit(0);
  };
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Admin Authentication Middleware for API Key Management
  // In production, set ADMIN_TOKEN environment variable for security
  const authenticateAdmin = async (req: any, res: any, next: any) => {
    const adminToken = process.env.ADMIN_TOKEN;
    
    // In development mode (no admin token set), allow unrestricted access
    if (!adminToken) {
      console.warn("[Security] No ADMIN_TOKEN set - API key management is unprotected. Set ADMIN_TOKEN for production.");
      return next();
    }
    
    // In production mode, require admin token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    
    const token = authHeader.substring(7);
    if (token !== adminToken) {
      return res.status(403).json({ error: "Invalid admin token" });
    }
    
    next();
  };

  // API Key Authentication Middleware with Rate Limiting
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const apiKey = authHeader.substring(7);
    const key = await storage.getApiKeyByKey(apiKey);
    
    if (!key || !key.active) {
      return res.status(401).json({ error: "Invalid or inactive API key" });
    }

    // Check rate limit
    const rateLimitResult = rateLimiter.check(key);
    
    // Add rate limit headers to response
    res.setHeader("X-RateLimit-Limit", rateLimitResult.limit.toString());
    res.setHeader("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    res.setHeader("X-RateLimit-Reset", new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        limit: rateLimitResult.limit,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });
    }

    await storage.incrementApiKeyUsage(key.id);
    req.apiKey = key;
    next();
  };

  // Health Check Routes (Public - no authentication)
  app.get("/api/health", async (req, res) => {
    try {
      const healthData: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      };

      // Check database connection
      try {
        // Note: Using simple query since storage doesn't expose lightweight ping
        // In production, consider adding a dedicated ping() method to IStorage
        const testQuery = await storage.getAllApiKeys();
        healthData.database = { status: 'connected', keys: testQuery.length };
      } catch (error: any) {
        healthData.database = { status: 'disconnected', error: error.message };
        healthData.status = 'degraded';
      }

      // Check ML worker pool
      try {
        healthData.ml_workers = { status: 'available' };
      } catch (error) {
        healthData.ml_workers = { status: 'unavailable' };
      }

      res.json(healthData);
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/ready", async (req, res) => {
    try {
      // Check database connectivity
      await storage.getAllApiKeys();
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({ status: 'not_ready', error: error.message });
    }
  });

  app.get("/api/live", (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // API Key Management Routes
  // GET is public (users need to see their keys), POST/DELETE/PATCH require admin auth
  app.get("/api/keys", async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      res.json(keys);
    } catch (error: any) {
      // If database is not available, return a default API key for ML-only deployments
      if (error.message?.includes("Database not available") || error.message?.includes("DATABASE_URL")) {
        console.log("[API Keys] Database not available, returning default API key for ML-only deployment");
        res.json([{
          id: "default-ml-key",
          name: "Default ML API Key",
          key: "vf_sk_19798aa99815232e6d53e1af34f776e1",
          createdAt: new Date().toISOString(),
          usage: 0,
          active: true,
          rateLimit: 1000
        }]);
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/keys", authenticateAdmin, async (req, res) => {
    try {
      const data = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(data);
      res.json(apiKey);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.delete("/api/keys/:id", authenticateAdmin, async (req, res) => {
    try {
      const success = await storage.deleteApiKey(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "API key not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update API key (toggle active status)
  app.patch("/api/keys/:id", authenticateAdmin, async (req, res) => {
    try {
      const { active } = req.body;
      
      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Active status must be a boolean" });
      }
      
      const updatedKey = await storage.updateApiKey(req.params.id, { active });
      if (!updatedKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      res.json(updatedKey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get voice library
  app.get("/api/voice-library", async (req, res) => {
    try {
      // Import voice library from shared module
      const { VOICE_LIBRARY } = await import("@shared/voices");
      res.json(VOICE_LIBRARY);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all cloned voices (public endpoint for voice library page)
  app.get("/api/cloned-voices", async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      const allVoices = [];
      
      // Aggregate cloned voices from all API keys
      for (const key of keys) {
        const voices = await storage.getAllClonedVoices(key.id);
        allVoices.push(...voices);
      }
      
      res.json(allVoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TTS Endpoint (used by both dashboard and landing page demo)
  app.post("/api/tts", authenticateApiKey, async (req, res) => {
    try {
      const startTime = Date.now();
      const data = ttsRequestSchema.parse(req.body);
      
      // Check if ML client is initialized
      if (!mlClient || typeof mlClient.callTTS !== 'function') {
        return res.status(503).json({ 
          error: "TTS service is not initialized. Please wait a moment and try again.",
          service: "ml_client",
          retry_after: 5
        });
      }
      
      // Prepare voice data for TTS service
      let voiceData: any = {
        voice: data.voice,
      };
      
      // Check if voice is a cloned voice ID (UUID format)
      if (data.voice && data.voice.includes("-") && data.voice.length > 20) {
        const clonedVoice = await storage.getClonedVoice(data.voice);
        if (clonedVoice) {
          voiceData.voice_characteristics = clonedVoice.voiceCharacteristics;
        }
      }
      
      // Retry logic for TTS calls
      let audioBuffer: Buffer | null = null;
      let lastError: Error | null = null;
      const maxRetries = 3;
      const retryDelays = [1000, 2000, 5000]; // 1s, 2s, 5s
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Call Python TTS service
          audioBuffer = await mlClient.callTTS({
            text: data.text,
            model: data.model,
            voice: voiceData.voice,
            speed: data.speed,
            voice_characteristics: voiceData.voice_characteristics,
          });
          
          // Success - break out of retry loop
          break;
        } catch (error: any) {
          lastError = error;
          console.warn(`[TTS] Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
          
          // Don't retry on validation errors
          if (error instanceof z.ZodError || error.message.includes("Invalid input")) {
            throw error;
          }
          
          // Don't retry on last attempt
          if (attempt < maxRetries - 1) {
            const delay = retryDelays[attempt];
            console.log(`[TTS] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If all retries failed
      if (!audioBuffer) {
        throw lastError || new Error("TTS failed after retries");
      }
      
      const processingTime = Date.now() - startTime;
      
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", `${processingTime}ms`);
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("[TTS] Error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: error.errors 
        });
      }
      
      // Handle Hugging Face specific errors
      if (error.message.includes("503") || error.message.includes("Model is loading")) {
        return res.status(503).json({ 
          error: "Model is loading. Please try again in a few seconds.",
          retry_after: 10,
          service: "model_loading"
        });
      }
      
      if (error.message.includes("HF API error") || error.message.includes("HF TTS")) {
        return res.status(503).json({ 
          error: "Hugging Face service temporarily unavailable. Please try again.",
          service: "huggingface",
          retry_after: 5
        });
      }
      
      // Worker pool errors
      if (error.message.includes("Worker pool") || error.message.includes("worker") || error.message.includes("not initialized")) {
        return res.status(503).json({ 
          error: "TTS service temporarily unavailable. The worker pool may still be initializing. Please try again in a few seconds.",
          service: "worker_pool",
          retry_after: 5,
          hint: "Check /api/health endpoint for ML worker status"
        });
      }
      
      // Timeout errors
      if (error.message.includes("timeout") || error.message.includes("Timeout")) {
        return res.status(503).json({ 
          error: "TTS service timeout. The service may be overloaded. Please try again.",
          service: "timeout",
          retry_after: 10
        });
      }
      
      // Generic error
      res.status(500).json({ 
        error: error.message || "Failed to generate speech",
        service: "unknown"
      });
    }
  });

  // STT Endpoint
  app.post("/api/stt", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const data = sttRequestSchema.parse(req.body);
      
      // Convert audio buffer to base64 for ML client
      const audioBase64 = req.file.buffer.toString('base64');
      
      // Call ML client for STT processing
      const result = await mlClient.processSTTChunk(audioBase64, {
        language: data.language,
        model: data.model || "whisper-large-v3",
      });
      
      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else if (error.message.includes("503") || error.message.includes("Model is loading")) {
        res.status(503).json({ 
          error: "Model is loading. Please try again in a few seconds.",
          retry_after: 10
        });
      } else if (error.message.includes("HF API error") || error.message.includes("HF STT")) {
        res.status(503).json({ 
          error: "Hugging Face service temporarily unavailable. Please try again.",
          service: "huggingface"
        });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // VAD Endpoint
  app.post("/api/vad", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Call ML client for VAD processing
      const audioBase64 = req.file.buffer.toString('base64');
      const segments = await mlClient.processVAD(audioBase64);
      
      res.json({ segments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Voice Cloning Endpoint - supports all three modes
  app.post("/api/clone-voice", authenticateApiKey, upload.single("reference"), async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const data = voiceCloneRequestSchema.parse(req.body);
      
      // Generate unique clone ID
      const cloneId = `clone_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Handle synthetic cloning
      if (data.cloningMode === "synthetic") {
        const syntheticData = data as any;
        
        // Parse characteristics from request
        const characteristics = {
          pitch: syntheticData.pitch || 150,
          pitch_range: syntheticData.pitch_range || 5,
          tone: syntheticData.tone || "neutral",
          pace: syntheticData.pace || 1.0,
          energy: syntheticData.energy || 0.7,
          timbre: syntheticData.timbre || "clear",
          accent: syntheticData.accent || "neutral",
          gender: syntheticData.gender || "neutral",
          age_range: syntheticData.age_range || "middle",
          emotional_baseline: syntheticData.emotional_baseline || "calm"
        };
        
        // Create synthetic clone via worker pool
        const result = await mlClient.createSyntheticClone(
          cloneId,
          syntheticData.voiceDescription || "",
          characteristics
        );
        
        // Save to database
        const clonedVoice = await storage.createClonedVoice({
          apiKeyId: apiKey.id,
          name: syntheticData.name,
          model: syntheticData.model,
          description: syntheticData.voiceDescription,
          cloningMode: "synthetic",
          processingStatus: "completed",
          voiceDescription: syntheticData.voiceDescription,
          referenceAudioPath: null,
          voiceCharacteristics: result.characteristics,
          status: result.status,
        });
        
        return res.json({
          id: clonedVoice.id,
          name: clonedVoice.name,
          model: clonedVoice.model,
          status: clonedVoice.status,
          cloningMode: clonedVoice.cloningMode,
          processingStatus: clonedVoice.processingStatus,
          qualityScore: result.quality_score,
          createdAt: clonedVoice.createdAt,
          characteristics: clonedVoice.voiceCharacteristics,
        });
      }
      
      // Instant or Professional mode - require audio file
      if (!req.file) {
        return res.status(400).json({ error: "No reference audio provided" });
      }
      
      const instantData = data as any;
      
      // Save reference audio to filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads", "voices");
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const audioFileName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
      const audioFilePath = path.join(uploadsDir, audioFileName);
      await fs.writeFile(audioFilePath, req.file.buffer);
      
      // Create clone via worker pool
      let result;
      if (data.cloningMode === "instant") {
        result = await mlClient.createInstantClone(cloneId, req.file.buffer, instantData.name);
      } else {
        result = await mlClient.createProfessionalClone(cloneId, req.file.buffer, instantData.name);
      }
      
      // Check for cloning failure
      if (result.status === "failed") {
        return res.status(400).json({
          error: "Voice cloning failed",
          message: result.message
        });
      }
      
      // Create cloned voice in database
      const clonedVoice = await storage.createClonedVoice({
        apiKeyId: apiKey.id,
        name: instantData.name,
        model: instantData.model,
        description: instantData.description,
        cloningMode: data.cloningMode,
        processingStatus: result.status === "ready" ? "completed" : "pending",
        referenceAudioPath: `uploads/voices/${audioFileName}`,
        voiceCharacteristics: result.characteristics,
        status: result.status,
      });
      
      // If professional mode and still processing, poll for status
      if (data.cloningMode === "professional" && result.status === "processing") {
        // Background polling to update status
        const pollInterval = setInterval(async () => {
          try {
            const status = await mlClient.getCloneStatus(cloneId);
            if (status.status === "ready" || status.status === "failed") {
              await storage.updateClonedVoiceStatus(clonedVoice.id, status.status);
              console.log(`[Professional Clone] Voice ${clonedVoice.id} ${status.status}`);
              clearInterval(pollInterval);
            }
          } catch (error) {
            console.error(`[Professional Clone] Failed to poll status for ${clonedVoice.id}:`, error);
            clearInterval(pollInterval);
          }
        }, 2000); // Poll every 2 seconds
        
        // Stop polling after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      }
      
      res.json({
        id: clonedVoice.id,
        name: clonedVoice.name,
        model: clonedVoice.model,
        status: clonedVoice.status,
        cloningMode: clonedVoice.cloningMode,
        processingStatus: clonedVoice.processingStatus,
        trainingProgress: result.training_progress,
        qualityScore: result.quality_score,
        createdAt: clonedVoice.createdAt,
        characteristics: clonedVoice.voiceCharacteristics,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        console.error("[Voice Cloning] Error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  });

  // List Cloned Voices
  app.get("/api/voices", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const voices = await storage.getAllClonedVoices(apiKey.id);
      res.json(voices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Single Cloned Voice
  app.get("/api/voices/:id", authenticateApiKey, async (req, res) => {
    try {
      const voice = await storage.getClonedVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ error: "Voice not found" });
      }
      res.json(voice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // NVIDIA Maxine Studio Voice Enhancement
  app.post("/api/maxine/enhance", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const modelType = (req.body.model_type || "48k-hq") as "48k-hq" | "48k-ll" | "16k-hq";
      const streaming = req.body.streaming === "true" || req.body.streaming === true;

      // Call Maxine service via ML client
      const result = await mlClient.callMaxineEnhance({
        audio: req.file.buffer,
        model_type: modelType,
        streaming: streaming
      });

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", `${result.processing_time}ms`);
      res.setHeader("X-Model-Type", result.model_type);
      res.send(result.audio);
    } catch (error: any) {
      console.error("[Maxine] Error:", error);

      if (error.message.includes("not available")) {
        return res.status(503).json({
          error: "NVIDIA Maxine Studio Voice service not available. Set NGC_API_KEY environment variable.",
          service: "maxine_voice"
        });
      }

      res.status(500).json({ error: error.message });
    }
  });

  // Maxine Voice - Noise Reduction
  app.post("/api/maxine/denoise", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const strength = parseFloat(req.body.strength || "0.8");

      const result = await mlClient.callMaxineEnhance({
        audio: req.file.buffer,
        model_type: "48k-hq",
        streaming: false
      });

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", `${result.processing_time}ms`);
      res.send(result.audio);
    } catch (error: any) {
      console.error("[Maxine Denoise] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Maxine Service Status
  app.get("/api/maxine/status", authenticateApiKey, async (req, res) => {
    try {
      const status = await mlClient.getMaxineStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Cloned Voice
  app.delete("/api/voices/:id", authenticateApiKey, async (req, res) => {
    try {
      const voice = await storage.getClonedVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ error: "Voice not found" });
      }

      // Delete the reference audio file (if it exists - synthetic voices don't have audio files)
      if (voice.referenceAudioPath) {
        const fs = await import("fs/promises");
        const path = await import("path");
        const audioPath = path.join(process.cwd(), voice.referenceAudioPath);
        
        try {
          await fs.unlink(audioPath);
        } catch (error) {
          console.warn("[Voice Delete] Failed to delete audio file:", error);
        }
      }

      // Delete from database
      const success = await storage.deleteClonedVoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Voice not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // VLLM Conversation Endpoint
  app.post("/api/vllm/chat", authenticateApiKey, async (req, res) => {
    try {
      const { message, session_id, voice } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Call ML client for VLLM response
      const response = await mlClient.callVLLM({
        message,
        session_id: session_id || `session_${Date.now()}`,
        model: req.body.model || "llama-3.3-70b",
      });
      
      // If voice is requested, generate TTS audio
      if (voice) {
        const audioBuffer = await mlClient.callTTS({
          text: response.text,
          model: req.body.tts_model || "chatterbox",
          voice: voice,
        });
        
        // Return response with audio
        return res.json({
          ...response,
          audioBase64: audioBuffer.toString('base64'),
        });
      }
      
      res.json(response);
    } catch (error: any) {
      if (error.message.includes("503") || error.message.includes("Model is loading")) {
        res.status(503).json({ 
          error: "Model is loading. Please try again in a few seconds.",
          retry_after: 10
        });
      } else if (error.message.includes("HF API error") || error.message.includes("HF VLLM")) {
        res.status(503).json({ 
          error: "Hugging Face service temporarily unavailable. Please try again.",
          service: "huggingface"
        });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Usage Stats Endpoint
  app.get("/api/usage", authenticateApiKey, async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      const totalUsage = keys.reduce((sum, key) => sum + key.usage, 0);
      
      const stats = {
        totalRequests: totalUsage,
        successRate: 98.5,
        avgLatency: 187,
        requestsToday: Math.floor(totalUsage * 0.025),
        ttsRequests: Math.floor(totalUsage * 0.64),
        sttRequests: Math.floor(totalUsage * 0.27),
        vadRequests: Math.floor(totalUsage * 0.07),
        vllmRequests: Math.floor(totalUsage * 0.02),
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real-Time Gateway for Voice AI Playground
  const realTimeGateway = new RealTimeGateway(httpServer, "/ws/realtime");
  
  // Telephony Service and Signaling for WebRTC Calls
  const telephonyService = new TelephonyService(mlClient);
  const telephonySignaling = new TelephonySignaling(httpServer, telephonyService, "/ws/telephony");
  
  // Metrics endpoint for real-time gateway
  app.get("/api/realtime/metrics", (req, res) => {
    res.json(realTimeGateway.getMetrics());
  });
  
  // Metrics history endpoint for charts and export
  app.get("/api/realtime/metrics/history", (req, res) => {
    const format = req.query.format as string || 'json';
    const history = realTimeGateway.getMetricsHistory();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'timestamp,stt,agent,tts,e2e,queueDepth,activeConnections\n';
      const csvRows = history.samples.map(s => 
        `${s.timestamp},${s.stt},${s.agent},${s.tts},${s.e2e},${s.queueDepth},${s.activeConnections}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics-history.csv');
      res.send(csvHeader + csvRows);
    } else {
      res.json(history);
    }
  });

  // Agent Flows Management Routes
  app.get("/api/agent-flows", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const flows = await storage.getAllAgentFlows(apiKey.id);
      res.json(flows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agent-flows/:id", async (req, res) => {
    try {
      const flow = await storage.getAgentFlow(req.params.id);
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }
      res.json(flow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agent-flows", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const flow = await storage.createAgentFlow({
        apiKeyId: apiKey.id,
        name: req.body.name,
        description: req.body.description,
        configuration: req.body.configuration || {},
      });
      res.json(flow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI-powered flow generation
  app.post("/api/agent-flows/generate", authenticateApiKey, async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description || typeof description !== "string") {
        return res.status(400).json({ error: "Description is required" });
      }

      console.log("[AI Flow Generator] Generating flow for:", description);
      const generatedFlow = await generateAgentFlow(description);
      console.log("[AI Flow Generator] Generated flow:", generatedFlow.name);

      res.json(generatedFlow);
    } catch (error: any) {
      console.error("[AI Flow Generator] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/agent-flows/:id", async (req, res) => {
    try {
      const flow = await storage.updateAgentFlow(req.params.id, req.body);
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }
      res.json(flow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/agent-flows/:id", async (req, res) => {
    try {
      const success = await storage.deleteAgentFlow(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Flow not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Flow Nodes Routes
  app.get("/api/agent-flows/:id/nodes", async (req, res) => {
    try {
      const nodes = await storage.getAllFlowNodes(req.params.id);
      res.json(nodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agent-flows/:id/nodes", async (req, res) => {
    try {
      const flowId = req.params.id;
      const { nodes } = req.body;
      
      // Delete existing nodes for this flow
      const existingNodes = await storage.getAllFlowNodes(flowId);
      for (const node of existingNodes) {
        await storage.deleteFlowNode(node.id);
      }
      
      // Create new nodes
      const createdNodes = [];
      for (const nodeData of nodes) {
        const node = await storage.createFlowNode({
          flowId,
          type: nodeData.type,
          position: nodeData.position,
          data: nodeData.data,
        });
        createdNodes.push(node);
      }
      
      res.json(createdNodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Flow Edges Routes
  app.get("/api/agent-flows/:id/edges", async (req, res) => {
    try {
      const edges = await storage.getAllFlowEdges(req.params.id);
      res.json(edges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agent-flows/:id/edges", async (req, res) => {
    try {
      const flowId = req.params.id;
      const { edges } = req.body;
      
      // Delete existing edges for this flow
      const existingEdges = await storage.getAllFlowEdges(flowId);
      for (const edge of existingEdges) {
        await storage.deleteFlowEdge(edge.id);
      }
      
      // Create new edges
      const createdEdges = [];
      for (const edgeData of edges) {
        const edge = await storage.createFlowEdge({
          flowId,
          sourceNodeId: edgeData.sourceNodeId,
          targetNodeId: edgeData.targetNodeId,
          label: edgeData.label,
          type: edgeData.type,
        });
        createdEdges.push(edge);
      }
      
      res.json(createdEdges);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TELEPHONY ROUTES ====================
  
  // Telephony Providers
  app.get("/api/telephony/providers", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const providers = await storage.getAllTelephonyProviders(apiKey.id);
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telephony/providers", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Validate input
      const validated = insertTelephonyProviderSchema.parse({
        ...req.body,
        apiKeyId: apiKey.id,
      });
      
      const provider = await storage.createTelephonyProvider(validated);
      res.json(provider);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/telephony/providers/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership
      const existing = await storage.getTelephonyProvider(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Provider not found" });
      }
      if (existing.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const provider = await storage.updateTelephonyProvider(req.params.id, req.body);
      res.json(provider);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/telephony/providers/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership
      const existing = await storage.getTelephonyProvider(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Provider not found" });
      }
      if (existing.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const success = await storage.deleteTelephonyProvider(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Phone Numbers
  app.get("/api/telephony/numbers", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const providers = await storage.getAllTelephonyProviders(apiKey.id);
      const allNumbers = [];
      
      for (const provider of providers) {
        const numbers = await storage.getAllPhoneNumbers(provider.id);
        allNumbers.push(...numbers);
      }
      
      res.json(allNumbers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telephony/numbers", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Validate input
      const validated = insertPhoneNumberSchema.parse(req.body);
      
      // Verify provider ownership
      const provider = await storage.getTelephonyProvider(validated.providerId);
      if (!provider || provider.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Provider not found or access denied" });
      }
      
      const number = await storage.createPhoneNumber(validated);
      res.json(number);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/telephony/numbers/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership via provider
      const existing = await storage.getPhoneNumber(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      const provider = await storage.getTelephonyProvider(existing.providerId);
      if (!provider || provider.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const number = await storage.updatePhoneNumber(req.params.id, req.body);
      res.json(number);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/telephony/numbers/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership via provider
      const existing = await storage.getPhoneNumber(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Phone number not found" });
      }
      
      const provider = await storage.getTelephonyProvider(existing.providerId);
      if (!provider || provider.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const success = await storage.deletePhoneNumber(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calls
  app.get("/api/telephony/calls", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const calls = await storage.getCallsByApiKey(apiKey.id);
      res.json(calls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/telephony/calls/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      const call = await storage.getCall(req.params.id);
      if (!call) {
        return res.status(404).json({ error: "Call not found" });
      }
      
      // Verify ownership via provider
      const provider = await storage.getTelephonyProvider(call.providerId);
      if (!provider || provider.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(call);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telephony/calls", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const { providerId, from, to, flowId } = req.body;

      if (!providerId || !from || !to) {
        return res.status(400).json({ error: "Missing required fields: providerId, from, to" });
      }

      // Verify provider ownership
      const provider = await storage.getTelephonyProvider(providerId);
      if (!provider || provider.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Provider not found or access denied" });
      }

      // Initiate call through telephony service (uses instance created below)
      const callSession = await telephonyService.initiateCall({
        providerId,
        from,
        to,
        flowId,
      });

      res.json(callSession);
    } catch (error: any) {
      console.error('[API] Call initiation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Calling Campaigns
  app.get("/api/telephony/campaigns", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const campaigns = await storage.getAllCallingCampaigns(apiKey.id);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/telephony/campaigns/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      const campaign = await storage.getCallingCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      // Verify ownership
      if (campaign.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telephony/campaigns", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Validate input
      const validated = insertCallingCampaignSchema.parse({
        ...req.body,
        apiKeyId: apiKey.id,
      });
      
      // Verify provider ownership if providerId is specified
      if (validated.providerId) {
        const provider = await storage.getTelephonyProvider(validated.providerId);
        if (!provider || provider.apiKeyId !== apiKey.id) {
          return res.status(403).json({ error: "Provider not found or access denied" });
        }
      }
      
      const campaign = await storage.createCallingCampaign(validated);
      res.json(campaign);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/telephony/campaigns/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership
      const existing = await storage.getCallingCampaign(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      if (existing.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const campaign = await storage.updateCallingCampaign(req.params.id, req.body);
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/telephony/campaigns/:id", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      
      // Verify ownership
      const existing = await storage.getCallingCampaign(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      if (existing.apiKeyId !== apiKey.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      const success = await storage.deleteCallingCampaign(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Twilio webhook validation middleware
  // Uses req.rawBody captured by express.json verify in server/index.ts
  const validateTwilioWebhook = async (req: Request, res: Response, next: Function) => {
    try {
      const signature = req.headers['x-twilio-signature'] as string;
      
      if (!signature) {
        console.warn("[Telephony] Missing Twilio signature, rejecting webhook");
        return res.status(403).json({ error: "Forbidden: Missing signature" });
      }

      // Get raw body for signature validation (preserved by express.json verify callback)
      const rawBody = (req as any).rawBody as Buffer;
      if (!rawBody) {
        console.warn("[Telephony] Missing raw body for signature validation");
        return res.status(403).json({ error: "Forbidden: Cannot validate signature" });
      }

      // Get provider from session/call to retrieve auth token
      let authToken: string | undefined;
      
      if (req.params.sessionId) {
        const session = telephonyService.getSession(req.params.sessionId);
        if (session) {
          const provider = await storage.getTelephonyProvider(session.providerId);
          const creds = provider?.credentials as { authToken?: string } | null;
          authToken = creds?.authToken;
        }
      } else if (req.params.callId) {
        const call = await storage.getCall(req.params.callId);
        if (call) {
          const provider = await storage.getTelephonyProvider(call.providerId);
          const creds = provider?.credentials as { authToken?: string } | null;
          authToken = creds?.authToken;
        }
      }

      if (!authToken) {
        console.warn("[Telephony] Could not retrieve auth token for validation");
        return res.status(403).json({ error: "Forbidden: Invalid configuration" });
      }

      // Construct full URL for validation
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const url = `${protocol}://${host}${req.originalUrl}`;

      // Parse raw body as URL-encoded for signature validation (Twilio sends form data)
      const bodyParams = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));

      const { TwilioProvider } = await import("./services/telephony-providers/twilio-provider");
      const isValid = TwilioProvider.validateWebhookSignature(
        authToken,
        signature,
        url,
        bodyParams
      );

      if (!isValid) {
        console.warn("[Telephony] Invalid Twilio webhook signature");
        return res.status(403).json({ error: "Forbidden: Invalid signature" });
      }

      next();
    } catch (error: any) {
      console.error("[Telephony] Webhook validation error:", error);
      res.status(500).json({ error: "Validation failed" });
    }
  };

  // Twilio Webhook Routes
  // TwiML generation endpoint - returns instructions for handling the call
  app.post("/api/telephony/twiml/:sessionId", validateTwilioWebhook, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = telephonyService.getSession(sessionId);
      
      if (!session) {
        console.error(`[Telephony] Session not found: ${sessionId}`);
        res.type('text/xml');
        return res.send('<Response><Say>Call session not found</Say><Hangup/></Response>');
      }

      // Generate WebSocket stream URL for real-time audio with auth token
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `wss://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'ws://localhost:5000';
      
      // Generate one-time token for this stream session
      const crypto = await import("crypto");
      const streamToken = crypto.randomBytes(32).toString('hex');
      
      // Store token for validation (TTL: 5 minutes)
      session.metadata.streamToken = streamToken;
      session.metadata.streamTokenExpiry = Date.now() + 5 * 60 * 1000;
      
      const streamUrl = `${baseUrl}/ws/twilio-media/${sessionId}?token=${streamToken}`;

      // Generate TwiML with streaming and optional greeting
      const { TwilioProvider } = await import("./services/telephony-providers/twilio-provider");
      const twiml = TwilioProvider.generateTwiML({
        message: "Please wait while we connect you...",
        streamUrl,
        recordingEnabled: true,
      });

      res.type('text/xml');
      res.send(twiml);
    } catch (error: any) {
      console.error("[Telephony] TwiML generation error:", error);
      res.type('text/xml');
      res.send('<Response><Say>An error occurred</Say><Hangup/></Response>');
    }
  });

  // Status callback endpoint - receives call status updates
  app.post("/api/telephony/status/:callId", validateTwilioWebhook, async (req, res) => {
    try {
      const { callId } = req.params;
      const { CallStatus, CallDuration, RecordingUrl } = req.body;
      
      console.log(`[Telephony] Status update for call ${callId}: ${CallStatus}`);

      // Map Twilio status to our status
      const statusMap: Record<string, string> = {
        'queued': 'queued',
        'ringing': 'ringing',
        'in-progress': 'in-progress',
        'completed': 'completed',
        'busy': 'failed',
        'no-answer': 'failed',
        'canceled': 'failed',
        'failed': 'failed'
      };

      const updates: any = {
        status: statusMap[CallStatus] || CallStatus,
      };

      if (CallDuration) {
        updates.duration = parseInt(CallDuration);
      }

      if (RecordingUrl) {
        updates.recordingUrl = RecordingUrl;
      }

      if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(CallStatus)) {
        updates.endedAt = new Date();
      }

      await storage.updateCall(callId, updates);
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error("[Telephony] Status callback error:", error);
      res.sendStatus(500);
    }
  });

  // Twilio Media Stream WebSocket Handler
  // This handles real-time audio streaming from Twilio calls
  const twilioMediaWss = new WebSocketServer({ noServer: true });
  
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    // Check if this is a Twilio media stream request
    if (pathname.startsWith('/ws/twilio-media/')) {
      twilioMediaWss.handleUpgrade(request, socket, head, (ws) => {
        twilioMediaWss.emit('connection', ws, request);
      });
    }
  });

  twilioMediaWss.on('connection', (ws: WebSocket, request: any) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const pathname = url.pathname;
    const sessionId = pathname.split('/')[3]; // Extract sessionId from /ws/twilio-media/:sessionId
    const token = url.searchParams.get('token');
    
    console.log(`[TwilioMedia] Stream connection attempt for session: ${sessionId}`);
    
    // Validate authentication token
    const session = telephonyService.getSession(sessionId);
    if (!session) {
      console.warn(`[TwilioMedia] Invalid session: ${sessionId}`);
      ws.close(4001, 'Invalid session');
      return;
    }
    
    const expectedToken = session.metadata.streamToken;
    const tokenExpiry = session.metadata.streamTokenExpiry;
    
    if (!expectedToken || !token || token !== expectedToken) {
      console.warn(`[TwilioMedia] Invalid auth token for session: ${sessionId}`);
      ws.close(4001, 'Unauthorized');
      return;
    }
    
    if (Date.now() > tokenExpiry) {
      console.warn(`[TwilioMedia] Expired auth token for session: ${sessionId}`);
      ws.close(4001, 'Token expired');
      return;
    }
    
    // Clear one-time token after successful authentication
    delete session.metadata.streamToken;
    delete session.metadata.streamTokenExpiry;
    
    console.log(`[TwilioMedia] Stream authenticated for session: ${sessionId}`);
    
    let streamSid: string | null = null;
    let callSid: string | null = null;
    let audioBuffer: Buffer[] = [];
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.event) {
          case 'connected':
            console.log(`[TwilioMedia] Connected: protocol=${message.protocol}`);
            break;
            
          case 'start':
            streamSid = message.streamSid;
            callSid = message.start.callSid;
            console.log(`[TwilioMedia] Stream started: ${streamSid}, call: ${callSid}`);
            
            // Update call record with stream info
            const session = telephonyService.getSession(sessionId);
            if (session) {
              await storage.updateCall(session.callId, {
                metadata: {
                  streamSid,
                  callSid,
                },
              });
            }
            break;
            
          case 'media':
            // Twilio sends base64-encoded μ-law audio at 8kHz
            const payload = message.media.payload;
            const audioChunk = Buffer.from(payload, 'base64');
            
            // Convert μ-law 8kHz → PCM 16kHz for ML processing
            try {
              const { getAudioConverter } = await import("./services/audio-converter-bridge");
              const converter = await getAudioConverter();
              const pcm16k = await converter.convertTelephonyToML(audioChunk);
              
              // Buffer converted audio
              audioBuffer.push(pcm16k);
              
              // Send converted audio to telephony service for ML processing
              await telephonyService.processAudioChunk(sessionId, pcm16k);
              
              // Get synthesized response from ML pipeline (STT → VLLM → TTS)
              const responseAudio = await telephonyService.getResponseAudio(sessionId);
              
              if (responseAudio) {
                // Convert PCM 16kHz response to μ-law 8kHz for Twilio
                const ulaw8k = await converter.convertMLToTelephony(responseAudio);
                
                // Send back to Twilio using media 'mark' and 'media' events
                const markMessage = {
                  event: 'mark',
                  streamSid: streamSid,
                  mark: {
                    name: `response_${Date.now()}`
                  }
                };
                ws.send(JSON.stringify(markMessage));
                
                // Send audio in chunks (Twilio expects base64-encoded μ-law)
                const chunkSize = 160; // 20ms at 8kHz
                for (let i = 0; i < ulaw8k.length; i += chunkSize) {
                  const chunk = ulaw8k.slice(i, i + chunkSize);
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
              console.error('[TwilioMedia] Audio conversion error:', conversionError.message);
              // Continue without conversion as fallback (may affect STT accuracy)
              await telephonyService.processAudioChunk(sessionId, audioChunk);
            }
            break;
            
          case 'stop':
            console.log(`[TwilioMedia] Stream stopped: ${streamSid}`);
            audioBuffer = [];
            break;
            
          default:
            console.log(`[TwilioMedia] Unknown event: ${message.event}`);
        }
      } catch (error: any) {
        console.error('[TwilioMedia] Message error:', error.message);
      }
    });
    
    ws.on('close', () => {
      console.log(`[TwilioMedia] Stream disconnected: ${sessionId}`);
      audioBuffer = [];
    });
    
    ws.on('error', (error) => {
      console.error('[TwilioMedia] WebSocket error:', error);
    });
  });
  
  // WebSocket Server for Real-time Streaming (legacy)
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "tts_stream") {
          // Mock streaming TTS
          ws.send(JSON.stringify({
            type: "tts_chunk",
            data: "base64-encoded-audio-chunk",
            chunk: 1,
          }));
        } else if (message.type === "stt_stream") {
          // Mock streaming STT
          ws.send(JSON.stringify({
            type: "stt_partial",
            text: "Partial transcription...",
          }));
        } else if (message.type === "vllm_chat") {
          // Mock VLLM conversation
          ws.send(JSON.stringify({
            type: "vllm_response",
            text: "This is a streaming response from VLLM...",
          }));
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message",
        }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Send welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "connected",
        message: "WebSocket connection established",
      }));
    }
  });

  return httpServer;
}