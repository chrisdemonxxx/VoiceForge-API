#!/bin/bash
# Startup script that removes vite imports before starting

set -e

echo "🔧 Removing vite files and imports..."

# Delete vite files
rm -f server/vite.ts vite.config.ts

# Remove vite import from server/index.ts if it exists
if [ -f "server/index.ts" ]; then
    # Remove lines that import from vite
    sed -i '/import.*from.*["'\''].*vite/d' server/index.ts || true
    sed -i '/from.*["'\''].*vite/d' server/index.ts || true
    # Remove setupVite calls
    sed -i '/setupVite/d' server/index.ts || true
    # Remove serveStatic calls related to vite
    sed -i '/serveStatic/d' server/index.ts || true
    echo "✅ Cleaned server/index.ts"
fi

echo "✅ Starting server..."
exec npx tsx server/index.ts

