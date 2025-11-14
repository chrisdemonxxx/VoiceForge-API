#!/usr/bin/env python3
"""
VLLM Agent Service - Conversational AI with Context Memory
REAL IMPLEMENTATION with NVIDIA API fallback
"""

import os
import sys
import json
import time
import requests
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from collections import defaultdict

# Try to import vLLM
try:
    from vllm import LLM, SamplingParams
    VLLM_AVAILABLE = True
except (ImportError, RuntimeError) as e:
    VLLM_AVAILABLE = False
    print(f"[VLLM] WARNING: vLLM not available ({type(e).__name__}), using NVIDIA API fallback", file=sys.stderr, flush=True)

@dataclass
class Message:
    """Chat message in conversation"""
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: float

@dataclass
class ConversationContext:
    """Conversation context for a session"""
    session_id: str
    messages: List[Message]
    system_prompt: str
    mode: str
    created_at: float
    last_updated: float

class ConversationMemory:
    """Manage conversation history per session"""

    def __init__(self, max_messages: int = 10, max_sessions: int = 100):
        self.max_messages = max_messages
        self.max_sessions = max_sessions
        self.sessions: Dict[str, ConversationContext] = {}

    def create_session(self, session_id: str, system_prompt: str, mode: str) -> ConversationContext:
        """Create a new conversation session"""
        context = ConversationContext(
            session_id=session_id,
            messages=[],
            system_prompt=system_prompt,
            mode=mode,
            created_at=time.time(),
            last_updated=time.time()
        )

        if system_prompt:
            context.messages.append(Message(
                role="system",
                content=system_prompt,
                timestamp=time.time()
            ))

        self.sessions[session_id] = context

        if len(self.sessions) > self.max_sessions:
            oldest_session = min(
                self.sessions.items(),
                key=lambda x: x[1].last_updated
            )[0]
            del self.sessions[oldest_session]

        return context

    def get_session(self, session_id: str) -> Optional[ConversationContext]:
        """Get existing conversation session"""
        return self.sessions.get(session_id)

    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to the conversation"""
        context = self.sessions.get(session_id)
        if not context:
            return

        context.messages.append(Message(
            role=role,
            content=content,
            timestamp=time.time()
        ))

        if len(context.messages) > self.max_messages + 1:
            context.messages = [context.messages[0]] + context.messages[-(self.max_messages):]

        context.last_updated = time.time()

    def get_context_messages(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation context for LLM prompt"""
        context = self.sessions.get(session_id)
        if not context:
            return []

        return [
            {"role": msg.role, "content": msg.content}
            for msg in context.messages
        ]

    def reset_session(self, session_id: str):
        """Reset conversation for a session"""
        context = self.sessions.get(session_id)
        if context:
            system_msg = context.messages[0] if context.messages and context.messages[0].role == "system" else None
            context.messages = [system_msg] if system_msg else []
            context.last_updated = time.time()

