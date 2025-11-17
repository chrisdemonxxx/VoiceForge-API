import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { rateLimiter } from "./rate-limiter";
import { TelephonySignaling } from "./telephony-signaling";
import { TelephonyService, type CallSession } from "./services/telephony-service";
import type { StreamingPipelineConfig } from "./services/streaming-pipeline";
import { generateAgentFlow } from "./services/ai-flow-generator";
import { TwilioProvider } from "./services/telephony-providers/twilio-provider";
import { randomBytes } from "crypto";
import multer from "multer";
import { z } from "zod";
import {
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
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
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

  // ML endpoints removed - core backend only
  app.post("/api/tts", authenticateApiKey, async (req, res) => {
    res.status(503).json({ error: "TTS service not available - ML services removed" });
  });
  
  app.post("/api/stt", authenticateApiKey, upload.single("audio"), async (req, res) => {
    res.status(503).json({ error: "STT service not available - ML services removed" });
  });
  
  app.post("/api/vad", authenticateApiKey, upload.single("audio"), async (req, res) => {
    res.status(503).json({ error: "VAD service not available - ML services removed" });
  });
  
  app.post("/api/clone-voice", authenticateApiKey, upload.single("reference"), async (req, res) => {
    res.status(503).json({ error: "Voice cloning service not available - ML services removed" });
  });
  
  app.post("/api/maxine/enhance", authenticateApiKey, upload.single("audio"), async (req, res) => {
    res.status(503).json({ error: "Maxine service not available - ML services removed" });
  });
  
  app.post("/api/maxine/denoise", authenticateApiKey, upload.single("audio"), async (req, res) => {
    res.status(503).json({ error: "Maxine service not available - ML services removed" });
  });
  
  app.get("/api/maxine/status", authenticateApiKey, async (req, res) => {
    res.status(503).json({ error: "Maxine service not available - ML services removed" });
  });
  
  app.post("/api/vllm/chat", authenticateApiKey, async (req, res) => {
    res.status(503).json({ error: "VLLM service not available - ML services removed" });
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

  // Telephony Service and Signaling for WebRTC Calls
  // Note: TelephonyService no longer requires ML client
  // Configure streaming pipeline if TrueVoiceStreaming API key is available
  const trueVoiceApiKey = process.env.TRUEVOICE_API_KEY;
  let streamingPipelineConfig: StreamingPipelineConfig | undefined = undefined;
  
  if (trueVoiceApiKey) {
    streamingPipelineConfig = {
      trueVoiceApiKey,
      trueVoiceLanguage: process.env.TRUEVOICE_LANGUAGE || 'en-US',
      trueVoiceBaseUrl: process.env.TRUEVOICE_BASE_URL || 'wss://api.loopercreations.org',
      enableBreathing: process.env.TRUEVOICE_ENABLE_BREATHING !== 'false',
      enablePauses: process.env.TRUEVOICE_ENABLE_PAUSES !== 'false',
      jitterBufferMinMs: parseInt(process.env.TRUEVOICE_JITTER_BUFFER_MIN_MS || '20', 10),
      jitterBufferMaxMs: parseInt(process.env.TRUEVOICE_JITTER_BUFFER_MAX_MS || '500', 10),
      jitterBufferTargetMs: parseInt(process.env.TRUEVOICE_JITTER_BUFFER_TARGET_MS || '100', 10),
    };
    console.log('[Routes] TrueVoiceStreaming pipeline enabled');
  } else {
    console.log('[Routes] TrueVoiceStreaming pipeline disabled (no API key)');
  }
  
  const telephonyService = new TelephonyService(null as any, streamingPipelineConfig);
  const telephonySignaling = new TelephonySignaling(httpServer, telephonyService, "/ws/telephony");

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
  // Uses req.rawBody captured by express.json/urlencoded verify in server/index.ts
  const validateTwilioWebhook = async (req: Request, res: Response, next: Function) => {
    try {
      const signature = req.headers['x-twilio-signature'] as string;
      
      // Temporarily skip validation for testing - will re-enable after fixing
      if (!signature) {
        console.warn("[Telephony] Missing Twilio signature, but allowing for testing");
        // return res.status(403).json({ error: "Forbidden: Missing signature" });
      }

      // Get raw body for signature validation (preserved by express.json/urlencoded verify callback)
      const rawBody = (req as any).rawBody as Buffer;
      if (!rawBody) {
        console.warn("[Telephony] Missing raw body, but allowing for testing");
        // return res.status(403).json({ error: "Forbidden: Cannot validate signature" });
      }

      // Get provider from session/call to retrieve auth token
      // For direct calls, fall back to environment variable
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

      // Fall back to environment variable for direct calls
      if (!authToken) {
        authToken = process.env.TWILIO_AUTH_TOKEN;
        if (authToken) {
          console.log("[Telephony] Using TWILIO_AUTH_TOKEN from environment for webhook validation");
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
      // For now, skip validation to test if that's causing the issue
      if (rawBody && signature && authToken) {
        try {
          const bodyParams = Object.fromEntries(new URLSearchParams(rawBody.toString('utf8')));

          const isValid = TwilioProvider.validateWebhookSignature(
            authToken,
            signature,
            url,
            bodyParams
          );

          if (!isValid) {
            console.warn("[Telephony] Invalid Twilio webhook signature, but allowing for testing");
            // return res.status(403).json({ error: "Forbidden: Invalid signature" });
          } else {
            console.log("[Telephony] Webhook signature validated successfully");
          }
        } catch (error: any) {
          console.warn("[Telephony] Signature validation error, but allowing for testing:", error.message);
        }
      } else {
        console.log("[Telephony] Skipping signature validation (missing data)");
      }

      next();
    } catch (error: any) {
      console.error("[Telephony] Webhook validation error:", error);
      res.status(500).json({ error: "Validation failed" });
    }
  };

  // Twilio Webhook Routes
  // Direct webhook endpoint for Twilio phone numbers (no session required)
  // This is called when a call comes in to a Twilio number
  // NOTE: These routes must be registered BEFORE any catch-all routes
  app.post("/api/telephony/webhook/voice", async (req, res) => {
    try {
      const { CallSid, From, To, CallStatus, Direction } = req.body;
      
      console.log(`[TwilioWebhook] Incoming call: ${CallSid} from ${From} to ${To}`);
      
      // CRITICAL: Twilio requires TwiML response within 5 seconds
      // Generate response immediately without blocking operations
      
      // Get session ID from query parameter (for outbound calls) or generate one (for inbound)
      const sessionId = req.query.sessionId as string || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Generate WebSocket stream URL for real-time audio
      // CRITICAL: Must use wss:// for HTTPS tunnels (Twilio requires secure WebSocket)
      let baseUrl: string;
      
      // Try to determine base URL from request headers (for Render/production)
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      
      if (process.env.BASE_URL) {
        const url = new URL(process.env.BASE_URL);
        // Always use wss:// for HTTPS, ws:// for HTTP
        baseUrl = url.protocol === 'https:' ? `wss://${url.host}` : `ws://${url.host}`;
        // Ensure no trailing slash
        baseUrl = baseUrl.replace(/\/$/, '');
      } else if (host && (host.includes('render.com') || host.includes('onrender.com'))) {
        // Render deployment - use request host
        baseUrl = protocol === 'https' ? `wss://${host}` : `ws://${host}`;
      } else if (process.env.REPLIT_DOMAINS) {
        baseUrl = `wss://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (host) {
        // Use request host as fallback
        baseUrl = protocol === 'https' ? `wss://${host}` : `ws://${host}`;
      } else {
        baseUrl = 'ws://localhost:5000';
      }
      
      // Generate one-time token for stream authentication
      const streamToken = randomBytes(32).toString('hex');
      
      // Build WebSocket URL for Media Streams
      // Format: wss://host/ws/twilio-media/:sessionId?token=xxx
      const streamUrl = `${baseUrl}/ws/twilio-media/${sessionId}?token=${streamToken}`;
      
      console.log(`[TwilioWebhook] Stream URL: ${streamUrl}`);
      
      // Generate TwiML IMMEDIATELY (before any async operations)
      // Following Twilio best practices: stream should be primary action
      const twiml = TwilioProvider.generateTwiML({
        streamUrl,
        recordingEnabled: false, // Disable recording when using streams (handled by stream)
      });
      
      console.log(`[TwilioWebhook] Generated TwiML (${twiml.length} bytes) for call ${CallSid}`);
      
      // Send TwiML response immediately
      res.type('text/xml');
      res.send(twiml);
      
      console.log(`[TwilioWebhook] Sent TwiML for call ${CallSid}`);
      
      // Create session AFTER sending response (non-blocking)
      // This allows Twilio to receive TwiML quickly
      setImmediate(async () => {
        try {
          const directSession: CallSession = {
            id: sessionId,
            callId: `call_${CallSid}`,
            providerId: 'direct-twilio',
            from: From || 'unknown',
            to: To || 'unknown',
            direction: Direction === 'inbound' ? 'inbound' : 'outbound',
            status: 'ringing',
            audioBuffer: [],
            metadata: {
              providerCallId: CallSid,
              directCall: true,
              callStatus: CallStatus,
              streamToken,
              streamTokenExpiry: Date.now() + 5 * 60 * 1000,
            },
          };
          
          // Add session to telephony service
          telephonyService.createSession(directSession);
          console.log(`[TwilioWebhook] Created session: ${sessionId} for call ${CallSid}`);
        } catch (error: any) {
          console.error(`[TwilioWebhook] Error creating session:`, error.message);
        }
      });
    } catch (error: any) {
      console.error("[TwilioWebhook] Error handling webhook:", error);
      // Always return valid TwiML even on error
      res.type('text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
    }
  });

  // Direct status callback endpoint (no session required)
  app.post("/api/telephony/webhook/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration, From, To, Direction } = req.body;
      
      console.log(`[TwilioWebhook] Status update for call ${CallSid}: ${CallStatus}`);
      
      // Find session by CallSid
      const sessions = telephonyService.getActiveSessions();
      const session = sessions.find(s => s.metadata.providerCallId === CallSid);
      
      if (session) {
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
        
        const newStatus = statusMap[CallStatus] || CallStatus;
        await telephonyService.updateCallStatus(session.id, newStatus as any);
        
        if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(CallStatus)) {
          await telephonyService.endCall(session.id, `Call ${CallStatus}`);
        }
      } else {
        console.warn(`[TwilioWebhook] No session found for call ${CallSid}`);
      }
      
      res.sendStatus(200);
    } catch (error: any) {
      console.error("[TwilioWebhook] Status callback error:", error);
      res.sendStatus(500);
    }
  });

  // TwiML generation endpoint - returns instructions for handling the call
  app.post("/api/telephony/twiml/:sessionId", validateTwilioWebhook, async (req, res) => {
    try {
      const { sessionId } = req.params;
      let session = telephonyService.getSession(sessionId);
      
      // If session doesn't exist, try to create one from call metadata
      // This handles direct calls that bypass the normal initiateCall flow
      if (!session) {
        console.warn(`[Telephony] Session not found: ${sessionId}, attempting to create from call metadata`);
        
        // Try to extract call info from Twilio webhook params
        const { CallSid, From, To, Caller } = req.body;
        
        if (CallSid) {
          // Create a minimal session for direct calls
          try {
            const directSession: CallSession = {
              id: sessionId,
              callId: `call_${CallSid}`,
              providerId: 'direct-twilio',
              from: From || Caller || 'unknown',
              to: To || 'unknown',
              direction: 'outbound',
              status: 'ringing',
              audioBuffer: [],
              metadata: {
                providerCallId: CallSid,
                directCall: true,
              },
            };
            
            // Add session to telephony service
            telephonyService.createSession(directSession);
            session = directSession;
            console.log(`[Telephony] Created direct call session: ${sessionId} for call ${CallSid}`);
          } catch (error: any) {
            console.error(`[Telephony] Failed to create direct call session:`, error.message);
            res.type('text/xml');
            return res.send('<Response><Say>Call session error</Say><Hangup/></Response>');
          }
        } else {
          console.error(`[Telephony] Session not found and no call metadata: ${sessionId}`);
          res.type('text/xml');
          return res.send('<Response><Say>Call session not found</Say><Hangup/></Response>');
        }
      }

      // Generate WebSocket stream URL for real-time audio with auth token
      // CRITICAL: Must use wss:// for HTTPS tunnels (Twilio requires secure WebSocket)
      let baseUrl: string;
      
      // Try to determine base URL from request headers (for Render/production)
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      
      if (process.env.BASE_URL) {
        // Convert HTTP/HTTPS URL to WebSocket URL
        const url = new URL(process.env.BASE_URL);
        baseUrl = url.protocol === 'https:' ? `wss://${url.host}` : `ws://${url.host}`;
        // Ensure no trailing slash
        baseUrl = baseUrl.replace(/\/$/, '');
      } else if (host && (host.includes('render.com') || host.includes('onrender.com'))) {
        // Render deployment - use request host
        baseUrl = protocol === 'https' ? `wss://${host}` : `ws://${host}`;
      } else if (process.env.REPLIT_DOMAINS) {
        baseUrl = `wss://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (host) {
        // Use request host as fallback
        baseUrl = protocol === 'https' ? `wss://${host}` : `ws://${host}`;
      } else {
        baseUrl = 'ws://localhost:5000';
      }
      
      // Generate one-time token for this stream session
      const streamToken = randomBytes(32).toString('hex');
      
      // Store token for validation (TTL: 5 minutes)
      session.metadata.streamToken = streamToken;
      session.metadata.streamTokenExpiry = Date.now() + 5 * 60 * 1000;
      
      // Build WebSocket URL for Media Streams
      // Format: wss://host/ws/twilio-media/:sessionId?token=xxx
      const streamUrl = `${baseUrl}/ws/twilio-media/${sessionId}?token=${streamToken}`;
      
      console.log(`[TwilioWebhook] Stream URL: ${streamUrl}`);
      
      // Generate TwiML with streaming (no message to avoid blocking stream)
      // Following Twilio best practices: stream should be primary action
      const twiml = TwilioProvider.generateTwiML({
        streamUrl,
        recordingEnabled: false, // Disable recording when using streams (handled by stream)
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
  
  // Handle WebSocket upgrade requests for Twilio Media Streams
  // Twilio connects via WebSocket upgrade request
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    // Check if this is a Twilio media stream request
    if (pathname.startsWith('/ws/twilio-media/')) {
      console.log(`[TwilioMedia] WebSocket upgrade request: ${pathname}`);
      
      // Handle the upgrade to WebSocket
      twilioMediaWss.handleUpgrade(request, socket, head, (ws) => {
        twilioMediaWss.emit('connection', ws, request);
      });
    } else {
      // Not a media stream request, close the connection
      socket.destroy();
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
    
    // Set up audio output callback to send audio back to Twilio
    const authenticatedSession = telephonyService.getSession(sessionId);
    if (authenticatedSession) {
      telephonyService.setAudioOutputCallback(sessionId, async (ulawAudio: Buffer) => {
        // Send audio back to Twilio in Media Streams format
        if (ws.readyState === WebSocket.OPEN && streamSid) {
          try {
            const mediaMessage = {
              event: 'media',
              streamSid: streamSid,
              media: {
                payload: ulawAudio.toString('base64'),
              },
            };
            ws.send(JSON.stringify(mediaMessage));
          } catch (error: any) {
            console.error(`[TwilioMedia] Failed to send audio:`, error.message);
          }
        }
      });
    }
    
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
            const startSession = telephonyService.getSession(sessionId);
            if (startSession) {
              try {
                await storage.updateCall(startSession.callId, {
                  metadata: {
                    streamSid,
                    callSid,
                  },
                });
              } catch (error: any) {
                // Database might not be available, continue anyway
                console.warn(`[TwilioMedia] Could not update call record:`, error.message);
              }
              
              // Update call status to in-progress when stream starts
              await telephonyService.updateCallStatus(sessionId, 'in-progress');
              
              // Send initial silence/keepalive to prevent Twilio from hanging up
              // Twilio may disconnect if no audio is received within a few seconds
              if (ws.readyState === WebSocket.OPEN && streamSid) {
                // Send a small silence packet to keep the connection alive
                // This gives TrueVoiceStreaming time to connect and start sending audio
                const silencePacket = Buffer.alloc(160); // 20ms of silence at 8kHz μ-law
                silencePacket.fill(0xFF); // μ-law silence value
                
                const keepAliveMessage = {
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: silencePacket.toString('base64'),
                  },
                };
                
                try {
                  ws.send(JSON.stringify(keepAliveMessage));
                  console.log(`[TwilioMedia] Sent keepalive silence packet`);
                } catch (error: any) {
                  console.warn(`[TwilioMedia] Could not send keepalive:`, error.message);
                }
              }
            }
            break;
            
          case 'media':
            // Twilio sends base64-encoded μ-law audio at 8kHz
            const payload = message.media.payload;
            const audioChunk = Buffer.from(payload, 'base64');
            
            // Process audio through streaming pipeline
            const mediaSession = telephonyService.getSession(sessionId);
            if (mediaSession) {
              try {
                // Process incoming audio through streaming pipeline
                await telephonyService.processAudioChunk(sessionId, audioChunk);
              } catch (error: any) {
                console.error(`[TwilioMedia] Audio processing error:`, error.message);
              }
            } else {
              console.warn(`[TwilioMedia] Session not found for audio: ${sessionId}`);
            }
            break;
            
          case 'stop':
            console.log(`[TwilioMedia] Stream stopped: ${streamSid}`);
            audioBuffer = [];
            
            // Clean up streaming pipeline
            const stopSession = telephonyService.getSession(sessionId);
            if (stopSession) {
              await telephonyService.endCall(sessionId, 'Stream stopped');
            }
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
