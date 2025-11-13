#!/usr/bin/env python3
"""
VLLM Agent Service - Conversational AI with Context Memory

Simulates Llama 3.3 / Qwen 2.5 conversational AI with:
- Session-based conversation history
- Contextual response generation
- Token streaming for real-time display
- Multiple agent modes (echo, assistant, conversational)
- System prompt and personality configuration
- Realistic thinking time (100-200ms)

Agent Modes:
- echo: Simple echo response (minimal processing)
- assistant: Helpful AI assistant with structured responses
- conversational: Natural dialogue with context memory
- custom: User-defined personality via system prompt

Context Window: Last 10 messages per session
Latency Target: 100-200ms total processing time

Note: Placeholder implementation. In production:
1. Install vLLM: pip install vllm
2. Load Llama-3.3-70B-Instruct or Qwen2.5-72B-Instruct on GPU
3. Implement real token streaming
4. Add proper context management and retrieval
"""

import sys
import json
import time
import random
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from collections import defaultdict
import re


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
    """
    Manage conversation history per session
    
    Features:
    - Session-based message history
    - Context window limiting (last N messages)
    - Automatic cleanup of old sessions
    - Topic continuity tracking
    """
    
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
        
        # Add system prompt as first message
        if system_prompt:
            context.messages.append(Message(
                role="system",
                content=system_prompt,
                timestamp=time.time()
            ))
        
        self.sessions[session_id] = context
        
        # Cleanup old sessions if limit exceeded
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
        
        # Limit context window (keep system prompt + last N messages)
        if len(context.messages) > self.max_messages + 1:  # +1 for system prompt
            # Keep system prompt (first message) + recent messages
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
            # Keep system prompt, clear other messages
            system_msg = context.messages[0] if context.messages and context.messages[0].role == "system" else None
            context.messages = [system_msg] if system_msg else []
            context.last_updated = time.time()


