# VoiceForge API - Licensing Information

This document provides comprehensive licensing information for VoiceForge API and all its dependencies.

---

## 🔓 VoiceForge API Platform License

**License**: MIT License  
**Copyright**: (c) 2025 VoiceForge API  
**File**: See [LICENSE](LICENSE) file

The VoiceForge API platform code (frontend, backend, API routes, UI components) is licensed under the MIT License, which allows:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ✅ Sublicensing

**You are free to use this codebase for any purpose, including commercial applications.**

---

## 🤖 ML Model Licenses

The following machine learning models are used by VoiceForge API. **Each model has its own license** that you must comply with:

### Text-to-Speech (TTS) Models

#### 1. Chatterbox TTS
- **License**: Apache 2.0
- **Source**: https://huggingface.co/AstraMindAI/chatterbox
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

#### 2. Higgs Audio V2
- **License**: Apache 2.0
- **Source**: https://huggingface.co/hexgrad/Kokoro-82M
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

#### 3. StyleTTS2
- **License**: MIT License
- **Source**: https://github.com/yl4579/StyleTTS2
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

#### 4. Parler-TTS Mini Multilingual
- **License**: Apache 2.0
- **Source**: https://huggingface.co/parler-tts/parler-tts-mini-multilingual
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

#### 5. Indic Parler-TTS
- **License**: Apache 2.0
- **Source**: https://huggingface.co/ai4bharat/indic-parler-tts
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

### Speech-to-Text (STT) Models

#### Whisper Large V3 Turbo
- **License**: MIT License
- **Source**: https://huggingface.co/openai/whisper-large-v3-turbo
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required
- **Implementation**: faster-whisper (MIT License)

### Voice Activity Detection (VAD)

#### Silero VAD
- **License**: MIT License
- **Source**: https://github.com/snakers4/silero-vad
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

### Voice Large Language Models (VLLM)

#### Llama 3.1 / 3.3 (Meta)
- **License**: Llama 3 Community License
- **Source**: https://huggingface.co/meta-llama
- **Commercial Use**: ✅ Allowed (with restrictions)
- **Key Restrictions**:
  - Cannot use to improve other LLMs
  - Must comply with Meta's Acceptable Use Policy
  - Special license needed if >700M monthly active users
- **Full License**: https://www.llama.com/llama3/license/

#### Qwen 2.5 (Alibaba)
- **License**: Apache 2.0
- **Source**: https://huggingface.co/Qwen
- **Commercial Use**: ✅ Allowed
- **Attribution**: Required

---

## 📦 Key Dependencies

### Backend Framework
- **Express.js**: MIT License
- **Node.js**: MIT License
- **TypeScript**: Apache 2.0

### Frontend Framework
- **React**: MIT License
- **Vite**: MIT License
- **Tailwind CSS**: MIT License
- **shadcn/ui**: MIT License
- **Radix UI**: MIT License

### Database
- **PostgreSQL**: PostgreSQL License (similar to MIT/BSD)
- **Drizzle ORM**: Apache 2.0
- **Neon Serverless**: Apache 2.0

### ML Infrastructure
- **PyTorch**: BSD-3-Clause License
- **Transformers**: Apache 2.0
- **vLLM**: Apache 2.0

### Telephony
- **Twilio SDK**: MIT License
- **SIP Protocol**: Node.js SIP library (MIT)

---

## ⚖️ License Compliance Summary

### ✅ **Commercial Use: ALLOWED**

All models and dependencies used in VoiceForge API **allow commercial use** with the following requirements:

1. **Attribution Requirements**:
   - Acknowledge model creators in documentation
   - Include license notices for redistributed models
   - Link to original model repositories

2. **Llama License Special Considerations**:
   - Follow Meta's Acceptable Use Policy
   - Cannot use outputs to train competing LLMs
   - Special license if >700M MAU (most users won't hit this)

3. **Distribution**:
   - Include this LICENSES.md file with deployments
   - Provide LICENSE file for VoiceForge code
   - Don't remove copyright notices from model files

### 📋 **Recommended Attribution**

Include this in your application's About/Credits section:

```
VoiceForge API uses the following open-source models:
- Chatterbox TTS by AstraMind AI (Apache 2.0)
- Higgs Audio V2 / Kokoro-82M by Hexgrad (Apache 2.0)
- StyleTTS2 by yl4579 (MIT)
- Parler-TTS by Hugging Face (Apache 2.0)
- Indic Parler-TTS by AI4Bharat (Apache 2.0)
- Whisper V3 Turbo by OpenAI (MIT)
- Silero VAD by Silero (MIT)
- Llama 3 by Meta (Llama 3 Community License)
- Qwen 2.5 by Alibaba (Apache 2.0)

Built with PyTorch, Transformers, vLLM, React, and Express.
```

---

## 🚨 Important Legal Notes

### You Should:
✅ Keep this LICENSES.md file in your deployment  
✅ Include attribution in your application  
✅ Comply with Meta's Acceptable Use Policy for Llama  
✅ Provide proper notices if redistributing models  
✅ Review individual model licenses before commercial use  

### You Should NOT:
❌ Remove copyright notices from model files  
❌ Use Llama outputs to train competing LLMs  
❌ Misrepresent the origin of models  
❌ Violate any model's acceptable use policy  

---

## 📚 Additional Resources

- **VoiceForge License**: [LICENSE](LICENSE)
- **Meta Llama License**: https://www.llama.com/llama3/license/
- **Hugging Face Model Licenses**: Check each model's card on HuggingFace.co
- **PyTorch License**: https://github.com/pytorch/pytorch/blob/main/LICENSE
- **Apache 2.0 License**: https://www.apache.org/licenses/LICENSE-2.0
- **MIT License**: https://opensource.org/licenses/MIT

---

## 🤝 Questions?

If you have licensing questions:
1. Review individual model licenses on Hugging Face
2. Consult with legal counsel for commercial deployments
3. Ensure compliance with all applicable licenses

**Last Updated**: November 7, 2025  
**VoiceForge API Version**: 1.0.0
