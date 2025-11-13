"""
VoiceForge API - Gradio Testing Interface
A comprehensive UI for testing all ML modules and API endpoints

This Gradio interface provides an easy way to test:
- Text-to-Speech (TTS)
- Speech-to-Text (STT)
- Voice Activity Detection (VAD)
- Voice LLM (VLLM)
- Voice Cloning
- API Health & Status
"""

import os
import sys
import json
import base64
import io
import requests
from pathlib import Path
from typing import Optional, Tuple, List
import gradio as gr
import numpy as np

# Add server directory to path for ML services
sys.path.insert(0, str(Path(__file__).parent / "server" / "ml-services"))

# Configuration
API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:7861")  # Express API on 7861
HF_SPACE_URL = os.environ.get("HF_SPACE_URL", "https://chrisdemonxxx-voiceforge-v1-0.hf.space")
DEFAULT_API_KEY = os.environ.get("API_KEY", "vf_sk_19798aa99815232e6d53e1af34f776e1")

# Try to use local API if available, otherwise use HF Space
# In HF Space, Express runs on 7861, Gradio on 7860
USE_LOCAL = os.path.exists("/app/dist/index.js") or os.path.exists("dist/index.js") or os.environ.get("API_BASE_URL")
BASE_URL = API_BASE_URL if USE_LOCAL else HF_SPACE_URL

print(f"[Gradio] Using API base URL: {BASE_URL}")
print(f"[Gradio] Local mode: {USE_LOCAL}")
print(f"[Gradio] Express API should be running on port 7861")

# ============================================================================
# Helper Functions
# ============================================================================

def make_api_request(endpoint: str, method: str = "GET", data: Optional[dict] = None, files: Optional[dict] = None) -> Tuple[dict, Optional[str]]:
    """Make API request and return response"""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {DEFAULT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            if files:
                # Remove Content-Type for file uploads
                headers.pop("Content-Type", None)
                response = requests.post(url, headers=headers, data=data, files=files, timeout=60)
            else:
                response = requests.post(url, headers=headers, json=data, timeout=60)
        else:
            return {"error": f"Unsupported method: {method}"}, None
        
        if response.status_code == 200:
            # Try to parse as JSON
            try:
                return response.json(), None
            except:
                # If not JSON, return raw content
                return {"status": "success", "content": response.content}, None
        else:
            error_text = response.text[:500] if response.text else "Unknown error"
            return {"error": f"HTTP {response.status_code}: {error_text}"}, None
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}, None

# ============================================================================
# API Health Check
# ============================================================================

def check_health():
    """Check API health status"""
    result, error = make_api_request("/api/health")
    if error:
        return f"❌ Error: {error}"
    
    if "error" in result:
        return f"❌ {result['error']}"
    
    # Format health check response
    status = result.get("status", "unknown")
    uptime = result.get("uptime", 0)
    db_status = result.get("database", {}).get("status", "unknown")
    ml_status = result.get("ml_workers", {}).get("status", "unknown")
    
    output = f"""
# 🏥 API Health Status

**Status**: {status.upper()}
**Uptime**: {uptime:.2f} seconds
**Database**: {db_status}
**ML Workers**: {ml_status}

**Full Response:**
```json
{json.dumps(result, indent=2)}
```
"""
    return output

# ============================================================================
# Text-to-Speech (TTS)
# ============================================================================

def test_tts(text: str, model: str, voice: str, speed: float) -> Tuple[Optional[str], str]:
    """Test TTS endpoint"""
    if not text.strip():
        return None, "❌ Please enter text to synthesize"
    
    data = {
        "text": text,
        "model": model,
        "voice": voice,
        "speed": speed
    }
    
    try:
        # TTS endpoint returns audio directly, not JSON
        response = requests.post(
            f"{BASE_URL}/api/tts",
            headers={"Authorization": f"Bearer {DEFAULT_API_KEY}"},
            json=data,
            timeout=60
        )
        
        if response.status_code == 200:
            audio_bytes = response.content
            processing_time = response.headers.get("X-Processing-Time", "unknown")
            
            # Save audio to temporary file
            audio_path = "/tmp/tts_output.wav"
            with open(audio_path, "wb") as f:
                f.write(audio_bytes)
            
            info = f"✅ TTS generated successfully!\n\n**Model**: {model}\n**Voice**: {voice}\n**Speed**: {speed}x\n**Processing Time**: {processing_time}"
            return audio_path, info
        elif response.status_code == 503:
            return None, f"⚠️ Service Unavailable (503)\n\nThe TTS service may still be initializing. Please wait a moment and try again.\n\n**Response**: {response.text[:200]}"
        else:
            error_text = response.text[:500] if response.text else "Unknown error"
            return None, f"❌ HTTP {response.status_code}: {error_text}"
    except requests.exceptions.RequestException as e:
        return None, f"❌ Request failed: {str(e)}"

