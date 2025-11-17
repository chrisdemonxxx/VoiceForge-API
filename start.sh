#!/bin/bash
# Startup script that removes vite imports before starting

set -e

echo "🔧 Removing vite files and imports..."

# Delete vite files
rm -f server/vite.ts vite.config.ts

# Remove vite import from server/index.ts if it exists
if [ -f "server/index.ts" ]; then
    # Remove lines that import from vite (be more specific to avoid removing log function)
    sed -i '/^import.*from.*["'\''].*vite/d' server/index.ts || true
    sed -i '/^import.*setupVite/d' server/index.ts || true
    sed -i '/^import.*serveStatic/d' server/index.ts || true
    # Remove setupVite calls (but not log calls)
    sed -i '/setupVite(/d' server/index.ts || true
    sed -i '/serveStatic(/d' server/index.ts || true
    echo "✅ Cleaned server/index.ts"
fi

# Remove any Python ML service files that shouldn't exist
find server -name "*.py" -type f -delete 2>/dev/null || true
find server -type d -name "ml-services" -exec rm -rf {} + 2>/dev/null || true

echo "✅ Starting server..."
exec npx tsx server/index.ts

