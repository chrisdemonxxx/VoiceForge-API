/**
 * Production ML Service Configuration for 80GB A100 GPU
 * 
 * This configuration optimizes model loading for the 80GB A100 deployment:
 * - All models loaded simultaneously
 * - GPU memory allocation strategy
 * - Model caching and warming
 * - Fallback mechanisms
 */

export interface ModelLoadConfig {
  model_id: string;
  vram_required_gb: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  load_on_startup: boolean;
  cache_path?: string;
}

/**
 * VRAM allocation strategy for 80GB A100
 * 
 * Total: 80GB
 * Reserved for system/overhead: 5GB
 * Available for models: 75GB
 * 
 * IMPORTANT: 70B models in FP16 require ~75-80GB alone
 * Options:
 * 1. Use 8B VLLM model (~8GB) + all TTS/STT models (~23GB total) ✓ RECOMMENDED
 * 2. Use 70B VLLM model with INT8 quantization (~60GB) + critical models only
 * 3. Use 70B VLLM model alone, swap TTS/STT models on demand
 */
export const PRODUCTION_MODEL_CONFIG: ModelLoadConfig[] = [
  // Text-to-Speech Models (~15-20GB total)
  {
    model_id: 'chatterbox',
    vram_required_gb: 2,
    priority: 'critical',
    load_on_startup: true,
    cache_path: '/app/ml-cache/chatterbox',
  },
  {
    model_id: 'higgs_audio_v2',
    vram_required_gb: 8,
    priority: 'high',
    load_on_startup: true,
    cache_path: '/app/ml-cache/higgs_audio_v2',
  },
  {
    model_id: 'styletts2',
    vram_required_gb: 1,
    priority: 'high',
    load_on_startup: true,
    cache_path: '/app/ml-cache/styletts2',
  },
  {
    model_id: 'indic-parler-tts',
    vram_required_gb: 3,
    priority: 'medium',
    load_on_startup: true,
    cache_path: '/app/ml-cache/indic-parler-tts',
  },
  {
    model_id: 'parler-tts-multilingual',
    vram_required_gb: 3,
    priority: 'medium',
    load_on_startup: true,
    cache_path: '/app/ml-cache/parler-tts-multilingual',
  },

  // Speech-to-Text (~4-6GB)
  {
    model_id: 'whisper-large-v3-turbo',
    vram_required_gb: 6,
    priority: 'critical',
    load_on_startup: true,
    cache_path: '/app/ml-cache/whisper-large-v3-turbo',
  },

  // Voice Activity Detection (<1GB)
  {
    model_id: 'silero-vad',
    vram_required_gb: 0.1,
    priority: 'critical',
    load_on_startup: true,
    cache_path: '/app/ml-cache/silero-vad',
  },

  // Voice Large Language Model (~50-60GB with quantization, 75-80GB full precision)
  // IMPORTANT: 70B models require significant VRAM even with optimization
  // - FP16: ~75-80GB (doesn't fit with other models)
  // - INT8 quantization: ~50-60GB (fits with other models)
  // Recommendation: Use INT8 quantization or smaller model for concurrent loading
  {
    model_id: 'llama-3.3-70b-instruct',
    vram_required_gb: 60, // Assumes INT8 quantization
    priority: 'high',
    load_on_startup: false, // Set to true only if using quantization
    cache_path: '/app/ml-cache/llama-3.3-70b',
  },
  // Alternative: Smaller model (RECOMMENDED for concurrent loading)
  {
    model_id: 'llama-3.1-8b-instruct',
    vram_required_gb: 8,
    priority: 'high',
    load_on_startup: true, // Recommended: Use this instead of 70B for production
    cache_path: '/app/ml-cache/llama-3.1-8b',
  },

  // Voice Cloning (uses TTS models above)
  // No additional VRAM needed
];

/**
 * Total VRAM allocation calculation
 */
export function calculateTotalVRAM(): number {
  return PRODUCTION_MODEL_CONFIG
    .filter(m => m.load_on_startup)
    .reduce((total, model) => total + model.vram_required_gb, 0);
}

/**
 * GPU memory optimization settings
 */
export const GPU_CONFIG = {
  // PyTorch CUDA settings
  cuda_visible_devices: process.env.CUDA_VISIBLE_DEVICES || '0',
  pytorch_cuda_alloc_conf: process.env.PYTORCH_CUDA_ALLOC_CONF || 'max_split_size_mb:512',
  
  // Model loading settings
  load_in_8bit: false, // We have enough VRAM, use full precision
  load_in_4bit: false,
  torch_dtype: 'float16', // Use FP16 for faster inference
  device_map: 'auto', // Automatically distribute across available GPUs
  
  // Cache settings
  use_cache: true,
  cache_dir: process.env.HF_HOME || '/app/ml-cache',
  
  // Optimization flags
  use_flash_attention: true,
  trust_remote_code: true,
};

/**
 * Worker pool configuration for production
 */
export const WORKER_POOL_CONFIG = {
  // Worker counts per service type
  workers: {
    stt: 2,      // 2 STT workers for parallel processing
    tts: 4,      // 4 TTS workers (one per main model)
    vllm: 1,     // 1 VLLM worker (70B model is large)
    hf_tts: 2,   // 2 HF TTS workers for Indian/multilingual
    clone: 2,    // 2 voice cloning workers
  },
  
  // Queue settings
  max_queue_size: 100,
  task_timeout_ms: 60000, // 60 seconds
  
  // Health check settings
  health_check_interval_ms: 30000, // 30 seconds
  max_retries: 3,
  restart_on_failure: true,
};

/**
 * Model warming strategy
 * Pre-generate outputs to warm up models on startup
 */
export const MODEL_WARMING = {
  enabled: process.env.NODE_ENV === 'production',
  
  warmup_tasks: [
    {
      service: 'tts',
      model: 'chatterbox',
      input: { text: 'System warming up', voice_id: 'default' },
    },
    {
      service: 'stt',
      model: 'whisper-large-v3-turbo',
      // Will use a small silent audio file
    },
    {
      service: 'vllm',
      model: 'llama-3.3-70b',
      input: { messages: [{ role: 'user', content: 'Hello' }] },
    },
  ],
  
  warmup_timeout_ms: 120000, // 2 minutes total for warming
};

/**
 * Fallback configuration if VRAM insufficient
 */
export const FALLBACK_CONFIG = {
  // If 70B model fails to load, use 8B
  vllm_fallback: 'llama-3.1-8b-instruct',
  
  // If TTS model fails, use API
  tts_fallback: 'api',
  
  // Monitor VRAM and unload low-priority models if needed
  auto_unload_low_priority: true,
  vram_threshold_percent: 90, // Trigger fallback if >90% used
};

/**
 * Performance monitoring
 */
export const MONITORING_CONFIG = {
  log_model_loading: true,
  log_inference_time: true,
  log_vram_usage: true,
  
  metrics_export_interval_ms: 60000, // Export metrics every minute
  
  alert_thresholds: {
    inference_time_ms: 5000, // Alert if inference >5s
    vram_usage_percent: 95,  // Alert if VRAM >95%
    error_rate_percent: 5,   // Alert if error rate >5%
  },
};

// Export total VRAM calculation
console.log(`[Production Config] Total VRAM allocated: ${calculateTotalVRAM().toFixed(2)} GB`);

export default {
  PRODUCTION_MODEL_CONFIG,
  GPU_CONFIG,
  WORKER_POOL_CONFIG,
  MODEL_WARMING,
  FALLBACK_CONFIG,
  MONITORING_CONFIG,
};
