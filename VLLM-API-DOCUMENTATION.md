# VLLM API Documentation

## Overview

The VLLM (Voice Large Language Model) API provides conversational AI capabilities that can be used independently in other projects. You can access it in two ways:

1. **Via VoiceForge API** (existing endpoint)
2. **As Standalone Service** (new microservice)

---

## Option 1: Using VoiceForge API Endpoint

### Endpoints
```
POST https://voiceforge-api.onrender.com/api/vllm/chat
POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/vllm/chat
POST https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/vllm  (Direct HF Spaces endpoint)
```

### Authentication
Include your API key in the request header:
```
Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1
```

### Request Format
```json
{
  "message": "Hello, how are you?",
  "session_id": "optional-session-id",
  "mode": "assistant",
  "system_prompt": "You are a helpful assistant.",
  "voice": "optional-voice-id-for-audio"
}
```

### Response Format
```json
{
  "response": "I'm doing well, thank you for asking! How can I help you today?",
  "session_id": "session_1234567890",
  "mode": "assistant",
  "processing_time": 0.15,
  "context_size": 5,
  "tokens": 25
}
```

### With Audio (TTS)
If you include `voice` in the request, you'll also get audio:
```json
{
  "response": "I'm doing well, thank you for asking!",
  "session_id": "session_1234567890",
  "mode": "assistant",
  "processing_time": 0.15,
  "context_size": 5,
  "tokens": 25,
  "audioBase64": "UklGRiQAAABXQVZFZm10..."
}
```

### Example: Python
```python
import requests

url = "https://voiceforge-api.onrender.com/api/vllm/chat"
headers = {
    "Authorization": "Bearer vf_sk_19798aa99815232e6d53e1af34f776e1",
    "Content-Type": "application/json"
}

data = {
    "message": "What is the capital of France?",
    "session_id": "my-session-123",
    "mode": "assistant"
}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result["response"])
```

### Example: JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

const url = 'https://voiceforge-api.onrender.com/api/vllm/chat';
const headers = {
  'Authorization': 'Bearer vf_sk_19798aa99815232e6d53e1af34f776e1',
  'Content-Type': 'application/json'
};

const data = {
  message: 'What is the capital of France?',
  session_id: 'my-session-123',
  mode: 'assistant'
};

fetch(url, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(data)
})
  .then(res => res.json())
  .then(result => console.log(result.response));
```

### Example: cURL
```bash
curl -X POST https://voiceforge-api.onrender.com/api/vllm/chat \
  -H "Authorization: Bearer vf_sk_19798aa99815232e6d53e1af34f776e1" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the capital of France?",
    "session_id": "my-session-123",
    "mode": "assistant"
  }'
```

---

## Option 2: Standalone VLLM Service

### Setup

1. **Deploy as separate service**:
   ```bash
   # Set environment variables
   export USE_HF_SPACES_ML=true
   export HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
   export VLLM_PORT=3001
   
   # Run standalone service
   npx tsx server/vllm-standalone.ts
   ```

2. **Or use Docker**:
   ```dockerfile
   FROM node:20
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   CMD ["node", "dist/server/vllm-standalone.js"]
   ```

### Endpoints

#### Health Check
```
GET http://localhost:3001/health
```

#### Chat
```
POST http://localhost:3001/v1/chat
```

### Request Format
```json
{
  "message": "Hello, how are you?",
  "session_id": "optional-session-id",
  "mode": "assistant",
  "system_prompt": "You are a helpful assistant.",
  "stream": false
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "response": "I'm doing well, thank you for asking!",
    "session_id": "session_1234567890",
    "mode": "assistant",
    "processing_time": 0.15,
    "context_size": 5,
    "tokens": 25
  }
}
```

### Example: Python Client
```python
import requests

class VLLMClient:
    def __init__(self, base_url="http://localhost:3001"):
        self.base_url = base_url
    
    def chat(self, message, session_id=None, mode="assistant", system_prompt=None):
        url = f"{self.base_url}/v1/chat"
        data = {
            "message": message,
            "session_id": session_id,
            "mode": mode,
            "system_prompt": system_prompt
        }
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()["data"]
    
    def reset_session(self, session_id):
        url = f"{self.base_url}/v1/sessions/{session_id}/reset"
        response = requests.post(url)
        response.raise_for_status()
        return response.json()

