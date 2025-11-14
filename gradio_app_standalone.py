"""
VoiceForge - Standalone Gradio Interface (No Express API Required)
Realtime Playground for Testing All Voice AI Modules

This interface directly imports and calls Python ML services without HTTP layer.
Perfect for HuggingFace Spaces deployment.
"""

import os
import sys
import json
import time
import io
import wave
import numpy as np
from pathlib import Path
from typing import Optional, Tuple
import gradio as gr

# Add server directory to path for ML services
sys.path.insert(0, str(Path(__file__).parent / "server" / "ml-services"))

# Import ML services directly
print("[Gradio] Initializing ML services...")
try:
    from tts_service import TTSService
    tts_service = TTSService()
    print("[Gradio] TTS Service loaded")
except Exception as e:
    print(f"[Gradio] WARNING: TTS Service failed to load: {e}")
    tts_service = None

try:
    from stt_service import STTService
    stt_service = STTService()
    print("[Gradio] STT Service loaded")
except Exception as e:
    print(f"[Gradio] WARNING: STT Service failed to load: {e}")
    stt_service = None

try:
    from vad_service import VADService
    vad_service = VADService()
    print("[Gradio] VAD Service loaded")
except Exception as e:
    print(f"[Gradio] WARNING: VAD Service failed to load: {e}")
    vad_service = None

try:
    from vllm_service import VLLMAgentService
    vllm_service = VLLMAgentService()
    print("[Gradio] VLLM Service loaded")
except Exception as e:
    print(f"[Gradio] WARNING: VLLM Service failed to load: {e}")
    vllm_service = None

# ============================================================================
# Text-to-Speech (TTS)
# ============================================================================

def test_tts(text: str, model: str, voice: str, speed: float) -> Tuple[Optional[str], str]:
    """Test TTS - Direct ML service call"""
    if not text.strip():
        return None, "Please enter text to synthesize"

    if not tts_service:
        return None, "TTS Service not available. Check logs for initialization errors."

    try:
        start_time = time.time()

        # Call TTS service directly
        audio_bytes = tts_service.synthesize(
            text=text,
            model=model,
            voice=voice,
            speed=speed
        )

        processing_time = time.time() - start_time

        if not audio_bytes:
            return None, f"TTS failed to generate audio. Model '{model}' may still be initializing (first run takes 2-5 min)."

        # Save audio to temporary file
        audio_path = "/tmp/tts_output.wav"
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)

        info = f"""## TTS Generated Successfully!

**Model**: {model}
**Voice**: {voice}
**Speed**: {speed}x
**Processing Time**: {processing_time:.2f}s
**Audio Size**: {len(audio_bytes) / 1024:.1f} KB

Models download on first use (2-5 min), then instant.
"""
        return audio_path, info

    except Exception as e:
        return None, f"TTS Error: {str(e)}\n\nCheck that the model is properly initialized."

# ============================================================================
# Speech-to-Text (STT)
# ============================================================================

def test_stt(audio_file) -> str:
    """Test STT - Direct ML service call"""
    if audio_file is None:
        return "Please upload an audio file"

    if not stt_service:
        return "STT Service not available. Check logs for initialization errors."

    try:
        # Read audio file
        with open(audio_file, "rb") as f:
            audio_bytes = f.read()

        # Call STT service directly
        result = stt_service.transcribe(audio_bytes, language="en")

        if "error" in result:
            return f"## STT Error\n\n{result['error']}\n\nWhisper model may still be initializing (first run takes 2-5 min)."

        # Format response
        text = result.get("text", "")
        language = result.get("language", "unknown")
        confidence = result.get("confidence", 0)
        duration = result.get("duration", 0)

        output = f"""## Speech-to-Text Result

**Transcription**: {text}

**Language**: {language}
**Confidence**: {confidence:.1%}
**Processing Time**: {duration:.2f}s

**Full Response**:
```json
{json.dumps(result, indent=2)}
```
"""
        return output

    except Exception as e:
        return f"## STT Error\n\n{str(e)}"

# ============================================================================
# Voice Activity Detection (VAD)
# ============================================================================

