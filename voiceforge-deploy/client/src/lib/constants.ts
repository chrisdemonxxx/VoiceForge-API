import type { ModelInfo } from "@shared/schema";

export const MODEL_INFO: Record<string, ModelInfo> = {
  "indic-parler-tts": {
    id: "indic-parler-tts",
    name: "Indic Parler TTS",
    description: "AI4Bharat's multilingual TTS for 21 Indian languages with 69 unique voices",
    parameters: "630M",
    languages: ["Hindi", "Tamil", "Telugu", "Malayalam", "Bengali", "Urdu", "Assamese", "Bodo", "Dogri", "Gujarati", "Kannada", "Konkani", "Maithili", "Manipuri", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali", "Sindhi", "English"],
    features: [
      "69 unique Indian voices",
      "Emotion rendering in 10 languages",
      "Controllable pitch, speed, and style",
      "Prompt-based voice control",
    ],
    speed: "Fast",
    quality: 5,
    voiceCloning: false,
    emotionalRange: "excellent",
  },
  chatterbox: {
    id: "chatterbox",
    name: "Chatterbox",
    description: "Most realistic TTS - beats ElevenLabs in 63.75% of blind tests",
    parameters: "500M",
    languages: ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Polish", "Turkish", "Russian", "Dutch", "Czech", "Arabic", "Chinese", "Japanese", "Korean", "Hindi", "Bengali", "Telugu", "Tamil", "Marathi", "Vietnamese", "Thai", "Javanese"],
    features: [
      "Zero-shot voice cloning (5-sec sample)",
      "Emotion exaggeration control",
      "Sub-200ms latency",
      "Neural watermarking built-in",
    ],
    speed: "~200ms TTFB",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
  higgs_audio_v2: {
    id: "higgs_audio_v2",
    name: "Higgs Audio V2",
    description: "Industry-leading emotional expressiveness for audio dramas and podcasts",
    parameters: "3B (Llama base)",
    languages: ["English", "Chinese", "Spanish", "French", "German", "Japanese", "Korean", "Russian"],
    features: [
      "Best emotional expressiveness",
      "24 kHz high-quality output",
      "Multi-speaker dialogue support",
      "Zero-shot emotion control",
    ],
    speed: "Fast",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
  styletts2: {
    id: "styletts2",
    name: "StyleTTS2",
    description: "Surpasses human recordings on benchmarks - English-only premium quality",
    parameters: "~100M",
    languages: ["English"],
    features: [
      "Human-level speech quality",
      "Life-like prosody and intonation",
      "Zero-shot voice cloning (5-10s)",
      "95× real-time on RTX 4090",
    ],
    speed: "95× real-time",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
};

// Re-export Voice Library from shared module
export type { Voice } from "@shared/voices";
export { VOICE_LIBRARY } from "@shared/voices";

export const API_EXAMPLES = {
  curl: `curl -X POST https://api.voiceforge.ai/v1/tts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, this is a test of the VoiceForge API",
    "model": "chatterbox",
    "format": "mp3",
    "speed": 1.0
  }'`,
  
  python: `from voiceforge import VoiceForgeClient

client = VoiceForgeClient(api_key="YOUR_API_KEY")

# Generate speech
audio = client.tts(
    text="Hello, this is a test of the VoiceForge API",
    model="chatterbox",
    format="mp3",
    speed=1.0
)

# Save to file
audio.save("output.mp3")`,
  
  javascript: `import { VoiceForgeClient } from 'voiceforge-js';

const client = new VoiceForgeClient({
  apiKey: 'YOUR_API_KEY'
});

// Generate speech
const audio = await client.tts({
  text: 'Hello, this is a test of the VoiceForge API',
  model: 'chatterbox',
  format: 'mp3',
  speed: 1.0
});

// Play or download
audio.play();`,
};

export const FEATURES = [
  {
    icon: "Mic2",
    title: "Real-time TTS",
    description: "Three state-of-the-art models with sub-200ms latency for natural-sounding speech synthesis",
  },
  {
    icon: "User",
    title: "Voice Cloning",
    description: "Clone any voice with just 5 seconds of reference audio using Chatterbox or Higgs Audio",
  },
  {
    icon: "Languages",
    title: "Multi-language STT",
    description: "Whisper-large-v3-turbo for accurate speech recognition in 99+ languages",
  },
  {
    icon: "Volume2",
    title: "Voice Activity Detection",
    description: "Silero VAD for precise speech segment detection in real-time audio streams",
  },
  {
    icon: "MessageSquare",
    title: "VLLM Integration",
    description: "Voice-enabled conversational AI with Llama 3.3 or Qwen 2.5 for intelligent interactions",
  },
  {
    icon: "Zap",
    title: "GPU Acceleration",
    description: "CUDA-optimized inference pipeline for maximum performance on Replit infrastructure",
  },
  {
    icon: "Code",
    title: "Open Source Stack",
    description: "100% open-source models - Chatterbox, Higgs Audio V2, StyleTTS2, Whisper, and more",
  },
  {
    icon: "Shield",
    title: "API Key Management",
    description: "Secure authentication, rate limiting, and usage tracking for production deployments",
  },
];
