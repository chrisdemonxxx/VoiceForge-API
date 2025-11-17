#!/bin/bash

# Start Server Script for Streaming Pipeline Testing

export TRUEVOICE_API_KEY=tv_a4ee73d8-d97f-06b5-4abd-06f702c5ec80
export PORT=5000

echo "=========================================="
echo "Starting VoiceForge Server"
echo "=========================================="
echo ""
echo "Environment:"
echo "  TRUEVOICE_API_KEY: ${TRUEVOICE_API_KEY:0:20}..."
echo "  PORT: $PORT"
echo ""
echo "Starting server with: npx tsx server/index.ts"
echo ""

npx tsx server/index.ts

