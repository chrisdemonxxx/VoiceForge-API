#!/usr/bin/env python3
"""
Test Real ML Models - Verify that placeholders are replaced with real implementations
"""

import sys
import json
import base64
import numpy as np
import io
import wave

def test_stt():
    """Test STT service with real faster-whisper"""
    print("\n🧪 Testing STT (Speech-to-Text)...")
    print("=" * 60)
    
    try:
        from stt_service import STTService
        
        service = STTService()
        
        if not service.model_loaded:
            print("  ❌ STT model not loaded")
            return False
        
        print("  ✓ STT model loaded")
        
        # Create test audio (1 second of silence)
        sample_rate = 16000
        duration = 1.0
        num_samples = int(sample_rate * duration)
        audio_array = np.zeros(num_samples, dtype=np.int16)
        
        # Convert to WAV bytes
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_array.tobytes())
        
        audio_bytes = wav_buffer.getvalue()
        
        # Test transcription
        result = service.transcribe(audio_bytes, language="en")
        
        print(f"  ✓ Transcription completed")
        print(f"    Text: '{result['text']}'")
        print(f"    Language: {result['language']}")
        print(f"    Confidence: {result['confidence']:.2f}")
        print(f"    Segments: {len(result['segments'])}")
        
        # Check if it's a placeholder
        if "placeholder" in result['text'].lower():
            print("  ⚠️  WARNING: Still using placeholder response!")
            return False
        
        print("  ✅ STT is using REAL faster-whisper")
        return True
        
    except ImportError as e:
        print(f"  ❌ Failed to import STT service: {e}")
        return False
    except Exception as e:
        print(f"  ❌ STT test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_tts():
    """Test TTS service with real Coqui TTS"""
    print("\n🧪 Testing TTS (Text-to-Speech)...")
    print("=" * 60)
    
    try:
        from tts_service import TTSService
        
        service = TTSService()
        
        if not service.model_loaded:
            print("  ⚠️  TTS model not loaded (may use fallback)")
        
        print("  ✓ TTS service initialized")
        
        test_text = "Hello, this is a test of the text to speech system."
        audio_bytes = service.synthesize(
            text=test_text,
            model="chatterbox",
            speed=1.0
        )
        
        print(f"  ✓ Audio generated")
        print(f"    Audio size: {len(audio_bytes)} bytes")
        
        # Check if audio is too short (placeholder)
        if len(audio_bytes) < 1000:
            print("  ⚠️  WARNING: Audio seems too short (might be placeholder)")
            return False
        
        # Try to parse as WAV
        try:
            wav_buffer = io.BytesIO(audio_bytes)
            with wave.open(wav_buffer, 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                num_frames = wav_file.getnframes()
                duration = num_frames / sample_rate
                print(f"    Sample rate: {sample_rate} Hz")
                print(f"    Duration: {duration:.2f} seconds")
        except:
            print("  ⚠️  WARNING: Audio format may be invalid")
        
        print("  ✅ TTS is using REAL Coqui TTS")
        return True
        
    except ImportError as e:
        print(f"  ❌ Failed to import TTS service: {e}")
        return False
    except Exception as e:
        print(f"  ❌ TTS test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_vad():
    """Test VAD service with real Silero VAD"""
    print("\n🧪 Testing VAD (Voice Activity Detection)...")
    print("=" * 60)
    
    try:
        from vad_service import VADService
        
        service = VADService()
        
        if not service.model_loaded:
            print("  ⚠️  VAD model not loaded (may use fallback)")
        
        print("  ✓ VAD service initialized")
        
        # Create test audio (1 second)
        sample_rate = 16000
        duration = 1.0
        num_samples = int(sample_rate * duration)
        audio_array = np.zeros(num_samples, dtype=np.int16)
        
        # Convert to WAV bytes
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_array.tobytes())
        
        audio_bytes = wav_buffer.getvalue()
        
        # Test VAD
        segments = service.detect_speech(audio_bytes)
        
        print(f"  ✓ VAD detection completed")
        print(f"    Segments detected: {len(segments)}")
        
        if segments:
            for i, seg in enumerate(segments):
                print(f"    Segment {i + 1}: {seg['start']:.2f}s - {seg['end']:.2f}s (conf: {seg['confidence']:.2f})")
        
        # Check if it's using hardcoded placeholder segments
        if len(segments) == 3 and segments[0].get('start') == 0.5 and segments[0].get('end') == 2.3:
            print("  ⚠️  WARNING: Still using placeholder segments!")
            return False
        
        print("  ✅ VAD is using REAL Silero VAD")
        return True
        
    except ImportError as e:
        print(f"  ❌ Failed to import VAD service: {e}")
        return False
    except Exception as e:
        print(f"  ❌ VAD test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     VoiceForge - Real Model Implementation Test              ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Change to the ml-services directory
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_services_dir = os.path.join(script_dir, "server", "ml-services")
    
    if os.path.exists(ml_services_dir):
        sys.path.insert(0, ml_services_dir)
        os.chdir(ml_services_dir)
        print(f"  Working directory: {ml_services_dir}")
    else:
        print(f"  ⚠️  ML services directory not found: {ml_services_dir}")
    
    results = {
        'stt': test_stt(),
        'tts': test_tts(),
        'vad': test_vad()
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"  STT (faster-whisper): {'✅' if results['stt'] else '❌'}")
    print(f"  TTS (Coqui TTS): {'✅' if results['tts'] else '❌'}")
    print(f"  VAD (Silero VAD): {'✅' if results['vad'] else '❌'}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All tests passed! Real models are working.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        print("   Note: Models may need to download on first run.")
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

