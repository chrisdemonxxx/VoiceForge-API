import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usage: integer("usage").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  rateLimit: integer("rate_limit").default(1000).notNull(), // requests per hour
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  key: true,
  createdAt: true,
  usage: true,
  active: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Cloning Mode enum
export const CloningMode = z.enum(["instant", "professional", "synthetic"]);
export type CloningModeType = z.infer<typeof CloningMode>;

// Processing Status enum
export const ProcessingStatus = z.enum(["pending", "processing", "completed", "failed"]);
export type ProcessingStatusType = z.infer<typeof ProcessingStatus>;

// Cloned Voices table
export const clonedVoices = pgTable("cloned_voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  model: text("model").notNull(), // chatterbox or higgs_audio_v2
  description: text("description"),
  cloningMode: text("cloning_mode").notNull().default("instant"), // instant, professional, synthetic
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  voiceDescription: text("voice_description"), // for synthetic voices - description of desired voice
  referenceAudioPath: text("reference_audio_path"), // null for synthetic voices
  voiceCharacteristics: jsonb("voice_characteristics"), // stores formant values, pitch, etc.
  status: text("status").notNull().default("ready"), // processing, ready, failed (kept for backward compatibility)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClonedVoiceSchema = createInsertSchema(clonedVoices).omit({
  id: true,
  createdAt: true,
  processingStartedAt: true,
  processingCompletedAt: true,
});

export type InsertClonedVoice = z.infer<typeof insertClonedVoiceSchema>;
export type ClonedVoice = typeof clonedVoices.$inferSelect;

// Agent Flows - Visual flow builder for conversational AI agents
export const agentFlows = pgTable("agent_flows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  configuration: jsonb("configuration"), // flow-level settings like variables, webhooks, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentFlowSchema = createInsertSchema(agentFlows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentFlow = z.infer<typeof insertAgentFlowSchema>;
export type AgentFlow = typeof agentFlows.$inferSelect;

// Flow Node Types enum
export const FlowNodeType = z.enum([
  "subagent",         // Modify agent behavior at conversation points
  "tool",             // Execute specific actions
  "agent_transfer",   // Hand off to different AI agents
  "phone_transfer",   // Transfer to human via phone
  "end_call",         // Terminate conversation
]);
export type FlowNodeTypeType = z.infer<typeof FlowNodeType>;

// Flow Nodes - Individual nodes within an agent flow
export const flowNodes = pgTable("flow_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flowId: varchar("flow_id").notNull().references(() => agentFlows.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // subagent, tool, agent_transfer, phone_transfer, end_call
  position: jsonb("position").notNull(), // {x: number, y: number}
  data: jsonb("data").notNull(), // Node-specific configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFlowNodeSchema = createInsertSchema(flowNodes).omit({
  id: true,
  createdAt: true,
});

export type InsertFlowNode = z.infer<typeof insertFlowNodeSchema>;
export type FlowNode = typeof flowNodes.$inferSelect;

// Flow Edges - Connections between nodes in a flow
export const flowEdges = pgTable("flow_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flowId: varchar("flow_id").notNull().references(() => agentFlows.id, { onDelete: "cascade" }),
  sourceNodeId: varchar("source_node_id").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
  targetNodeId: varchar("target_node_id").notNull().references(() => flowNodes.id, { onDelete: "cascade" }),
  label: text("label"), // Optional label for the edge (e.g., condition)
  type: text("type").default("default"), // default, conditional, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFlowEdgeSchema = createInsertSchema(flowEdges).omit({
  id: true,
  createdAt: true,
});

export type InsertFlowEdge = z.infer<typeof insertFlowEdgeSchema>;
export type FlowEdge = typeof flowEdges.$inferSelect;

// Node data structure schemas for type safety
export const subagentNodeDataSchema = z.object({
  systemPrompt: z.string(),
  tools: z.array(z.string()).optional(),
  knowledgeBase: z.string().optional(),
  turnEagerness: z.number().min(0).max(1).default(0.5),
  timeout: z.number().optional(),
});

export const toolNodeDataSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()).optional(),
  onSuccess: z.string().optional(), // Node ID to transition to on success
  onFailure: z.string().optional(), // Node ID to transition to on failure
});

export const agentTransferNodeDataSchema = z.object({
  targetAgentId: z.string(),
  context: z.string().optional(),
});

