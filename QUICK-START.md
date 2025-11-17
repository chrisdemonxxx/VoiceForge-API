# Quick Start Guide

## Prerequisites
✅ All dependencies are installed
✅ TypeScript configuration is set up
✅ Streaming pipeline is ready

## Starting the Server

### Option 1: Using the start script
```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
./start-server.sh
```

### Option 2: Using npm
```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
npm run dev
```

### Option 3: Manual start
```bash
cd /mnt/projects/projects/VoiceForgev1.0/Voiceforge
export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
export PORT=5000
npx tsx server/index.ts
```

## What to Expect

When the server starts, you should see:
```
[Server] Checking database initialization...
[Server] Created default API key: <key>
[Routes] TrueVoiceStreaming pipeline enabled
serving on port 5000
```

## Testing

1. **Check server health:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Get API key:**
   ```bash
   curl http://localhost:5000/api/api-keys
   ```

3. **Make a test call** (see TEST-CALL-READY.md for details)

## Troubleshooting

### "Cannot find module" errors
- Make sure you're in the correct directory: `/mnt/projects/projects/VoiceForgev1.0/Voiceforge`
- Run `npm install` if dependencies are missing

### Port already in use
- Change PORT: `export PORT=5001`
- Or stop the process using port 5000

### Database connection errors
- Set DATABASE_URL environment variable
- Ensure PostgreSQL is running

## Next Steps

1. Start the server
2. Create a Twilio provider
3. Make a test call
4. Monitor logs for streaming pipeline activity

See `TEST-CALL-READY.md` for detailed testing instructions.