# ============================================================================
# Speech-to-Text (STT)
# ============================================================================

def test_stt(audio_file) -> str:
    """Test STT endpoint"""
    if audio_file is None:
        return "❌ Please upload an audio file"
    
    try:
        # Read audio file
        with open(audio_file, "rb") as f:
            audio_data = f.read()
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        
        data = {
            "audio": audio_base64,
            "language": "en",
            "return_partial": False
        }
        
        result, error = make_api_request("/api/stt", method="POST", data=data)
        
        if error:
            return f"❌ Error: {error}"
        
        if "error" in result:
            return f"❌ {result['error']}"
        
        # Format response
        text = result.get("text", "")
        language = result.get("language", "unknown")
        confidence = result.get("confidence", 0)
        processing_time = result.get("processing_time", 0)
        
        output = f"""
# 🎤 Speech-to-Text Result

**Transcription**: {text}
**Language**: {language}
**Confidence**: {confidence:.2%}
**Processing Time**: {processing_time:.2f}s

**Full Response:**
```json
{json.dumps(result, indent=2)}
```
"""
        return output
    except Exception as e:
        return f"❌ Error processing audio: {str(e)}"

# ============================================================================
# Voice Activity Detection (VAD)
# ============================================================================

def test_vad(audio_file) -> str:
    """Test VAD endpoint"""
    if audio_file is None:
        return "❌ Please upload an audio file"
    
    try:
        # Read audio file
        with open(audio_file, "rb") as f:
            audio_data = f.read()
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        
        data = {
            "audio": audio_base64
        }
        
        result, error = make_api_request("/api/vad", method="POST", data=data)
        
        if error:
            return f"❌ Error: {error}"
        
        if "error" in result:
            return f"❌ {result['error']}"
        
        # Format response
        segments = result.get("segments", [])
        
        output = f"""
# 🔊 Voice Activity Detection Result

**Segments Found**: {len(segments)}

"""
        for i, segment in enumerate(segments, 1):
            start = segment.get("start", 0)
            end = segment.get("end", 0)
            confidence = segment.get("confidence", 0)
            output += f"**Segment {i}**: {start:.2f}s - {end:.2f}s (confidence: {confidence:.2%})\n"
        
        output += f"""
**Full Response:**
```json
{json.dumps(result, indent=2)}
```
"""
        return output
    except Exception as e:
        return f"❌ Error processing audio: {str(e)}"

# ============================================================================
# Voice LLM (VLLM)
# ============================================================================

def test_vllm(message: str, session_id: str, mode: str) -> str:
    """Test VLLM chat endpoint"""
    if not message.strip():
        return "❌ Please enter a message"
    
    data = {
        "message": message,
        "session_id": session_id or "test-session",
        "mode": mode
    }
    
    result, error = make_api_request("/api/vllm/chat", method="POST", data=data)
    
    if error:
        return f"❌ Error: {error}"
    
    if "error" in result:
        return f"❌ {result['error']}"
    
    # Format response
    response_text = result.get("response", "")
    tokens = result.get("tokens", 0)
    processing_time = result.get("processing_time", 0)
    
    output = f"""
# 🤖 Voice LLM Response

**Response**: {response_text}
**Tokens**: {tokens}
**Processing Time**: {processing_time:.2f}s
**Mode**: {mode}

**Full Response:**
```json
{json.dumps(result, indent=2)}
```
"""
    return output

# ============================================================================
# Voice Library
# ============================================================================

def get_voice_library() -> str:
    """Get voice library"""
    result, error = make_api_request("/api/voice-library")
    
    if error:
        return f"❌ Error: {error}"
    
    if "error" in result:
        return f"❌ {result['error']}"
    
    # Format response
    voices = result if isinstance(result, list) else result.get("voices", [])
    
    output = f"""
# 🎙️ Voice Library

**Total Voices**: {len(voices)}

**Sample Voices** (first 20):
"""
    for i, voice in enumerate(voices[:20], 1):
        voice_id = voice.get("id", "unknown")
        name = voice.get("name", "Unknown")
        language = voice.get("language", "unknown")
        gender = voice.get("gender", "unknown")
        output += f"{i}. **{name}** ({voice_id}) - {language}, {gender}\n"
    
    if len(voices) > 20:
        output += f"\n... and {len(voices) - 20} more voices\n"
    
    return output