def test_vad(audio_file) -> str:
    """Test VAD - Direct ML service call"""
    if audio_file is None:
        return "Please upload an audio file"

    if not vad_service:
        return "VAD Service not available. Check logs for initialization errors."

    try:
        # Read audio file
        with open(audio_file, "rb") as f:
            audio_bytes = f.read()

        # Call VAD service directly
        result = vad_service.detect_voice_activity(audio_bytes)

        if "error" in result:
            return f"## VAD Error\n\n{result['error']}"

        # Format response
        segments = result.get("segments", [])

        output = f"""## Voice Activity Detection Result

**Segments Found**: {len(segments)}

"""
        if segments:
            for i, segment in enumerate(segments, 1):
                start = segment.get("start", 0)
                end = segment.get("end", 0)
                confidence = segment.get("confidence", 0)
                output += f"**Segment {i}**: {start:.2f}s - {end:.2f}s (confidence: {confidence:.1%})\n"
        else:
            output += "_No voice segments detected_\n"

        output += f"""
**Full Response**:
```json
{json.dumps(result, indent=2)}
```
"""
        return output

    except Exception as e:
        return f"## VAD Error\n\n{str(e)}"

# ============================================================================
# Voice LLM (VLLM) - Conversational AI
# ============================================================================

def test_vllm(message: str, session_id: str, mode: str, history: list) -> Tuple[str, list]:
    """Test VLLM Chat - Direct ML service call"""
    if not message.strip():
        return "Please enter a message", history

    if not vllm_service:
        return "VLLM Service not available. Using NVIDIA API fallback...", history

    try:
        # Generate session ID if not provided
        if not session_id or session_id.strip() == "":
            session_id = f"gradio-{int(time.time())}"

        # Call VLLM service directly
        result = vllm_service.generate_response({
            "message": message,
            "session_id": session_id,
            "mode": mode
        })

        if "error" in result:
            return f"Error: {result['error']}", history

        # Extract response
        response_text = result.get("response", "No response generated")
        tokens = result.get("tokens_generated", 0)
        processing_time = result.get("processing_time", 0)

        # Format response with metadata
        formatted_response = f"""{response_text}

_Tokens: {tokens} | Time: {processing_time:.2f}s | Mode: {mode}_
"""

        # Update history
        history.append((message, formatted_response))

        return "", history

    except Exception as e:
        error_msg = f"VLLM Error: {str(e)}"
        history.append((message, error_msg))
        return "", history

def clear_vllm_history(session_id: str) -> Tuple[str, list]:
    """Clear VLLM conversation history"""
    if vllm_service and session_id:
        try:
            vllm_service.memory.reset_session(session_id)
            return "Conversation history cleared!", []
        except:
            pass
    return "History cleared!", []

# ============================================================================
# System Status
# ============================================================================

def check_system_status() -> str:
    """Check status of all ML services"""
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            gpu_info = f"**GPU**: {gpu_name} ({gpu_memory:.1f} GB VRAM)"
        else:
            gpu_info = "**GPU**: Not available (running on CPU)"
    except:
        gpu_info = "**GPU**: Unknown"

    tts_status = "Loaded" if tts_service and hasattr(tts_service, 'models') else "Not Available"
    stt_status = "Loaded" if stt_service and hasattr(stt_service, 'model') else "Not Available"
    vad_status = "Loaded" if vad_service and hasattr(vad_service, 'model') else "Not Available"
    vllm_status = "NVIDIA API Fallback" if vllm_service else "Not Available"

    output = f"""## VoiceForge System Status

{gpu_info}

### ML Services
- **TTS Service**: {tts_status}
- **STT Service**: {stt_status}
- **VAD Service**: {vad_status}
- **VLLM Service**: {vllm_status}

### Available Models
**TTS Models**:
- Chatterbox (ResembleAI - 500M params, multilingual)
- StyleTTS2 (high-quality)
- Higgs Audio V2 (Boson AI - 3B params)

**STT Model**:
- Whisper large-v3 (faster-whisper + CTranslate2)

**VAD Model**:
- Silero VAD v5.1

**Voice LLM**:
- NVIDIA API (Llama 3.1 70B - 6 months unlimited)

**Note**: Models download on first use (2-5 min), then instant.
"""
    return output