class VLLMAgentService:
    """
    VLLM Agent Service with conversational AI capabilities
    
    Simulates realistic LLM behavior:
    - Context-aware responses
    - Multiple agent personalities
    - Token streaming
    - Realistic latency (100-200ms)
    """
    
    # Predefined system prompts for different modes
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
    
    # Response templates for different modes
    RESPONSE_TEMPLATES = {
        "assistant": [
            "Sure, {topic}. Here's what I can tell you: {info}",
            "Let me help you with {topic}. {info}",
            "Great question about {topic}! {info}",
            "I understand you're interested in {topic}. {info}",
        ],
        "conversational": [
            "Oh, {topic}! {info} What else would you like to know?",
            "That's interesting! {info} Have you tried {suggestion}?",
            "{info} It reminds me of something similar you mentioned earlier.",
            "I see what you mean. {info} How does that sound to you?",
        ]
    }
    
    def __init__(self):
        """Initialize VLLM agent service"""
        # In production:
        # from vllm import LLM, SamplingParams
        # self.llm = LLM(
        #     model="meta-llama/Llama-3.3-70B-Instruct",
        #     tensor_parallel_size=4,
        #     gpu_memory_utilization=0.9
        # )
        
        self.memory = ConversationMemory(max_messages=10)
        self.topic_keywords = self._load_topic_keywords()
        
        print("[VLLM] Agent service initialized (simulation mode)", file=sys.stderr, flush=True)
    
    def _load_topic_keywords(self) -> Dict[str, List[str]]:
        """Load topic keywords for contextual responses"""
        return {
            "greeting": ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"],
            "tech": ["computer", "software", "programming", "code", "ai", "technology", "algorithm"],
            "help": ["help", "assist", "support", "guide", "explain", "show me", "how to"],
            "weather": ["weather", "temperature", "rain", "sunny", "forecast", "climate"],
            "time": ["time", "date", "when", "schedule", "calendar", "day"],
            "general": ["what", "why", "how", "where", "who", "which", "tell me"],
        }
    
    def _detect_topic(self, text: str) -> str:
        """Detect conversation topic from user message"""
        text_lower = text.lower()
        
        for topic, keywords in self.topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return topic
        
        return "general"
    
    def _generate_contextual_response(
        self,
        user_message: str,
        context: ConversationContext
    ) -> str:
        """Generate contextual response based on conversation history"""
        mode = context.mode
        
        # Echo mode: simple echo
        if mode == "echo":
            return f"You said: {user_message}"
        
        # Detect topic
        topic = self._detect_topic(user_message)
        
        # Generate response based on mode and context
        if mode == "assistant":
            responses = {
                "greeting": f"Hello! I'm here to help. How can I assist you today?",
                "tech": f"I'd be happy to discuss technology with you. {user_message} is an interesting topic. What specific aspect would you like to know more about?",
                "help": f"I'm here to help! Based on your question about {user_message.lower()}, I can provide guidance. What would you like to know specifically?",
                "weather": f"I don't have real-time weather data, but I can discuss weather-related topics. What would you like to know?",
                "time": f"I don't have access to real-time information, but I can help with time-related questions. What do you need to know?",
                "general": f"That's an interesting question. Let me think about {user_message.lower()}. Could you provide more context?",
            }
            return responses.get(topic, f"I understand you're asking about {user_message.lower()}. How can I help you with this?")
        
        elif mode == "conversational":
            # Check conversation history for context
            recent_topics = []
            for msg in context.messages[-3:]:
                if msg.role == "user":
                    recent_topics.append(self._detect_topic(msg.content))
            
            # Generate more contextual, conversational responses
            if topic == "greeting":
                if len(context.messages) <= 2:
                    return "Hey! Great to chat with you. What's on your mind today?"
                else:
                    return "Good to hear from you again! What would you like to talk about?"
            
            elif topic == "tech":
                if "tech" in recent_topics:
                    return f"I love how you're diving deeper into {user_message.lower()}! The way technology evolves is fascinating. What specific part interests you most?"
                else:
                    return f"Oh, tech talk! {user_message} is such a cool area. I find it really interesting how it impacts our daily lives. Want to explore this further?"
            
            elif topic == "help":
                return f"Of course, I'd love to help! From what you're asking about {user_message.lower()}, it sounds like you're looking for some guidance. What's the main challenge you're facing?"
            
            else:
                # Generate dynamic response with context
                context_hint = ""
                if len(context.messages) > 3:
                    context_hint = "Building on what we discussed, "
                
                return f"{context_hint}I hear you on {user_message.lower()}. It's quite an interesting point. How do you feel about it?"
        
        else:
            # Custom mode or fallback
            return f"I understand your message: {user_message}. How can I respond to help you best?"
    
    def _simulate_thinking_time(self):
        """Simulate realistic model thinking time (100-200ms)"""
        thinking_time = random.uniform(0.1, 0.2)
        time.sleep(thinking_time)
    
    def generate_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate agent response for user message
        
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
            return {
                "error": "No message provided"
            }
        
        # Get or create conversation context
        context = self.memory.get_session(session_id)
        if not context:
            context = self.memory.create_session(session_id, system_prompt, mode)
        
        # Add user message to context
        self.memory.add_message(session_id, "user", user_message)
        
        # Simulate thinking time
        self._simulate_thinking_time()
        
        # Generate response based on context
        response_text = self._generate_contextual_response(user_message, context)
        
        # Add assistant response to context
        self.memory.add_message(session_id, "assistant", response_text)
        
        processing_time = time.time() - start_time
        
        return {
            "response": response_text,
            "session_id": session_id,
            "mode": mode,
            "processing_time": processing_time,
            "context_size": len(context.messages),
            "tokens": len(response_text.split()),  # Approximate token count
        }
    
    def stream_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate streaming response (token by token)
        
        Args:
            data: Same as generate_response
        
        Returns:
            List of token chunks for streaming
        """
        # Generate complete response first
        result = self.generate_response(data)
        
        if "error" in result:
            return [{"type": "error", "error": result["error"]}]
        
        # Split response into tokens and stream
        response_text = result["response"]
        words = response_text.split()
        
        chunks = []
        current_text = ""
        
        for i, word in enumerate(words):
            current_text += (word + " " if i < len(words) - 1 else word)
            
            chunks.append({
                "type": "token",
                "token": word,
                "text": current_text.strip(),
                "sequence": i,
                "done": i == len(words) - 1,
                "latency_ms": random.uniform(10, 30)  # Simulate per-token latency
            })
        
        # Add final chunk with metadata
        chunks.append({
            "type": "complete",
            "text": response_text,
            "session_id": result["session_id"],
            "mode": result["mode"],
            "processing_time": result["processing_time"],
            "context_size": result["context_size"],
            "tokens": result["tokens"]
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
            "mode": context.mode,
            "message_count": len(context.messages),
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
                # Generate single response
                result = service.generate_response(request.get("data", {}))
                response = {
                    "status": "success",
                    **result
                }
                print(json.dumps(response), flush=True)
            
            elif request.get("type") == "stream":
                # Stream tokens
                chunks = service.stream_response(request.get("data", {}))
                for chunk in chunks:
                    response = {
                        "status": "success",
                        **chunk
                    }
                    print(json.dumps(response), flush=True)
                    time.sleep(0.02)  # Simulate streaming delay
            
            elif request.get("type") == "reset":
                # Reset session
                session_id = request.get("session_id", "default")
                service.reset_session(session_id)
                response = {
                    "status": "success",
                    "message": f"Session {session_id} reset"
                }
                print(json.dumps(response), flush=True)
            
            elif request.get("type") == "session_info":
                # Get session info
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
                        "error": f"Session {session_id} not found"
                    }
                print(json.dumps(response), flush=True)
            
            else:
                response = {
                    "status": "error",
                    "error": f"Unknown request type: {request.get('type')}"
                }
                print(json.dumps(response), flush=True)
        
        except Exception as e:
            error_response = {
                "status": "error",
                "error": str(e)
            }
            print(json.dumps(error_response), flush=True)
            import traceback
            traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()
