#!/bin/bash
# Startup script that removes vite imports before starting

set -e

echo "🔧 Cleaning up before starting..."

# Delete vite files
rm -f server/vite.ts vite.config.ts

# Remove vite import from server/index.ts if it exists (repository version might have it)
if [ -f "server/index.ts" ]; then
    # Use a safer approach - create a temp file without vite imports
    grep -v "from.*vite" server/index.ts | grep -v "import.*vite" | grep -v "setupVite" | grep -v "serveStatic" > server/index.ts.tmp 2>/dev/null || cp server/index.ts server/index.ts.tmp
    mv server/index.ts.tmp server/index.ts 2>/dev/null || true
fi

# Remove any Python ML service files that shouldn't exist
find server -name "*.py" -type f -delete 2>/dev/null || true
find server -type d -name "ml-services" -exec rm -rf {} + 2>/dev/null || true

# Remove PythonBridge and ML client files if they exist
rm -f server/python-bridge.ts server/python-bridge.js 2>/dev/null || true
rm -f server/ml-client.ts server/ml-client.js 2>/dev/null || true
rm -f server/hf-spaces-client.ts server/hf-spaces-client.js 2>/dev/null || true

echo "✅ Starting server..."
exec npx tsx server/index.ts