# ============================================================================
# Voice Cloning
# ============================================================================

def test_voice_cloning(audio_file, mode: str, name: str, text: str) -> Tuple[Optional[str], str]:
    """Test voice cloning endpoint"""
    if audio_file is None and mode != "synthetic":
        return None, "❌ Please upload an audio file for cloning (synthetic mode doesn't require audio)"
    
    try:
        url = f"{BASE_URL}/api/clone-voice"
        headers = {"Authorization": f"Bearer {DEFAULT_API_KEY}"}
        
        # Prepare form data
        data = {
            "cloningMode": mode,
            "name": name or "Test Voice",
            "model": "chatterbox"
        }
        
        files = None
        if audio_file and mode != "synthetic":
            # Read audio file for file upload
            with open(audio_file, "rb") as f:
                files = {"reference": (os.path.basename(audio_file), f.read(), "audio/wav")}
        
        # Make request with file upload
        response = requests.post(url, headers=headers, data=data, files=files, timeout=120)
        
        if response.status_code != 200:
            error_text = response.text[:500] if response.text else "Unknown error"
            return None, f"❌ HTTP {response.status_code}: {error_text}"
        
        result = response.json()
        
        # Get voice ID from response
        voice_id = result.get("id", "unknown")
        
        # If text is provided, test TTS with cloned voice
        if text.strip() and voice_id != "unknown":
            tts_data = {
                "text": text,
                "model": "chatterbox",
                "voice": voice_id,
                "speed": 1.0
            }
            
            tts_response = requests.post(
                f"{BASE_URL}/api/tts",
                headers={"Authorization": f"Bearer {DEFAULT_API_KEY}"},
                json=tts_data,
                timeout=60
            )
            
            if tts_response.status_code == 200:
                audio_path = "/tmp/cloned_voice_output.wav"
                with open(audio_path, "wb") as f:
                    f.write(tts_response.content)
                
                info = f"✅ Voice cloned successfully!\n\n**Mode**: {mode}\n**Voice ID**: {voice_id}\n**Name**: {name or 'Test Voice'}\n\n✅ Test synthesis completed!"
                return audio_path, info
            else:
                info = f"✅ Voice cloned successfully!\n\n**Mode**: {mode}\n**Voice ID**: {voice_id}\n**Name**: {name or 'Test Voice'}\n\n⚠️ TTS test failed: HTTP {tts_response.status_code}"
                return None, info
        else:
            info = f"✅ Voice cloned successfully!\n\n**Mode**: {mode}\n**Voice ID**: {voice_id}\n**Name**: {name or 'Test Voice'}\n\n💡 Enter text above to test synthesis with cloned voice"
            return None, info
    except Exception as e:
        import traceback
        return None, f"❌ Error: {str(e)}\n\n{traceback.format_exc()[:500]}"

# ============================================================================
# Gradio Interface
# ============================================================================

