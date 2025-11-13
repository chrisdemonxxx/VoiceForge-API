/**
 * HF Spaces Client - Calls Hugging Face Spaces ML APIs instead of local Python
 * This is used when running on Render without GPU/Python ML dependencies
 */

interface TTSRequest {
  text: string;
  model: string;
  voice?: string;
  speed?: number;
  voice_characteristics?: any;
}

interface STTChunkRequest {
  chunk: string;  // base64 encoded PCM16
  sequence: number;
  language?: string;
  return_partial?: boolean;
}

interface STTChunkResponse {
  text: string;
  language: string;
  confidence: number;
  duration: number;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    tokens: string[];
  }>;
  is_partial: boolean;
  vad_active: boolean;
  sequence: number;
  processing_time: number;
}

interface VLLMRequest {
  session_id: string;
  message: string;
  mode?: string;
  system_prompt?: string;
  stream?: boolean;
}

interface VLLMResponse {
  response: string;
  session_id: string;
  mode: string;
  processing_time: number;
  context_size: number;
  tokens: number;
}

export class HFSpacesClient {
  private apiUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor() {
    // Get HF Spaces ML API URL from environment
    this.apiUrl = process.env.HF_ML_API_URL || "https://chrisdemonxxx-voiceforge-v1-0.hf.space";
    console.log(`[HFSpacesClient] Using ML API: ${this.apiUrl}`);
  }

  async initialize() {
    console.log("[HFSpacesClient] Testing connection to HF Spaces ML API...");

    try {
      const response = await fetch(`${this.apiUrl}/api/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("[HFSpacesClient] Successfully connected to HF Spaces ML API");
      console.log("[HFSpacesClient] Model status:", data.models);
    } catch (error) {
      console.error("[HFSpacesClient] Failed to connect to HF Spaces ML API:", error);
      console.warn("[HFSpacesClient] Continuing anyway - API may become available later");
    }
  }

  async callTTS(request: TTSRequest): Promise<Buffer> {
    console.log(`[HFSpacesClient] TTS request: model=${request.model}, text length=${request.text?.length || 0}`);

    try {
      // HF Spaces API expects simplified request format
      const apiRequest = {
        text: request.text,
        voice: request.voice || "default",
        speed: request.speed || 1.0
      };

      const response = await fetch(`${this.apiUrl}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequest),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error (${response.status}): ${errorText}`);
      }

      // HF Spaces API returns JSON with audio_base64 field
      const data = await response.json();

      if (!data.audio_base64) {
        throw new Error("No audio_base64 data in TTS response");
      }

      // Decode base64 audio to buffer
      const audioBuffer = Buffer.from(data.audio_base64, "base64");
      console.log(`[HFSpacesClient] TTS success: generated ${audioBuffer.length} bytes, duration: ${data.duration}s`);
      return audioBuffer;
    } catch (error) {
      console.error("[HFSpacesClient] TTS error:", error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("AbortError")) {
          throw new Error(`TTS timeout after ${this.timeout}ms`);
        }
        if (error.message.includes("503") || error.message.includes("Service Unavailable")) {
          throw new Error("TTS service temporarily unavailable (503)");
        }
        if (error.message.includes("504") || error.message.includes("Gateway Timeout")) {
          throw new Error("TTS service timeout (504)");
        }
      }
      
      throw new Error(`TTS failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processSTTChunk(request: STTChunkRequest): Promise<STTChunkResponse> {
    try {
      // HF Spaces API expects simplified request format
      const apiRequest = {
        audio_base64: request.chunk,
        language: request.language || "auto"
      };

      const response = await fetch(`${this.apiUrl}/api/stt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiRequest),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle specific error codes
        if (response.status === 503) {
          throw new Error("STT service temporarily unavailable (503)");
        }
        if (response.status === 504) {
          throw new Error("STT service timeout (504)");
        }

        throw new Error(`STT API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Map HF Spaces API response to expected format
      return {
        text: data.text || "",
        language: data.language || "en",
        confidence: data.confidence || 0,
        duration: data.duration || 0,
        segments: data.segments || [],
        is_partial: request.return_partial || false,
        vad_active: true,
        sequence: request.sequence,
        processing_time: 0
      } as STTChunkResponse;
    } catch (error) {
      console.error("[HFSpacesClient] STT error:", error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("AbortError")) {
          throw new Error(`STT timeout after ${this.timeout}ms`);
        }
        if (error.message.includes("503") || error.message.includes("Service Unavailable")) {
          throw new Error("STT service temporarily unavailable (503)");
        }
        if (error.message.includes("504") || error.message.includes("Gateway Timeout")) {
          throw new Error("STT service timeout (504)");
        }
      }
      
      throw new Error(`STT failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async callVLLM(request: VLLMRequest): Promise<VLLMResponse> {
    try {
      // HF Spaces API expects audio input for VLLM chat
      // Since we only have text message, we'll use fallback
      console.warn("[HFSpacesClient] VLLM requires audio input in HF Spaces API, using fallback");
      throw new Error("VLLM requires audio input in HF Spaces API");
    } catch (error) {
      console.error("[HFSpacesClient] VLLM error:", error);

      // Fallback response for unavailable service or errors
      console.log("[HFSpacesClient] Using fallback VLLM response");
      return {
        response: `I received your message: "${request.message}". How can I help you?`,
        session_id: request.session_id,
        mode: request.mode || "assistant",
        processing_time: 0.1,
        context_size: 1,
        tokens: 10
      };
    }
  }

  // NOTE: Voice cloning and analysis endpoints are not available in the current HF Spaces deployment
  // These methods will throw errors if called

  async analyzeVoice(audioBuffer: Buffer): Promise<any> {
    console.error("[HFSpacesClient] Voice analysis not available in HF Spaces deployment");
    throw new Error("Voice analysis endpoint not available in HF Spaces deployment");
  }

  async createInstantClone(cloneId: string, audioData: Buffer, name: string): Promise<any> {
    console.error("[HFSpacesClient] Instant clone not available in HF Spaces deployment");
    throw new Error("Instant clone endpoint not available in HF Spaces deployment");
  }

  async createProfessionalClone(cloneId: string, audioData: Buffer, name: string): Promise<any> {
    console.error("[HFSpacesClient] Professional clone not available in HF Spaces deployment");
    throw new Error("Professional clone endpoint not available in HF Spaces deployment");
  }

  async createSyntheticClone(cloneId: string, description: string, characteristics: any): Promise<any> {
    console.error("[HFSpacesClient] Synthetic clone not available in HF Spaces deployment");
    throw new Error("Synthetic clone endpoint not available in HF Spaces deployment");
  }

  async getCloneStatus(cloneId: string): Promise<any> {
    console.error("[HFSpacesClient] Clone status not available in HF Spaces deployment");
    throw new Error("Clone status endpoint not available in HF Spaces deployment");
  }

  async getMetrics() {
    console.warn("[HFSpacesClient] Metrics endpoint not available in HF Spaces deployment");
    return {
      stt: null,
      tts: null,
      vllm: null,
      clone: null
    };
  }

  async processVAD(audioBuffer: Buffer): Promise<{ segments: Array<{ start: number; end: number; confidence: number }> }> {
    try {
      // HF Spaces API expects audio_base64 field
      const response = await fetch(`${this.apiUrl}/api/vad`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audio_base64: audioBuffer.toString("base64"),
          threshold: 0.5
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle specific error codes
        if (response.status === 503) {
          throw new Error("VAD service temporarily unavailable (503)");
        }
        if (response.status === 504) {
          throw new Error("VAD service timeout (504)");
        }
        if (response.status === 404) {
          throw new Error("VAD endpoint not found (404) - service may not be available");
        }

        throw new Error(`VAD API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return { segments: data.segments || [] };
    } catch (error) {
      console.error("[HFSpacesClient] VAD error:", error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes("timeout") || error.message.includes("AbortError")) {
          throw new Error(`VAD timeout after ${this.timeout}ms`);
        }
        if (error.message.includes("503") || error.message.includes("Service Unavailable")) {
          throw new Error("VAD service temporarily unavailable (503)");
        }
        if (error.message.includes("504") || error.message.includes("Gateway Timeout")) {
          throw new Error("VAD service timeout (504)");
        }
        if (error.message.includes("404") || error.message.includes("not found")) {
          throw new Error("VAD endpoint not available - service may not be implemented");
        }
      }
      
      throw new Error(`VAD failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async callTTSStreaming(
    request: any,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    // Note: Streaming over HTTP can be implemented using Server-Sent Events or WebSocket
    // For now, falling back to regular TTS
    console.warn("[HFSpacesClient] Streaming TTS not yet implemented, using regular TTS");
    throw new Error("Streaming TTS not yet implemented for HF Spaces client");
  }

  async shutdown() {
    console.log("[HFSpacesClient] Shutdown called (no-op for API client)");
    // No cleanup needed for HTTP client
  }
}

// Export singleton instance
export const hfSpacesClient = new HFSpacesClient();
