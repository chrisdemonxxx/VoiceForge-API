# VLLM Standalone Service Setup

## Quick Start

### 1. Run Locally

```bash
# Install dependencies
npm install

# Set environment variables
export USE_HF_SPACES_ML=true
export HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
export VLLM_PORT=3001

# Run standalone service
npx tsx server/vllm-standalone.ts
```

### 2. Test the Service

```bash
# Health check
curl http://localhost:3001/health

# Chat endpoint
curl -X POST http://localhost:3001/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "session_id": "test-session",
    "mode": "assistant"
  }'
```

### 3. Deploy to Render

1. Create a new Web Service on Render
2. Set build command: `npm run build`
3. Set start command: `node dist/server/vllm-standalone.js`
4. Add environment variables:
   - `USE_HF_SPACES_ML=true`
   - `HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space`
   - `VLLM_PORT=3001`
   - `NODE_ENV=production`

### 4. Deploy with Docker

Create `Dockerfile.vllm`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/server/vllm-standalone.js"]
```

Build and run:
```bash
docker build -f Dockerfile.vllm -t vllm-standalone .
docker run -p 3001:3001 \
  -e USE_HF_SPACES_ML=true \
  -e HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space \
  vllm-standalone
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VLLM_PORT` | Port for standalone service | `3001` |
| `USE_HF_SPACES_ML` | Use HF Spaces API | `false` |
| `HF_ML_API_URL` | HF Spaces API URL | - |
| `NODE_ENV` | Environment | `development` |

---

## API Endpoints

### Health Check
```
GET /health
```

### Chat
```
POST /v1/chat
```

### Reset Session
```
POST /v1/sessions/:session_id/reset
```

---

## Usage in Other Projects

See `VLLM-API-DOCUMENTATION.md` for complete examples.