# Usage
client = VLLMClient("https://your-vllm-service.com")
result = client.chat("Hello!", session_id="my-session")
print(result["response"])
```

### Example: JavaScript Client
```javascript
class VLLMClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async chat(message, options = {}) {
    const { sessionId, mode = 'assistant', systemPrompt } = options;
    const response = await fetch(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        mode,
        system_prompt: systemPrompt
      })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data;
  }

  async resetSession(sessionId) {
    const response = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}/reset`, {
      method: 'POST'
    });
    return response.json();
  }
}

// Usage
const client = new VLLMClient('https://your-vllm-service.com');
const result = await client.chat('Hello!', { sessionId: 'my-session' });
console.log(result.response);
```

---

## Agent Modes

The VLLM supports different agent modes:

- **`assistant`** (default): Helpful, conversational assistant
- **`echo`**: Echoes back the user's message
- **`conversational`**: More natural, context-aware conversations
- **`custom`**: Uses custom system prompt

### Example with Custom Mode
```json
{
  "message": "Explain quantum computing",
  "mode": "custom",
  "system_prompt": "You are a quantum physics expert. Explain concepts clearly and concisely."
}
```

---

## Session Management

Sessions maintain conversation context. Use the same `session_id` for related messages:

```python
session_id = "user-123-conversation"

# First message
response1 = client.chat("What is AI?", session_id=session_id)

# Follow-up (remembers previous context)
response2 = client.chat("Can you explain more?", session_id=session_id)
```

---

## Error Handling

### Model Loading (503)
```json
{
  "success": false,
  "error": "Model is loading. Please try again in a few seconds.",
  "code": "MODEL_LOADING",
  "retry_after": 10
}
```

### Service Unavailable (503)
```json
{
  "success": false,
  "error": "Hugging Face service temporarily unavailable.",
  "code": "SERVICE_UNAVAILABLE",
  "service": "huggingface"
}
```

### Missing Message (400)
```json
{
  "success": false,
  "error": "Message is required",
  "code": "MISSING_MESSAGE"
}
```

---

## Rate Limiting

When using VoiceForge API endpoint:
- Rate limits are per API key
- Default: 1000 requests/hour
- Check rate limit headers in response

---

## Integration Examples

### React Component
```jsx
import { useState } from 'react';

function ChatBot() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://voiceforge-api.onrender.com/api/vllm/chat', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          session_id: 'web-session-123'
        })
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input value={message} onChange={e => setMessage(e.target.value)} />
      <button onClick={sendMessage} disabled={loading}>
        Send
      </button>
      {response && <p>{response}</p>}
    </div>
  );
}
```

### Python Flask Integration
```python
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

VLLM_API = "https://voiceforge-api.onrender.com/api/vllm/chat"
API_KEY = "vf_sk_19798aa99815232e6d53e1af34f776e1"

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    
    response = requests.post(
        VLLM_API,
        headers={'Authorization': f'Bearer {API_KEY}'},
        json={
            'message': user_message,
            'session_id': request.json.get('session_id', 'default')
        }
    )
    
    return jsonify(response.json())

if __name__ == '__main__':
    app.run(port=5000)
```

---

## Deployment Options

### 1. Render (Recommended)
- Deploy standalone service as a web service
- Set environment variables
- Auto-scales based on traffic

### 2. Docker
- Build Docker image
- Run in any container orchestration platform
- Kubernetes, Docker Swarm, etc.

### 3. Serverless
- AWS Lambda
- Google Cloud Functions
- Vercel Serverless Functions

---

## API Keys

Get your API key from:
- VoiceForge Dashboard: https://your-frontend.vercel.app/api-keys
- Or use default: `vf_sk_19798aa99815232e6d53e1af34f776e1`

---

## Support

For issues or questions:
- Check logs: `https://voiceforge-api.onrender.com/api/health`
- Monitor: `https://chrisdemonxxx-voiceforge-v1-0.hf.space/api/health`

---

**Last Updated**: 2025-11-13