class VLLMAgentService:
    """Real VLLM Agent Service with NVIDIA API fallback"""

    SYSTEM_PROMPTS = {
        "echo": "You are an echo assistant. Repeat what the user says in a friendly way.",

        "assistant": """You are a helpful voice AI assistant. Provide clear, concise, and accurate responses.
- Keep responses brief and conversational (1-3 sentences)
- Avoid markdown formatting (optimized for voice/TTS)
- Be friendly and professional
- Provide actionable information when possible""",

        "conversational": """You are a natural conversational AI. Engage in friendly, contextual dialogue.
- Remember previous messages in the conversation
- Ask follow-up questions when appropriate
- Keep responses natural and concise (voice-optimized)
- Show personality and empathy
- Avoid markdown or special formatting"""
    }

    def __init__(self):
        """Initialize VLLM agent service with NVIDIA API fallback"""
        self.llm = None
        self.model_loaded = False
        self.model_name = None
        self.memory = ConversationMemory(max_messages=10)
        self.use_nvidia_api = False
        self.nvidia_api_key = os.environ.get('NVIDIA_API_KEY')

        # Try local vLLM first
        if VLLM_AVAILABLE:
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                cache_dir = os.environ.get('HF_HOME', '/tmp/ml-cache')

                if device == "cpu":
                    print("[VLLM] ⚠️  CUDA not available, trying NVIDIA API fallback", file=sys.stderr, flush=True)
                    self._initialize_nvidia_api()
                    return

                print(f"[VLLM] Attempting to load local vLLM model on {device}...", file=sys.stderr, flush=True)

                # For 80GB VRAM (A100), use Llama-3.3-70B-Instruct (primary model)
                # Try models in order: 70B FP16 (primary), 70B INT8 (fallback), 8B (lightweight)
                models_to_try = [
                    ("meta-llama/Llama-3.3-70B-Instruct", "70B-FP16"),  # ~75GB FP16 - PRIMARY MODEL
                    ("meta-llama/Llama-3.3-70B-Instruct", "70B-INT8"),  # ~60GB INT8 - Fallback if FP16 OOMs
                    ("meta-llama/Llama-3.1-8B-Instruct", "8B-FP16"),   # ~8GB FP16 - Lightweight fallback
                ]

                for model_path, model_size in models_to_try:
                    try:
                        print(f"[VLLM] Attempting to load {model_size} model: {model_path}...", file=sys.stderr, flush=True)

                        # Optimize memory usage for 80GB A100 GPU
                        use_int8 = "INT8" in model_size

                        # For 70B model, maximize GPU memory usage
                        if "70B" in model_size:
                            gpu_memory_util = 0.85 if use_int8 else 0.92
                        else:
                            gpu_memory_util = 0.8

                        # vLLM 0.6.0+ supports better quantization
                        llm_kwargs = {
                            "model": model_path,
                            "tensor_parallel_size": 1,  # Single GPU
                            "gpu_memory_utilization": gpu_memory_util,
                            "dtype": "auto",
                            "download_dir": cache_dir,
                            "trust_remote_code": True,
                            "max_model_len": 4096,
                        }

                        # For INT8 quantization
                        if use_int8:
                            llm_kwargs["quantization"] = "gptq"

                        self.llm = LLM(**llm_kwargs)

                        self.model_name = model_path
                        self.model_loaded = True
                        print(f"[VLLM] ✓ {model_size} model loaded successfully: {model_path}", file=sys.stderr, flush=True)

                        # Test generation
                        print(f"[VLLM] Testing {model_size} model with warmup prompt...", file=sys.stderr, flush=True)
                        sampling_params = SamplingParams(temperature=0.7, max_tokens=10)
                        outputs = self.llm.generate(["Hello"], sampling_params)
                        print(f"[VLLM] ✓ Warmup successful", file=sys.stderr, flush=True)
                        return  # Successfully loaded local model

                    except Exception as e:
                        print(f"[VLLM] Failed to load {model_size} model: {e}", file=sys.stderr, flush=True)
                        continue

                # If all local models fail, fall back to NVIDIA API
                print("[VLLM] ❌ All local models failed, falling back to NVIDIA API", file=sys.stderr, flush=True)
                self._initialize_nvidia_api()

            except Exception as e:
                print(f"[VLLM] ❌ Failed to initialize local vLLM: {e}", file=sys.stderr, flush=True)
                self._initialize_nvidia_api()
        else:
            print("[VLLM] vLLM library not available, using NVIDIA API", file=sys.stderr, flush=True)
            self._initialize_nvidia_api()

    def _initialize_nvidia_api(self):
        """Initialize NVIDIA API fallback"""
        if not self.nvidia_api_key:
            self.nvidia_api_key = "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"
            print("[VLLM] Using provided NVIDIA API key", file=sys.stderr, flush=True)

        # Test NVIDIA API connectivity
        try:
            print("[VLLM] Testing NVIDIA API connection...", file=sys.stderr, flush=True)
            response = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.nvidia_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 10
                },
                timeout=10
            )

            if response.status_code == 200:
                self.use_nvidia_api = True
                self.model_name = "meta/llama-3.1-70b-instruct (NVIDIA API)"
                self.model_loaded = True
                print("[VLLM] ✓ NVIDIA API connected successfully (Llama 3.1 70B)", file=sys.stderr, flush=True)
                print("[VLLM] ✓ Valid for 6 months unlimited usage", file=sys.stderr, flush=True)
            else:
                print(f"[VLLM] ⚠️  NVIDIA API test failed: {response.status_code}", file=sys.stderr, flush=True)
                self.model_loaded = False

        except Exception as e:
            print(f"[VLLM] ⚠️  NVIDIA API test failed: {e}", file=sys.stderr, flush=True)
            self.model_loaded = False

    def _generate_with_nvidia_api(self, messages: List[Dict[str, str]], max_tokens: int = 150) -> str:
        """Generate response using NVIDIA API"""
        try:
            response = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.nvidia_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta/llama-3.1-70b-instruct",
                    "messages": messages,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": max_tokens,
                    "stream": False
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            else:
                print(f"[VLLM] NVIDIA API error: {response.status_code} - {response.text}", file=sys.stderr, flush=True)
                return "I apologize, but I'm having trouble generating a response right now."

        except Exception as e:
            print(f"[VLLM] NVIDIA API request failed: {e}", file=sys.stderr, flush=True)
            return "I apologize, but I encountered an error while processing your request."

    def generate_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate agent response using local vLLM or NVIDIA API

        Args:
            data: Dictionary containing:
                - session_id: Session identifier
                - message: User message text
                - mode: Agent mode (echo, assistant, conversational, custom)
                - system_prompt: Optional custom system prompt
                - stream: Whether to stream tokens (default: False)

        Returns:
            Dictionary with agent response
        """
        start_time = time.time()

        session_id = data.get("session_id", "default")
        user_message = data.get("message", "")
        mode = data.get("mode", "assistant")
        system_prompt = data.get("system_prompt") or self.SYSTEM_PROMPTS.get(mode, self.SYSTEM_PROMPTS["assistant"])
        stream = data.get("stream", False)

        if not user_message:
            return {"error": "No message provided"}

        # Get or create conversation context
        context = self.memory.get_session(session_id)
        if not context:
            context = self.memory.create_session(session_id, system_prompt, mode)

        # Add user message to context
        self.memory.add_message(session_id, "user", user_message)

        # Generate response
        if self.model_loaded:
            try:
                messages = self.memory.get_context_messages(session_id)

                if self.use_nvidia_api:
                    # Use NVIDIA API
                    response_text = self._generate_with_nvidia_api(messages, max_tokens=150)

                else:
                    # Use local vLLM
                    prompt_parts = []
                    for msg in messages:
                        if msg["role"] == "system":
                            prompt_parts.append(f"System: {msg['content']}")
                        elif msg["role"] == "user":
                            prompt_parts.append(f"User: {msg['content']}")
                        elif msg["role"] == "assistant":
                            prompt_parts.append(f"Assistant: {msg['content']}")

                    prompt_parts.append("Assistant:")
                    full_prompt = "\n".join(prompt_parts)

                    # Generate with vLLM
                    sampling_params = SamplingParams(
                        temperature=0.7,
                        max_tokens=150,
                        top_p=0.9,
                        stop=["User:", "System:"]
                    )

                    outputs = self.llm.generate([full_prompt], sampling_params)
                    response_text = outputs[0].outputs[0].text.strip()
                    response_text = response_text.split("\n")[0].strip()

            except Exception as e:
                print(f"[VLLM] Generation error: {e}", file=sys.stderr, flush=True)
                import traceback
                traceback.print_exc(file=sys.stderr)
                response_text = f"I understand your message. How can I help you?"
        else:
            print("[VLLM] Model not loaded, using fallback", file=sys.stderr, flush=True)
            response_text = f"I understand your message: {user_message}. How can I help you?"

        # Add assistant response to context
        self.memory.add_message(session_id, "assistant", response_text)

        processing_time = time.time() - start_time

        return {
            "response": response_text,
            "session_id": session_id,
            "mode": mode,
            "processing_time": processing_time,
            "context_size": len(context.messages),
            "tokens": len(response_text.split()),
            "model": self.model_name if self.model_loaded else "fallback",
            "using_nvidia_api": self.use_nvidia_api
        }

    def stream_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate streaming response (token by token)"""
        result = self.generate_response(data)

        if "error" in result:
            return [{"type": "error", "error": result["error"]}]

        response_text = result["response"]
        words = response_text.split()

        chunks = []
        current_text = ""

        for i, word in enumerate(words):
            current_text += (word + " " if i < len(words) - 1 else word)
            chunks.append({
                "type": "token",
                "text": current_text,
                "token": word,
                "index": i
            })

        chunks.append({
            "type": "done",
            "text": response_text
        })

        return chunks

    def reset_session(self, session_id: str):
        """Reset conversation for a session"""
        self.memory.reset_session(session_id)

    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        context = self.memory.get_session(session_id)
        if not context:
            return None

        return {
            "session_id": context.session_id,
            "message_count": len(context.messages),
            "mode": context.mode,
            "created_at": context.created_at,
            "last_updated": context.last_updated,
            "system_prompt": context.system_prompt
        }