def create_gradio_interface():
    """Create Gradio interface"""
    
    with gr.Blocks(title="VoiceForge API - Testing Interface", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
        # 🎙️ VoiceForge API - Testing Interface
        
        Comprehensive testing interface for all VoiceForge ML modules and API endpoints.
        
        **API Base URL**: `{}`
        """.format(BASE_URL))
        
        with gr.Tabs():
            # Health Check Tab
            with gr.Tab("🏥 Health Check"):
                gr.Markdown("### Check API Health Status")
                health_btn = gr.Button("Check Health", variant="primary")
                health_output = gr.Markdown()
                health_btn.click(check_health, outputs=health_output)
            
            # TTS Tab
            with gr.Tab("🔊 Text-to-Speech (TTS)"):
                gr.Markdown("### Test Text-to-Speech Synthesis")
                with gr.Row():
                    with gr.Column():
                        tts_text = gr.Textbox(
                            label="Text to Synthesize",
                            placeholder="Enter text here...",
                            lines=5,
                            value="Hello, this is a test of the VoiceForge text-to-speech system."
                        )
                        tts_model = gr.Dropdown(
                            label="Model",
                            choices=["chatterbox", "higgs_audio_v2", "styletts2"],
                            value="chatterbox"
                        )
                        tts_voice = gr.Textbox(
                            label="Voice ID",
                            placeholder="e.g., en-us-sarah-f",
                            value="en-us-sarah-f"
                        )
                        tts_speed = gr.Slider(
                            label="Speed",
                            minimum=0.5,
                            maximum=2.0,
                            value=1.0,
                            step=0.1
                        )
                        tts_btn = gr.Button("Generate Speech", variant="primary")
                    with gr.Column():
                        tts_audio = gr.Audio(label="Generated Audio", type="filepath")
                        tts_info = gr.Markdown()
                tts_btn.click(
                    test_tts,
                    inputs=[tts_text, tts_model, tts_voice, tts_speed],
                    outputs=[tts_audio, tts_info]
                )
            
            # STT Tab
            with gr.Tab("🎤 Speech-to-Text (STT)"):
                gr.Markdown("### Test Speech-to-Text Transcription")
                stt_audio = gr.Audio(label="Upload Audio File", type="filepath")
                stt_btn = gr.Button("Transcribe", variant="primary")
                stt_output = gr.Markdown()
                stt_btn.click(test_stt, inputs=stt_audio, outputs=stt_output)
            
            # VAD Tab
            with gr.Tab("🔊 Voice Activity Detection (VAD)"):
                gr.Markdown("### Test Voice Activity Detection")
                vad_audio = gr.Audio(label="Upload Audio File", type="filepath")
                vad_btn = gr.Button("Detect Voice Activity", variant="primary")
                vad_output = gr.Markdown()
                vad_btn.click(test_vad, inputs=vad_audio, outputs=vad_output)
            
            # VLLM Tab
            with gr.Tab("🤖 Voice LLM (VLLM)"):
                gr.Markdown("### Test Voice Large Language Model")
                with gr.Row():
                    with gr.Column():
                        vllm_message = gr.Textbox(
                            label="Message",
                            placeholder="Enter your message...",
                            lines=3,
                            value="Hello, how are you?"
                        )
                        vllm_session = gr.Textbox(
                            label="Session ID",
                            value="test-session",
                            placeholder="Session ID for conversation context"
                        )
                        vllm_mode = gr.Dropdown(
                            label="Mode",
                            choices=["echo", "assistant", "conversational", "custom"],
                            value="assistant"
                        )
                        vllm_btn = gr.Button("Send Message", variant="primary")
                    with gr.Column():
                        vllm_output = gr.Markdown()
                vllm_btn.click(
                    test_vllm,
                    inputs=[vllm_message, vllm_session, vllm_mode],
                    outputs=vllm_output
                )
            
            # Voice Library Tab
            with gr.Tab("🎙️ Voice Library"):
                gr.Markdown("### Browse Available Voices")
                voice_lib_btn = gr.Button("Load Voice Library", variant="primary")
                voice_lib_output = gr.Markdown()
                voice_lib_btn.click(get_voice_library, outputs=voice_lib_output)
            
            # Voice Cloning Tab
            with gr.Tab("🎭 Voice Cloning"):
                gr.Markdown("### Test Voice Cloning")
                gr.Markdown("**Note**: Synthetic mode doesn't require audio upload. Instant mode requires 5+ seconds of audio. Professional mode requires 1-5 minutes.")
                with gr.Row():
                    with gr.Column():
                        clone_audio = gr.Audio(label="Upload Reference Audio (not needed for synthetic)", type="filepath")
                        clone_mode = gr.Dropdown(
                            label="Cloning Mode",
                            choices=["instant", "professional", "synthetic"],
                            value="instant",
                            info="Synthetic mode creates voice from text description only"
                        )
                        clone_name = gr.Textbox(
                            label="Voice Name",
                            value="Test Voice",
                            placeholder="Name for the cloned voice"
                        )
                        clone_text = gr.Textbox(
                            label="Test Text (Optional)",
                            placeholder="Text to synthesize with cloned voice after cloning",
                            lines=3,
                            value="This is a test of the cloned voice."
                        )
                        clone_btn = gr.Button("Clone Voice", variant="primary")
                    with gr.Column():
                        clone_audio_output = gr.Audio(label="Cloned Voice Output (if test text provided)", type="filepath")
                        clone_info = gr.Markdown()
                clone_btn.click(
                    test_voice_cloning,
                    inputs=[clone_audio, clone_mode, clone_name, clone_text],
                    outputs=[clone_audio_output, clone_info]
                )
        
        # Auto-check health on load
        demo.load(check_health, outputs=health_output)
    
    return demo

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    demo = create_gradio_interface()
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )

