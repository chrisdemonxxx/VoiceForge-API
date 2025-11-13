import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GeneratedFlow {
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: "subagent" | "tool" | "agent_transfer" | "phone_transfer" | "end_call";
    position: { x: number; y: number };
    data: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

export async function generateAgentFlow(description: string): Promise<GeneratedFlow> {
  const systemPrompt = `You are an expert AI agent flow designer. Your task is to convert natural language descriptions into structured agent flows for conversational AI systems.

An agent flow consists of:
1. **Subagent nodes**: Modify agent behavior at specific conversation points (systemPrompt, tools, turnEagerness, timeout)
2. **Tool nodes**: Execute specific actions (toolName, parameters, onSuccess, onFailure)
3. **Agent Transfer nodes**: Hand off to different AI agents (targetAgentId, context)
4. **Phone Transfer nodes**: Transfer to human agents via phone (phoneNumber, message)
5. **End Call nodes**: Terminate conversation (message, saveTranscript)

Design principles:
- Start with a subagent node for initial greeting/routing
- Use tool nodes for actions (lookups, API calls, data updates)
- Use agent transfer for specialized skills (sales, support, billing)
- Use phone transfer for complex issues requiring humans
- End with an end_call node
- Connect nodes logically with edges
- Position nodes in a readable left-to-right flow (x: 0, 250, 500, 750; y varies by branch)

Return ONLY valid JSON matching this structure:
{
  "name": "Flow name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node-1",
      "type": "subagent",
      "position": {"x": 0, "y": 200},
      "data": {
        "systemPrompt": "You are...",
        "tools": ["tool1", "tool2"],
        "turnEagerness": 0.7,
        "timeout": 10
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "label": "Success"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create an agent flow for: ${description}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                     content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from AI response");
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const flow = JSON.parse(jsonStr) as GeneratedFlow;

    // Validate basic structure
    if (!flow.name || !flow.nodes || !flow.edges) {
      throw new Error("Invalid flow structure");
    }

    return flow;
  } catch (error: any) {
    console.error("[AI Flow Generator] Error:", error);
    throw new Error(`Failed to generate agent flow: ${error.message}`);
  }
}

export async function enhanceFlowDescription(userInput: string): Promise<string> {
  // Use AI to expand a short description into a more detailed one
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that expands brief agent flow descriptions into detailed, actionable specifications. Keep it concise but comprehensive."
        },
        {
          role: "user",
          content: `Expand this into a detailed agent flow description: "${userInput}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return completion.choices[0].message.content || userInput;
  } catch (error) {
    console.error("[AI Flow Generator] Enhancement error:", error);
    return userInput; // Fallback to original
  }
}