# ============================================================================
# Realtime Playground - Combined Interface
# ============================================================================

def create_realtime_playground():
    """Create combined realtime testing interface"""
    with gr.Blocks() as demo:
        gr.Markdown("""# VoiceForge Realtime Playground
Test all voice AI modules: TTS, STT, VAD, and Voice LLM with latency monitoring.
All models run directly on 80GB A100 GPU.""")

        with gr.Tab("Realtime Testing"):
            with gr.Row():
                with gr.Column():
                    gr.Markdown("## TTS - Text to Speech")
                    tts_text = gr.Textbox(
                        label="Text to Synthesize",
                        placeholder="Enter text to convert to speech...",
                        lines=3
                    )
                    with gr.Row():
                        tts_model = gr.Dropdown(
                            choices=["chatterbox", "styletts2", "higgs"],
                            value="chatterbox",
                            label="TTS Model"
                        )
                        tts_voice = gr.Dropdown(
                            choices=["default", "female", "male"],
                            value="default",
                            label="Voice"
                        )
                        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")

                    tts_btn = gr.Button("Generate Speech", variant="primary")
                    tts_audio_output = gr.Audio(label="Generated Audio", type="filepath")
                    tts_info_output = gr.Markdown()

                with gr.Column():
                    gr.Markdown("## STT - Speech to Text")
                    stt_audio_input = gr.Audio(label="Upload Audio", type="filepath")
                    stt_btn = gr.Button("Transcribe Audio", variant="primary")
                    stt_output = gr.Markdown()

            with gr.Row():
                with gr.Column():
                    gr.Markdown("## VAD - Voice Activity Detection")
                    vad_audio_input = gr.Audio(label="Upload Audio", type="filepath")
                    vad_btn = gr.Button("Detect Voice Activity", variant="primary")
                    vad_output = gr.Markdown()

                with gr.Column():
                    gr.Markdown("## Voice LLM - Conversational AI")
                    vllm_session_id = gr.Textbox(label="Session ID (optional)", placeholder="Auto-generated if empty")
                    vllm_mode = gr.Dropdown(
                        choices=["assistant", "creative", "precise"],
                        value="assistant",
                        label="Mode"
                    )
                    vllm_chatbot = gr.Chatbot(label="Conversation", height=300)
                    vllm_message = gr.Textbox(label="Your Message", placeholder="Type your message...")
                    with gr.Row():
                        vllm_send_btn = gr.Button("Send", variant="primary")
                        vllm_clear_btn = gr.Button("Clear History")

        with gr.Tab("System Status"):
            gr.Markdown("## System Health & Configuration")
            status_btn = gr.Button("Refresh Status", variant="primary")
            status_output = gr.Markdown()
            status_btn.click(check_system_status, outputs=status_output)

        # Event handlers
        tts_btn.click(
            test_tts,
            inputs=[tts_text, tts_model, tts_voice, tts_speed],
            outputs=[tts_audio_output, tts_info_output]
        )

        stt_btn.click(
            test_stt,
            inputs=[stt_audio_input],
            outputs=[stt_output]
        )

        vad_btn.click(
            test_vad,
            inputs=[vad_audio_input],
            outputs=[vad_output]
        )

        vllm_send_btn.click(
            test_vllm,
            inputs=[vllm_message, vllm_session_id, vllm_mode, vllm_chatbot],
            outputs=[vllm_message, vllm_chatbot]
        )

        vllm_clear_btn.click(
            clear_vllm_history,
            inputs=[vllm_session_id],
            outputs=[status_output, vllm_chatbot]
        )

        # Load status on startup
        demo.load(check_system_status, outputs=status_output)

    return demo

# ============================================================================
# Main Gradio Interface
# ============================================================================