export const phoneTransferNodeDataSchema = z.object({
  phoneNumber: z.string(),
  message: z.string().optional(),
});

export const endCallNodeDataSchema = z.object({
  message: z.string().optional(),
  saveTranscript: z.boolean().default(true),
});

export type SubagentNodeData = z.infer<typeof subagentNodeDataSchema>;
export type ToolNodeData = z.infer<typeof toolNodeDataSchema>;
export type AgentTransferNodeData = z.infer<typeof agentTransferNodeDataSchema>;
export type PhoneTransferNodeData = z.infer<typeof phoneTransferNodeDataSchema>;
export type EndCallNodeData = z.infer<typeof endCallNodeDataSchema>;

// TTS Models enum
export const TTSModel = z.enum(["indic-parler-tts", "parler-tts-multilingual", "chatterbox", "higgs_audio_v2", "styletts2"]);
export type TTSModelType = z.infer<typeof TTSModel>;

// Agent Modes enum
export const AgentMode = z.enum(["echo", "assistant", "conversational", "custom"]);
export type AgentModeType = z.infer<typeof AgentMode>;

// Audio format enum
export const AudioFormat = z.enum(["wav", "mp3", "flac", "ogg"]);
export type AudioFormatType = z.infer<typeof AudioFormat>;

// TTS Request schema
export const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  model: TTSModel,
  voice: z.string().optional(),
  format: AudioFormat.default("wav"),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

export type TTSRequest = z.infer<typeof ttsRequestSchema>;

// STT Request schema
export const sttRequestSchema = z.object({
  language: z.string().default("en"),
  format: AudioFormat,
});

export type STTRequest = z.infer<typeof sttRequestSchema>;

// Voice Clone Request schemas - different for each mode
export const instantVoiceCloneRequestSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.enum(["chatterbox", "higgs_audio_v2"]),
  description: z.string().optional(),
  cloningMode: z.literal("instant"),
});

export const professionalVoiceCloneRequestSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.enum(["chatterbox", "higgs_audio_v2"]),
  description: z.string().optional(),
  cloningMode: z.literal("professional"),
  captchaVerified: z.boolean().default(false),
});

export const syntheticVoiceRequestSchema = z.object({
  name: z.string().min(1).max(100),
  cloningMode: z.literal("synthetic"),
  voiceDescription: z.string().min(10).max(500), // Description of the desired voice
  age: z.enum(["young", "middle_aged", "old"]).optional(),
  gender: z.enum(["male", "female", "neutral"]).optional(),
  accent: z.string().optional(), // e.g., "american", "british", "indian"
  tone: z.string().optional(), // e.g., "warm", "authoritative", "friendly"
  model: z.enum(["chatterbox", "higgs_audio_v2"]).default("chatterbox"),
});

// Union of all voice clone request schemas
export const voiceCloneRequestSchema = z.discriminatedUnion("cloningMode", [
  instantVoiceCloneRequestSchema,
  professionalVoiceCloneRequestSchema,
  syntheticVoiceRequestSchema,
]);

export type InstantVoiceCloneRequest = z.infer<typeof instantVoiceCloneRequestSchema>;
export type ProfessionalVoiceCloneRequest = z.infer<typeof professionalVoiceCloneRequestSchema>;
export type SyntheticVoiceRequest = z.infer<typeof syntheticVoiceRequestSchema>;
export type VoiceCloneRequest = z.infer<typeof voiceCloneRequestSchema>;

// Usage Stats interface
export interface UsageStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  requestsToday: number;
  ttsRequests: number;
  sttRequests: number;
  vadRequests: number;
  vllmRequests: number;
}

// Model Info interface
export interface ModelInfo {
  id: TTSModelType;
  name: string;
  description: string;
  parameters: string;
  languages: string[];
  features: string[];
  speed: string;
  quality: number; // 1-5 stars
  voiceCloning: boolean;
  emotionalRange: "low" | "medium" | "high" | "excellent";
}

