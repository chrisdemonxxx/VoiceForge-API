# Environment Variables Configuration Guide

## Overview
This document describes all environment variables required for the VoiceForge API deployment.

## Required Environment Variables

### Database Configuration
- **`DATABASE_URL`** (Required)
  - PostgreSQL database connection string
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://user:pass@localhost:5432/voiceforge`
  - **Required for**: Database operations, API key storage, usage tracking

### Security Configuration
- **`SESSION_SECRET`** (Required)
  - Secret key for session management
  - Should be a random string (at least 32 characters)
  - Example: `your-secret-key-here-min-32-chars`
  - **Required for**: Session security, cookie signing

- **`ADMIN_TOKEN`** (Optional)
  - Admin token for production admin operations
  - Example: `admin-token-here`
  - **Required for**: Admin endpoints (optional)

### Server Configuration
- **`NODE_ENV`** (Optional)
  - Environment mode: `production` or `development`
  - Default: `development`
  - **Required for**: Environment-specific configuration

- **`PORT`** (Optional)
  - Server port number
  - Default: `5000`
  - **Required for**: Server listening port

### ML Services Configuration

#### Option 1: Use HF Spaces API (Recommended for Production)
- **`USE_HF_SPACES_ML`** (Optional)
  - Set to `"true"` to use HF Spaces API
  - Default: `false` (uses local Python Bridge)
  - **Required for**: ML service selection

- **`HF_ML_API_URL`** (Optional)
  - HF Spaces ML API URL
  - Default: `https://chrisdemonxxx-voiceforge-v1-0.hf.space`
  - **Required for**: HF Spaces API endpoint
  - **Note**: If set, automatically enables HF Spaces mode (even if `USE_HF_SPACES_ML` is not set)

**Usage**:
```bash
# Enable HF Spaces mode
USE_HF_SPACES_ML=true
# OR
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

#### Option 2: Use Local Python Bridge (Default)
- **No additional variables required**
  - Uses local Python workers by default
  - Requires Python 3.10+ and ML dependencies
  - **Required for**: Local ML processing

### Python Bridge Configuration (Optional)
- **`PYTHON_PATH`** (Optional)
  - Path to Python executable
  - Default: `python3`
  - **Required for**: Python Bridge execution

- **`CUDA_VISIBLE_DEVICES`** (Optional)
  - GPU device selection
  - Default: `0`
  - **Required for**: GPU selection (if multiple GPUs available)

- **`PYTORCH_CUDA_ALLOC_CONF`** (Optional)
  - PyTorch CUDA memory configuration
  - Example: `max_split_size_mb:512`
  - **Required for**: GPU memory management

### Hugging Face Configuration (Optional)
- **`HUGGINGFACE_TOKEN`** (Optional)
  - Hugging Face API token
  - Example: `hf_xxxxxxxxxxxxxxxxxxxx`
  - **Required for**: Hugging Face API access (if needed)

- **`HF_HOME`** (Optional)
  - Hugging Face cache directory
  - Default: `~/.cache/huggingface`
  - **Required for**: Model caching

- **`TRANSFORMERS_CACHE`** (Optional)
  - Transformers cache directory
  - Default: `~/.cache/huggingface/transformers`
  - **Required for**: Transformers model caching

- **`TORCH_HOME`** (Optional)
  - PyTorch cache directory
  - Default: `~/.cache/torch`
  - **Required for**: PyTorch model caching

## Environment-Specific Configuration

### Development Environment
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/voiceforge_dev
SESSION_SECRET=dev-secret-key-min-32-chars
# Use local Python Bridge (default)
```

### Production Environment (Render)
```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/voiceforge_prod
SESSION_SECRET=production-secret-key-min-32-chars
ADMIN_TOKEN=production-admin-token
# Use HF Spaces API
USE_HF_SPACES_ML=true
HF_ML_API_URL=https://chrisdemonxxx-voiceforge-v1-0.hf.space
```

### Production Environment (HF Spaces)
```bash
NODE_ENV=production
PORT=7860
DATABASE_URL=postgresql://user:pass@host:5432/voiceforge_prod
SESSION_SECRET=production-secret-key-min-32-chars
# Use local Python Bridge (GPU available)
CUDA_VISIBLE_DEVICES=0
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
HF_HOME=/app/ml-cache
TRANSFORMERS_CACHE=/app/ml-cache
TORCH_HOME=/app/ml-cache
```

## ML Client Switching Logic

The ML client automatically switches based on environment variables:

```typescript
const USE_HF_SPACES = process.env.USE_HF_SPACES_ML === "true" || process.env.HF_ML_API_URL !== undefined;
export const mlClient = USE_HF_SPACES ? hfSpacesClient : pythonBridge;
```

### Switching Behavior
1. **HF Spaces Mode**: Enabled if `USE_HF_SPACES_ML=true` OR `HF_ML_API_URL` is set
2. **Python Bridge Mode**: Enabled if neither variable is set
3. **Priority**: `HF_ML_API_URL` takes precedence if both are set

## Verification

### Check Current Configuration
```bash
# Check which ML client is being used
echo $USE_HF_SPACES_ML
echo $HF_ML_API_URL

# Check database connection
echo $DATABASE_URL

# Check security configuration
echo $SESSION_SECRET
```

### Test ML Client Switching
```typescript
// In server code
console.log("ML Client:", USE_HF_SPACES ? "HF Spaces" : "Python Bridge");
console.log("HF Spaces URL:", process.env.HF_ML_API_URL);
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for `SESSION_SECRET` (at least 32 characters)
3. **Rotate secrets** periodically in production
4. **Use environment-specific** configurations
5. **Restrict access** to environment variables in production

## Troubleshooting

### ML Client Not Switching
- Check if `USE_HF_SPACES_ML` is set to `"true"` (string, not boolean)
- Check if `HF_ML_API_URL` is set
- Verify environment variables are loaded correctly

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database server is running
- Verify network connectivity

### HF Spaces Connection Issues
- Verify `HF_ML_API_URL` is correct
- Check HF Spaces is accessible
- Verify network connectivity
- Check HF Spaces health endpoint

### Python Bridge Issues
- Verify Python 3.10+ is installed
- Check ML dependencies are installed
- Verify GPU is available (if using GPU)
- Check worker pools are initialized

## References

- [ML Services Verification](./ML-SERVICES-VERIFICATION.md)
- [Deployment Guide](./DEPLOYMENT-READY.md)
- [API Documentation](./README.md)

