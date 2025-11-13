# VoiceForge API - Gradio UI Status & Testing Guide

## 📊 Current Status

### ✅ HF Space Deployment Status

**Space URL**: https://chrisdemonxxx-voiceforge-v1-0.hf.space

**Test Results** (as of latest check):
- ✅ **Health Check**: Working - API is healthy
- ✅ **Voice Library**: Working - 81 voices available
- ⚠️ **TTS**: Service Unavailable (503) - ML workers may still be initializing
- ✅ **VLLM**: Working - Chat endpoint responding
- ⏳ **STT/VAD**: Not tested (requires audio files)
- ⏳ **Voice Cloning**: Not tested (requires audio files)

### 🎨 Gradio UI Created

A comprehensive Gradio testing interface has been created to test all modules and APIs.

**Files Created**:
- `gradio_app.py` - Main Gradio interface
- `app_gradio.py` - Alternative entry point for Gradio mode
- `test-gradio-api.sh` - Test script for API endpoints

## 🚀 How to Use Gradio UI

### Option 1: Run Locally (Testing)

```bash
# Install Gradio (if not already installed)
pip install gradio==4.19.1

# Run Gradio app
python gradio_app.py
```

The interface will be available at `http://localhost:7860`

### Option 2: Use in HF Space

To switch HF Space to use Gradio UI instead of Express server:

1. **Update Dockerfile** to use `app_gradio.py` as entry point, OR
2. **Set environment variable** `USE_GRADIO=true` and modify `app.py` to detect it

**Recommended**: Create a separate branch or Space for Gradio testing.

### Option 3: Run Both (Express + Gradio)

You can run both simultaneously on different ports:
- Express API: Port 7860 (default)
- Gradio UI: Port 7861

```bash
# Terminal 1: Start Express server
npm start

# Terminal 2: Start Gradio UI
python gradio_app.py --server-port 7861
```

## 📋 Gradio UI Features

The Gradio interface includes tabs for:

1. **🏥 Health Check**
   - Check API health status
   - View database and ML worker status
   - Auto-checks on page load

2. **🔊 Text-to-Speech (TTS)**
   - Test TTS synthesis
   - Select model (chatterbox, higgs_audio_v2, styletts2)
   - Choose voice ID
   - Adjust speed
   - Play generated audio

3. **🎤 Speech-to-Text (STT)**
   - Upload audio file
   - Get transcription
   - View confidence scores
   - See processing time

4. **🔊 Voice Activity Detection (VAD)**
   - Upload audio file
   - Detect voice segments
   - View timestamps and confidence

5. **🤖 Voice LLM (VLLM)**
   - Chat with voice LLM
   - Select mode (echo, assistant, conversational, custom)
   - Maintain session context
   - View token counts and processing time

6. **🎙️ Voice Library**
   - Browse all available voices
   - View voice details (language, gender, etc.)
   - See total voice count

7. **🎭 Voice Cloning**
   - Test instant/professional/synthetic cloning
   - Upload reference audio (for instant/professional)
   - Test synthesis with cloned voice
   - View cloning status and quality scores

## 🔧 Configuration

The Gradio app automatically detects the API base URL:

- **Local mode**: Uses `http://localhost:7860` if Express server is running locally
- **HF Space mode**: Uses `https://chrisdemonxxx-voiceforge-v1-0.hf.space` if local server not found

You can override with environment variables:
```bash
export API_BASE_URL=http://localhost:7860
export HF_SPACE_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
export API_KEY=your_api_key_here
```

## ⚠️ Known Issues

1. **TTS Service (503)**: The TTS endpoint may return 503 if ML workers are still initializing. This is normal after deployment - wait a few minutes and try again.

2. **Model Loading**: Large models (especially VLLM) take time to load. The first request may take longer.

3. **File Uploads**: STT, VAD, and Voice Cloning require audio file uploads. Make sure files are in supported formats (WAV, MP3, etc.).

## 🧪 Testing

### Quick Test Script

```bash
# Test all API endpoints
./test-gradio-api.sh
```

### Manual Testing

1. Open Gradio UI
2. Start with Health Check tab - verify API is healthy
3. Test TTS with a simple text
4. Test VLLM with a chat message
5. Browse Voice Library
6. Test other endpoints as needed

## 📝 Recommendations

### For Testing & Development

✅ **Use Gradio UI** - It's perfect for:
- Quick API testing
- Module verification
- Debugging endpoints
- Demonstrating capabilities

### For Production

✅ **Use Express Server + React Frontend** - Better for:
- Full-featured dashboard
- User management
- Production workflows
- Professional UI/UX

### Hybrid Approach

You can run both:
- **Express API** (port 7860) - Main API for production
- **Gradio UI** (port 7861) - Testing interface for developers

## 🔄 Next Steps

1. **Deploy Gradio to HF Space** (optional):
   - Create a separate Space for Gradio UI
   - Or modify existing Space to support both modes

2. **Fix TTS 503 Issue**:
   - Check ML worker initialization
   - Verify model loading
   - Check GPU availability

3. **Add More Tests**:
   - Test STT with real audio files
   - Test VAD with various audio samples
   - Test voice cloning end-to-end

4. **Improve Error Handling**:
   - Better error messages in Gradio UI
   - Retry logic for 503 errors
   - Status indicators for service availability

## 📚 Files Reference

- `gradio_app.py` - Main Gradio interface implementation
- `app_gradio.py` - Alternative entry point for Gradio mode
- `app.py` - Current Express server entry point
- `test-gradio-api.sh` - API testing script
- `requirements-deployment.txt` - Includes `gradio==4.19.1`

---

**Status**: ✅ Gradio UI created and ready for testing
**Recommendation**: Use Gradio UI for quick module testing, keep Express server for production