// Audio Job interface
export interface AudioJob {
  id: string;
  type: "tts" | "stt" | "vad" | "clone";
  status: "pending" | "processing" | "completed" | "failed";
  model?: string;
  input: string;
  output?: string;
  duration?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Real-time WebSocket Protocol
// For dual-channel architecture: /ws/audio (low-latency audio) and /ws/control (session management)

// Client → Server Messages
export const wsClientMessageSchema = z.discriminatedUnion("type", [
  // Session initialization
  z.object({
    type: z.literal("init"),
    eventId: z.string(),
    apiKey: z.string(),
    config: z.object({
      mode: z.enum(["voice", "text", "hybrid"]),
      sttEnabled: z.boolean().default(true),
      ttsEnabled: z.boolean().default(true),
      agentEnabled: z.boolean().default(false),
      agentMode: AgentMode.default("assistant"),
      systemPrompt: z.string().optional(),
      model: TTSModel.default("chatterbox"),
      voice: z.string().optional(),
      language: z.string().default("en"),
    }),
  }),
  
  // Audio chunk (PCM16, 20ms frames)
  z.object({
    type: z.literal("audio_chunk"),
    eventId: z.string(),
    chunk: z.string(), // base64 encoded PCM16
    timestamp: z.number(), // client timestamp for latency tracking
  }),
  
  // Text input (alternative to voice)
  z.object({
    type: z.literal("text_input"),
    eventId: z.string(),
    text: z.string(),
    timestamp: z.number(),
  }),
  
  // Control messages
  z.object({
    type: z.literal("pause"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("resume"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("end"),
    eventId: z.string(),
  }),
  
  // Quality feedback
  z.object({
    type: z.literal("quality_feedback"),
    eventId: z.string(),
    category: z.enum(["stt_accuracy", "tts_quality", "latency", "overall"]),
    score: z.number().min(1).max(5),
    comment: z.string().optional(),
  }),
]);

// Server → Client Messages
export const wsServerMessageSchema = z.discriminatedUnion("type", [
  // Session acknowledgment
  z.object({
    type: z.literal("ready"),
    eventId: z.string(),
    sessionId: z.string(),
    serverTimestamp: z.number(),
  }),
  
  // STT partial result (streaming)
  z.object({
    type: z.literal("stt_partial"),
    eventId: z.string(),
    text: z.string(),
    confidence: z.number(),
    timestamp: z.number(),
  }),
  
  // STT final result
  z.object({
    type: z.literal("stt_final"),
    eventId: z.string(),
    text: z.string(),
    confidence: z.number(),
    language: z.string(),
    duration: z.number(),
    latency: z.object({
      capture: z.number(),
      network: z.number(),
      processing: z.number(),
      total: z.number(),
    }),
  }),
  
  // Agent processing
  z.object({
    type: z.literal("agent_thinking"),
    eventId: z.string(),
    status: z.string(),
  }),
  
  // Agent response
  z.object({
    type: z.literal("agent_reply"),
    eventId: z.string(),
    text: z.string(),
    timestamp: z.number(),
  }),
  
  // TTS audio chunk (streaming)
  z.object({
    type: z.literal("tts_chunk"),
    eventId: z.string(),
    chunk: z.string(), // base64 encoded audio
    sequence: z.number(),
    done: z.boolean(),
  }),
  
  // TTS complete
  z.object({
    type: z.literal("tts_complete"),
    eventId: z.string(),
    duration: z.number(),
    latency: z.object({
      processing: z.number(),
      streaming: z.number(),
      total: z.number(),
    }),
  }),
  
  // Real-time metrics
  z.object({
    type: z.literal("metrics"),
    eventId: z.string(),
    metrics: z.object({
      sttLatency: z.number().optional(),
      ttsLatency: z.number().optional(),
      agentLatency: z.number().optional(),
      endToEndLatency: z.number().optional(),
      activeConnections: z.number(),
      queueDepth: z.number(),
    }),
  }),
  
  // Error handling
  z.object({
    type: z.literal("error"),
    eventId: z.string(),
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
  }),
  
  // Session ended
  z.object({
    type: z.literal("ended"),
    eventId: z.string(),
    reason: z.string(),
    stats: z.object({
      duration: z.number(),
      messagesProcessed: z.number(),
      avgLatency: z.number(),
      errorCount: z.number(),
    }),
  }),
]);

export type WSClientMessage = z.infer<typeof wsClientMessageSchema>;
export type WSServerMessage = z.infer<typeof wsServerMessageSchema>;

// Legacy WebSocket message types (for backward compatibility)
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tts_stream"),
    text: z.string(),
    model: TTSModel,
    voice: z.string().optional(),
  }),
  z.object({
    type: z.literal("stt_stream"),
    audio: z.string(), // base64 encoded
  }),
  z.object({
    type: z.literal("vllm_chat"),
    message: z.string(),
    voice: z.string().optional(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Real-time session state
export interface RealTimeSession {
  id: string;
  apiKeyId: string;
  mode: "voice" | "text" | "hybrid";
  startedAt: Date;
  endedAt?: Date;
  messagesProcessed: number;
  avgLatency: number;
  errorCount: number;
}

// Telephony Provider Types
export const TelephonyProvider = z.enum(["twilio", "telnyx", "vonage", "zadarma", "custom"]);
export type TelephonyProviderType = z.infer<typeof TelephonyProvider>;

// Telephony Providers - Store provider credentials and configuration
export const telephonyProviders = pgTable("telephony_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // twilio, telnyx, vonage, zadarma, custom
  name: text("name").notNull(),
  credentials: jsonb("credentials").notNull(), // Encrypted provider credentials
  configuration: jsonb("configuration"), // Provider-specific settings
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTelephonyProviderSchema = createInsertSchema(telephonyProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTelephonyProvider = z.infer<typeof insertTelephonyProviderSchema>;
export type TelephonyProvider = typeof telephonyProviders.$inferSelect;

// Phone Numbers - Purchased or linked phone numbers
export const phoneNumbers = pgTable("phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => telephonyProviders.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull().unique(),
  friendlyName: text("friendly_name"),
  country: text("country"),
  capabilities: jsonb("capabilities"), // {voice: true, sms: true, mms: false}
  active: boolean("active").default(true).notNull(),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export const insertPhoneNumberSchema = createInsertSchema(phoneNumbers).omit({
  id: true,
  purchasedAt: true,
});

export type InsertPhoneNumber = z.infer<typeof insertPhoneNumberSchema>;
export type PhoneNumber = typeof phoneNumbers.$inferSelect;

// Call Status enum
export const CallStatus = z.enum([
  "queued", "initiated", "ringing", "in-progress", 
  "completed", "failed", "busy", "no-answer", "canceled"
]);
export type CallStatusType = z.infer<typeof CallStatus>;

// Call Direction enum
export const CallDirection = z.enum(["inbound", "outbound"]);
export type CallDirectionType = z.infer<typeof CallDirection>;

// Calls - Individual call records
export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerId: varchar("provider_id").notNull().references(() => telephonyProviders.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").references(() => callingCampaigns.id, { onDelete: "set null" }),
  phoneNumberId: varchar("phone_number_id").references(() => phoneNumbers.id, { onDelete: "set null" }),
  flowId: varchar("flow_id").references(() => agentFlows.id, { onDelete: "set null" }),
  providerCallId: text("provider_call_id"), // External provider's call ID
  direction: text("direction").notNull(), // inbound or outbound
  from: text("from").notNull(),
  to: text("to").notNull(),
  status: text("status").notNull().default("queued"),
  duration: integer("duration"), // in seconds
  recordingUrl: text("recording_url"),
  transcriptUrl: text("transcriptUrl"),
  metadata: jsonb("metadata"), // Additional call data
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
});

export type InsertCall = z.infer<typeof insertCallSchema>;
export type Call = typeof calls.$inferSelect;

// Campaign Status enum
export const CampaignStatus = z.enum(["draft", "scheduled", "running", "paused", "completed", "failed"]);
export type CampaignStatusType = z.infer<typeof CampaignStatus>;

// Calling Campaigns - Batch calling campaigns
export const callingCampaigns = pgTable("calling_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  providerId: varchar("provider_id").notNull().references(() => telephonyProviders.id, { onDelete: "cascade" }),
  flowId: varchar("flow_id").references(() => agentFlows.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  phoneList: jsonb("phone_list").notNull(), // Array of phone numbers to call
  status: text("status").notNull().default("draft"),
  totalCalls: integer("total_calls").default(0).notNull(),
  completedCalls: integer("completed_calls").default(0).notNull(),
  successfulCalls: integer("successful_calls").default(0).notNull(),
  failedCalls: integer("failed_calls").default(0).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCallingCampaignSchema = createInsertSchema(callingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalCalls: true,
  completedCalls: true,
  successfulCalls: true,
  failedCalls: true,
});

export type InsertCallingCampaign = z.infer<typeof insertCallingCampaignSchema>;
export type CallingCampaign = typeof callingCampaigns.$inferSelect;
