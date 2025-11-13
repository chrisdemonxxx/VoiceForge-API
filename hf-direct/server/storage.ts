import { 
  type ApiKey, type InsertApiKey, apiKeys, 
  type ClonedVoice, type InsertClonedVoice, clonedVoices,
  type AgentFlow, type InsertAgentFlow, agentFlows,
  type FlowNode, type InsertFlowNode, flowNodes,
  type FlowEdge, type InsertFlowEdge, flowEdges,
  type TelephonyProvider, type InsertTelephonyProvider, telephonyProviders,
  type PhoneNumber, type InsertPhoneNumber, phoneNumbers,
  type Call, type InsertCall, calls,
  type CallingCampaign, type InsertCallingCampaign, callingCampaigns
} from "@shared/schema";
import { db } from "../db";
import { eq, sql, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // API Keys
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deleteApiKey(id: string): Promise<boolean>;
  updateApiKey(id: string, data: Partial<Pick<ApiKey, 'active'>>): Promise<ApiKey | undefined>;
  incrementApiKeyUsage(id: string): Promise<void>;
  
  // Cloned Voices
  getClonedVoice(id: string): Promise<ClonedVoice | undefined>;
  getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]>;
  createClonedVoice(voice: InsertClonedVoice): Promise<ClonedVoice>;
  deleteClonedVoice(id: string): Promise<boolean>;
  updateClonedVoiceStatus(id: string, status: string): Promise<void>;
  
  // Agent Flows
  getAgentFlow(id: string): Promise<AgentFlow | undefined>;
  getAllAgentFlows(apiKeyId: string): Promise<AgentFlow[]>;
  createAgentFlow(flow: InsertAgentFlow): Promise<AgentFlow>;
  updateAgentFlow(id: string, data: Partial<Omit<AgentFlow, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<AgentFlow | undefined>;
  deleteAgentFlow(id: string): Promise<boolean>;
  
  // Flow Nodes
  getFlowNode(id: string): Promise<FlowNode | undefined>;
  getAllFlowNodes(flowId: string): Promise<FlowNode[]>;
  createFlowNode(node: InsertFlowNode): Promise<FlowNode>;
  updateFlowNode(id: string, data: Partial<Omit<FlowNode, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowNode | undefined>;
  deleteFlowNode(id: string): Promise<boolean>;
  
  // Flow Edges
  getFlowEdge(id: string): Promise<FlowEdge | undefined>;
  getAllFlowEdges(flowId: string): Promise<FlowEdge[]>;
  createFlowEdge(edge: InsertFlowEdge): Promise<FlowEdge>;
  updateFlowEdge(id: string, data: Partial<Omit<FlowEdge, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowEdge | undefined>;
  deleteFlowEdge(id: string): Promise<boolean>;
  
  // Telephony Providers
  getTelephonyProvider(id: string): Promise<TelephonyProvider | undefined>;
  getAllTelephonyProviders(apiKeyId: string): Promise<TelephonyProvider[]>;
  getActiveTelephonyProvider(apiKeyId: string): Promise<TelephonyProvider | undefined>;
  createTelephonyProvider(provider: InsertTelephonyProvider): Promise<TelephonyProvider>;
  updateTelephonyProvider(id: string, data: Partial<Omit<TelephonyProvider, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<TelephonyProvider | undefined>;
  deleteTelephonyProvider(id: string): Promise<boolean>;
  
  // Phone Numbers
  getPhoneNumber(id: string): Promise<PhoneNumber | undefined>;
  getAllPhoneNumbers(providerId: string): Promise<PhoneNumber[]>;
  getPhoneNumberByNumber(phoneNumber: string): Promise<PhoneNumber | undefined>;
  createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: string, data: Partial<Omit<PhoneNumber, 'id' | 'providerId' | 'purchasedAt'>>): Promise<PhoneNumber | undefined>;
  deletePhoneNumber(id: string): Promise<boolean>;
  
  // Calls
  getCall(id: string): Promise<Call | undefined>;
  getAllCalls(providerId: string): Promise<Call[]>;
  getCallsByApiKey(apiKeyId: string): Promise<Call[]>;
  getCallsByCampaign(campaignId: string): Promise<Call[]>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, data: Partial<Omit<Call, 'id' | 'createdAt'>>): Promise<Call | undefined>;
  
  // Calling Campaigns
  getCallingCampaign(id: string): Promise<CallingCampaign | undefined>;
  getAllCallingCampaigns(apiKeyId: string): Promise<CallingCampaign[]>;
  createCallingCampaign(campaign: InsertCallingCampaign): Promise<CallingCampaign>;
  updateCallingCampaign(id: string, data: Partial<Omit<CallingCampaign, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<CallingCampaign | undefined>;
  deleteCallingCampaign(id: string): Promise<boolean>;
  incrementCampaignStats(id: string, field: 'completedCalls' | 'successfulCalls' | 'failedCalls'): Promise<void>;
}

export class DbStorage implements IStorage {
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const results = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    return results[0];
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const results = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
    return results[0];
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const key = "vf_sk_" + randomBytes(16).toString("hex");
    const results = await db.insert(apiKeys).values({
      ...insertApiKey,
      key,
    }).returning();
    return results[0];
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateApiKey(id: string, data: Partial<Pick<ApiKey, 'active'>>): Promise<ApiKey | undefined> {
    const result = await db.update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    
    return result[0];
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    // Atomic SQL increment with returning clause to verify success
    // This generates: UPDATE api_keys SET usage = usage + 1 WHERE id = ? RETURNING *
    // The entire operation is atomic at the database level
    const result = await db.update(apiKeys)
      .set({ usage: sql`${apiKeys.usage} + 1` })
      .where(eq(apiKeys.id, id))
      .returning();
    
    // Verify exactly one row was updated
    if (result.length === 0) {
      throw new Error(`API key ${id} not found - unable to increment usage`);
    }
  }

  async getClonedVoice(id: string): Promise<ClonedVoice | undefined> {
    const results = await db.select().from(clonedVoices).where(eq(clonedVoices.id, id)).limit(1);
    return results[0];
  }

  async getAllClonedVoices(apiKeyId: string): Promise<ClonedVoice[]> {
    return await db.select().from(clonedVoices).where(eq(clonedVoices.apiKeyId, apiKeyId));
  }

  async createClonedVoice(insertVoice: InsertClonedVoice): Promise<ClonedVoice> {
    const results = await db.insert(clonedVoices).values(insertVoice).returning();
    return results[0];
  }

  async deleteClonedVoice(id: string): Promise<boolean> {
    const result = await db.delete(clonedVoices).where(eq(clonedVoices.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateClonedVoiceStatus(id: string, status: string): Promise<void> {
    const result = await db.update(clonedVoices)
      .set({ status })
      .where(eq(clonedVoices.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Cloned voice ${id} not found - unable to update status`);
    }
  }

  async getAgentFlow(id: string): Promise<AgentFlow | undefined> {
    const results = await db.select().from(agentFlows).where(eq(agentFlows.id, id)).limit(1);
    return results[0];
  }

  async getAllAgentFlows(apiKeyId: string): Promise<AgentFlow[]> {
    return await db.select().from(agentFlows).where(eq(agentFlows.apiKeyId, apiKeyId));
  }

  async createAgentFlow(insertFlow: InsertAgentFlow): Promise<AgentFlow> {
    const results = await db.insert(agentFlows).values(insertFlow).returning();
    return results[0];
  }

  async updateAgentFlow(id: string, data: Partial<Omit<AgentFlow, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<AgentFlow | undefined> {
    const result = await db.update(agentFlows)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentFlows.id, id))
      .returning();
    
    return result[0];
  }

  async deleteAgentFlow(id: string): Promise<boolean> {
    const result = await db.delete(agentFlows).where(eq(agentFlows.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFlowNode(id: string): Promise<FlowNode | undefined> {
    const results = await db.select().from(flowNodes).where(eq(flowNodes.id, id)).limit(1);
    return results[0];
  }

  async getAllFlowNodes(flowId: string): Promise<FlowNode[]> {
    return await db.select().from(flowNodes).where(eq(flowNodes.flowId, flowId));
  }

  async createFlowNode(insertNode: InsertFlowNode): Promise<FlowNode> {
    const results = await db.insert(flowNodes).values(insertNode).returning();
    return results[0];
  }

  async updateFlowNode(id: string, data: Partial<Omit<FlowNode, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowNode | undefined> {
    const result = await db.update(flowNodes)
      .set(data)
      .where(eq(flowNodes.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFlowNode(id: string): Promise<boolean> {
    const result = await db.delete(flowNodes).where(eq(flowNodes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFlowEdge(id: string): Promise<FlowEdge | undefined> {
    const results = await db.select().from(flowEdges).where(eq(flowEdges.id, id)).limit(1);
    return results[0];
  }

  async getAllFlowEdges(flowId: string): Promise<FlowEdge[]> {
    return await db.select().from(flowEdges).where(eq(flowEdges.flowId, flowId));
  }

  async createFlowEdge(insertEdge: InsertFlowEdge): Promise<FlowEdge> {
    const results = await db.insert(flowEdges).values(insertEdge).returning();
    return results[0];
  }

  async updateFlowEdge(id: string, data: Partial<Omit<FlowEdge, 'id' | 'flowId' | 'createdAt'>>): Promise<FlowEdge | undefined> {
    const result = await db.update(flowEdges)
      .set(data)
      .where(eq(flowEdges.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFlowEdge(id: string): Promise<boolean> {
    const result = await db.delete(flowEdges).where(eq(flowEdges.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Telephony Providers
  async getTelephonyProvider(id: string): Promise<TelephonyProvider | undefined> {
    const results = await db.select().from(telephonyProviders).where(eq(telephonyProviders.id, id)).limit(1);
    return results[0];
  }

  async getAllTelephonyProviders(apiKeyId: string): Promise<TelephonyProvider[]> {
    return await db.select().from(telephonyProviders).where(eq(telephonyProviders.apiKeyId, apiKeyId));
  }

  async getActiveTelephonyProvider(apiKeyId: string): Promise<TelephonyProvider | undefined> {
    const results = await db.select().from(telephonyProviders)
      .where(and(
        eq(telephonyProviders.apiKeyId, apiKeyId),
        eq(telephonyProviders.active, true)
      ))
      .limit(1);
    return results[0];
  }

  async createTelephonyProvider(insertProvider: InsertTelephonyProvider): Promise<TelephonyProvider> {
    const results = await db.insert(telephonyProviders).values(insertProvider).returning();
    return results[0];
  }

  async updateTelephonyProvider(id: string, data: Partial<Omit<TelephonyProvider, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<TelephonyProvider | undefined> {
    const result = await db.update(telephonyProviders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(telephonyProviders.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTelephonyProvider(id: string): Promise<boolean> {
    const result = await db.delete(telephonyProviders).where(eq(telephonyProviders.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Phone Numbers
  async getPhoneNumber(id: string): Promise<PhoneNumber | undefined> {
    const results = await db.select().from(phoneNumbers).where(eq(phoneNumbers.id, id)).limit(1);
    return results[0];
  }

  async getAllPhoneNumbers(providerId: string): Promise<PhoneNumber[]> {
    return await db.select().from(phoneNumbers).where(eq(phoneNumbers.providerId, providerId));
  }

  async getPhoneNumberByNumber(phoneNumberStr: string): Promise<PhoneNumber | undefined> {
    const results = await db.select().from(phoneNumbers).where(eq(phoneNumbers.phoneNumber, phoneNumberStr)).limit(1);
    return results[0];
  }

  async createPhoneNumber(insertPhoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const results = await db.insert(phoneNumbers).values(insertPhoneNumber).returning();
    return results[0];
  }

  async updatePhoneNumber(id: string, data: Partial<Omit<PhoneNumber, 'id' | 'providerId' | 'purchasedAt'>>): Promise<PhoneNumber | undefined> {
    const result = await db.update(phoneNumbers)
      .set(data)
      .where(eq(phoneNumbers.id, id))
      .returning();
    
    return result[0];
  }

  async deletePhoneNumber(id: string): Promise<boolean> {
    const result = await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Calls
  async getCall(id: string): Promise<Call | undefined> {
    const results = await db.select().from(calls).where(eq(calls.id, id)).limit(1);
    return results[0];
  }

  async getAllCalls(providerId: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.providerId, providerId));
  }

  async getCallsByApiKey(apiKeyId: string): Promise<Call[]> {
    // Join calls with telephony providers to filter by API key
    const results = await db
      .select({ call: calls })
      .from(calls)
      .innerJoin(telephonyProviders, eq(calls.providerId, telephonyProviders.id))
      .where(eq(telephonyProviders.apiKeyId, apiKeyId));
    
    return results.map(r => r.call);
  }

  async getCallsByCampaign(campaignId: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.campaignId, campaignId));
  }

  async createCall(insertCall: InsertCall): Promise<Call> {
    const results = await db.insert(calls).values(insertCall).returning();
    return results[0];
  }

  async updateCall(id: string, data: Partial<Omit<Call, 'id' | 'createdAt'>>): Promise<Call | undefined> {
    const result = await db.update(calls)
      .set(data)
      .where(eq(calls.id, id))
      .returning();
    
    return result[0];
  }

  // Calling Campaigns
  async getCallingCampaign(id: string): Promise<CallingCampaign | undefined> {
    const results = await db.select().from(callingCampaigns).where(eq(callingCampaigns.id, id)).limit(1);
    return results[0];
  }

  async getAllCallingCampaigns(apiKeyId: string): Promise<CallingCampaign[]> {
    return await db.select().from(callingCampaigns).where(eq(callingCampaigns.apiKeyId, apiKeyId));
  }

  async createCallingCampaign(insertCampaign: InsertCallingCampaign): Promise<CallingCampaign> {
    const results = await db.insert(callingCampaigns).values(insertCampaign).returning();
    return results[0];
  }

  async updateCallingCampaign(id: string, data: Partial<Omit<CallingCampaign, 'id' | 'apiKeyId' | 'createdAt'>>): Promise<CallingCampaign | undefined> {
    const result = await db.update(callingCampaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(callingCampaigns.id, id))
      .returning();
    
    return result[0];
  }

  async deleteCallingCampaign(id: string): Promise<boolean> {
    const result = await db.delete(callingCampaigns).where(eq(callingCampaigns.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementCampaignStats(id: string, field: 'completedCalls' | 'successfulCalls' | 'failedCalls'): Promise<void> {
    const fieldMap = {
      completedCalls: callingCampaigns.completedCalls,
      successfulCalls: callingCampaigns.successfulCalls,
      failedCalls: callingCampaigns.failedCalls,
    };
    
    const dbField = fieldMap[field];
    const result = await db.update(callingCampaigns)
      .set({ [field]: sql`${dbField} + 1`, updatedAt: new Date() })
      .where(eq(callingCampaigns.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Calling campaign ${id} not found - unable to increment ${field}`);
    }
  }
}

export const storage = new DbStorage();