def create_gradio_interface():
    """Create main Gradio interface with all features"""

    with gr.Blocks(title="VoiceForge - Voice AI Platform", theme=gr.themes.Soft()) as demo:
        gr.Markdown("""
# VoiceForge - Production Voice AI Platform
Powered by 80GB A100 GPU on HuggingFace Spaces

**Features**: Text-to-Speech | Speech-to-Text | Voice Activity Detection | Voice LLM
        """)

        with gr.Tabs():
            # Realtime Playground Tab
            with gr.Tab("Realtime Playground"):
                playground = create_realtime_playground()

            # Individual Feature Tabs
            with gr.Tab("TTS - Text to Speech"):
                with gr.Row():
                    with gr.Column():
                        tts_text = gr.Textbox(
                            label="Text to Synthesize",
                            placeholder="Enter text to convert to speech...",
                            lines=5
                        )
                        with gr.Row():
                            tts_model = gr.Dropdown(
                                choices=["chatterbox", "styletts2", "higgs"],
                                value="chatterbox",
                                label="TTS Model"
                            )
                            tts_voice = gr.Dropdown(
                                choices=["default", "female", "male"],
                                value="default",
                                label="Voice"
                            )
                        tts_speed = gr.Slider(0.5, 2.0, value=1.0, step=0.1, label="Speed")
                        tts_btn = gr.Button("Generate Speech", variant="primary")

                    with gr.Column():
                        tts_audio = gr.Audio(label="Generated Audio", type="filepath")
                        tts_info = gr.Markdown()

                tts_btn.click(
                    test_tts,
                    inputs=[tts_text, tts_model, tts_voice, tts_speed],
                    outputs=[tts_audio, tts_info]
                )

            with gr.Tab("STT - Speech to Text"):
                stt_audio = gr.Audio(label="Upload Audio File", type="filepath")
                stt_btn = gr.Button("Transcribe", variant="primary")
                stt_output = gr.Markdown()

                stt_btn.click(test_stt, inputs=[stt_audio], outputs=[stt_output])

            with gr.Tab("VAD - Voice Activity Detection"):
                vad_audio = gr.Audio(label="Upload Audio File", type="filepath")
                vad_btn = gr.Button("Detect Voice Activity", variant="primary")
                vad_output = gr.Markdown()

                vad_btn.click(test_vad, inputs=[vad_audio], outputs=[vad_output])

            with gr.Tab("Voice LLM - Conversational AI"):
                with gr.Row():
                    with gr.Column(scale=2):
                        chatbot = gr.Chatbot(label="Conversation", height=500)
                        with gr.Row():
                            msg = gr.Textbox(
                                label="Your Message",
                                placeholder="Type your message and press Enter...",
                                scale=4
                            )
                            send = gr.Button("Send", variant="primary", scale=1)

                    with gr.Column(scale=1):
                        session_id = gr.Textbox(
                            label="Session ID (optional)",
                            placeholder="Auto-generated if empty"
                        )
                        mode = gr.Dropdown(
                            choices=["assistant", "creative", "precise"],
                            value="assistant",
                            label="Mode"
                        )
                        clear = gr.Button("Clear History")
                        vllm_status = gr.Markdown()

                send.click(
                    test_vllm,
                    inputs=[msg, session_id, mode, chatbot],
                    outputs=[msg, chatbot]
                )

                msg.submit(
                    test_vllm,
                    inputs=[msg, session_id, mode, chatbot],
                    outputs=[msg, chatbot]
                )

                clear.click(
                    clear_vllm_history,
                    inputs=[session_id],
                    outputs=[vllm_status, chatbot]
                )

            with gr.Tab("System Status"):
                gr.Markdown("## ML Services Health Check")
                status_btn = gr.Button("Check System Status", variant="primary")
                status_output = gr.Markdown()

                status_btn.click(check_system_status, outputs=[status_output])
                demo.load(check_system_status, outputs=[status_output])

        gr.Markdown("""
---
**API Key**: `vf_sk_19798aa99815232e6d53e1af34f776e1`
**Hardware**: NVIDIA A100-SXM4-80GB (79.25 GB VRAM)
**Models**: Chatterbox TTS, StyleTTS2, Higgs V2, Whisper large-v3, Silero VAD v5.1, NVIDIA Llama 3.1 70B
        """)

    return demo

if __name__ == "__main__":
    demo = create_gradio_interface()
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