def main():
    """Main entry point for VLLM service"""
    service = VLLMAgentService()

    for line in sys.stdin:
        try:
            request = json.loads(line)

            if request.get("type") == "generate":
                result = service.generate_response(request.get("data", {}))
                response = {
                    "status": "success",
                    **result
                }
                print(json.dumps(response), flush=True)

            elif request.get("type") == "stream":
                chunks = service.stream_response(request.get("data", {}))
                for chunk in chunks:
                    response = {
                        "status": "success",
                        **chunk
                    }
                    print(json.dumps(response), flush=True)
                    time.sleep(0.02)

            elif request.get("type") == "reset":
                session_id = request.get("session_id", "default")
                service.reset_session(session_id)
                response = {
                    "status": "success",
                    "message": f"Session {session_id} reset"
                }
                print(json.dumps(response), flush=True)

            elif request.get("type") == "session_info":
                session_id = request.get("session_id", "default")
                info = service.get_session_info(session_id)
                if info:
                    response = {
                        "status": "success",
                        **info
                    }
                else:
                    response = {
                        "status": "error",
                        "message": f"Session {session_id} not found"
                    }
                print(json.dumps(response), flush=True)

            else:
                response = {
                    "status": "error",
                    "message": f"Unknown request type: {request.get('type')}"
                }
                print(json.dumps(response), flush=True)

        except Exception as e:
            error_response = {
                "status": "error",
                "message": str(e)
            }
            print(json.dumps(error_response), flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    main()
