# AI/ML Modules API Keys - Global Usage Guide

## Required API Keys for AI/ML Services

These are the **external API keys** needed for the AI/ML modules to access external services:

---

## 1. Hugging Face Token (Optional but Recommended)

**Purpose**: Access Hugging Face models and private repositories

**Where to Get**:
- Visit: https://huggingface.co/settings/tokens
- Click "New token"
- Select "Read" or "Write" permissions
- Copy the token

**Environment Variable**:
```bash
HUGGINGFACE_TOKEN=hf_your_token_here
```

**Used For**:
- Downloading models from Hugging Face Hub
- Accessing private model repositories
- Model caching and management

**Required**: Optional (most models are public, but token helps with rate limits)

---

## 2. OpenAI API Key (Optional - for VLLM Fallback)

**Purpose**: Fallback for Voice LLM when local models fail

**Where to Get**:
- Visit: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key

**Environment Variable**:
```bash
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key-here
# Optional: Custom OpenAI base URL
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

**Used For**:
- AI Flow Generator (conversational AI workflows)
- VLLM fallback when local models unavailable
- Advanced agent flow generation

**Required**: Optional (only if using OpenAI fallback or AI flow generator)

---

## 3. VoiceForge API Keys (Internal - Already Generated)

**Purpose**: Authentication for VoiceForge API endpoints

**Current Keys**:
- **Default Key**: `vf_sk_19798aa99815232e6d53e1af34f776e1`
- **Rate Limit**: 1000 requests
- **Status**: Active

**Where to Get**:
- **With Database**: Create via `/api/keys` POST endpoint (requires admin token)
- **Without Database**: Default key is automatically returned

**Used For**:
- Authenticating API requests to VoiceForge
- Rate limiting per user
- Usage tracking

**Required**: ✅ Already available (default key works)

---

## Complete API Keys List for Global Usage

### For HF Space Deployment

Add these to HF Space Settings → Repository secrets:

```bash
# Optional: Hugging Face Token (for better model access)
HUGGINGFACE_TOKEN=hf_your_token_here

# Optional: OpenAI API Key (for AI flow generator)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key-here

# Optional: Database (for persistence)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### For Render Backend Deployment

Already configured:
```bash
DATABASE_URL=postgresql://voiceforge_ucpb_user:xo7F9IdJSYYEbqfrsEtpA7KdOfr09V6K@dpg-d4aj56pr0fns73eb88ug-a.oregon-postgres.render.com/voiceforge_ucpb
SESSION_SECRET=e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a
ADMIN_TOKEN=7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162
USE_HF_SPACES_ML=true
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

Optional (add if needed):
```bash
HUGGINGFACE_TOKEN=hf_your_token_here
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key-here
```

---

## How to Add API Keys to HF Space

1. **Go to Space Settings**:
   - https://huggingface.co/spaces/chrisdemonxxx/voiceforge_v1.0/settings

2. **Click "Repository secrets"**

3. **Add each key**:
   - Click "New secret"
   - Enter name (e.g., `HUGGINGFACE_TOKEN`)
   - Enter value (e.g., `hf_...`)
   - Click "Add secret"

4. **Restart Space** (if needed):
   - Go to Space → Settings → Danger Zone → Restart

---

## API Keys Usage Summary

| Service | API Key | Required | Purpose |
|---------|---------|----------|---------|
| **VoiceForge API** | `vf_sk_...` | ✅ Yes | Authenticate VoiceForge endpoints |
| **Hugging Face** | `hf_...` | ⚠️ Optional | Access HF models (better rate limits) |
| **OpenAI** | `sk-...` | ⚠️ Optional | AI flow generator (Agent Flow Builder) |
| **Database** | `DATABASE_URL` | ⚠️ Optional | Data persistence (HF Space) |

---

## Current Status

### ✅ Already Working (No Additional Keys Needed)
- **VoiceForge API Keys**: Default key available
- **ML Services**: Working without external keys (using local models)
- **Voice Library**: 81 pre-trained voices available

### ⚠️ Optional (Add for Enhanced Features)
- **HUGGINGFACE_TOKEN**: Better model access, higher rate limits
- **OPENAI_API_KEY**: AI flow generator, advanced features
- **DATABASE_URL**: Data persistence (optional for ML-only)

---

## Quick Setup Guide

### Minimal Setup (Current - Works Now)
```bash
# No external API keys needed!
# Default VoiceForge key: vf_sk_19798aa99815232e6d53e1af34f776e1
```

### Enhanced Setup (Add for Better Features)
```bash
# Add to HF Space secrets:
HUGGINGFACE_TOKEN=hf_your_token_here
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://...  # Optional
```

---

**Note**: The system works without external API keys! They're optional enhancements.

