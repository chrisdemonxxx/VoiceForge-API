#!/bin/bash
# Startup script that removes vite imports before starting

set -e

echo "🔧 Removing vite files and imports..."

# Delete vite files
rm -f server/vite.ts vite.config.ts

# Remove any Python ML service files that shouldn't exist
find server -name "*.py" -type f -delete 2>/dev/null || true
find server -type d -name "ml-services" -exec rm -rf {} + 2>/dev/null || true

echo "✅ Starting server..."
exec npx tsx server/index.ts

