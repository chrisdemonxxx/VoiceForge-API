#!/bin/bash
# Automated Fix for Render Deployment - Run this in Render Shell

set -e

echo "=========================================="
echo "Automated Render Deployment Fix"
echo "=========================================="
echo ""

# Step 1: Navigate to project directory
echo "Step 1: Navigating to project directory..."
cd /opt/render/project/src || cd /opt/render/project/src 2>/dev/null || pwd
PROJECT_DIR=$(pwd)
echo "✅ Current directory: $PROJECT_DIR"
echo ""

# Step 2: Delete vite files
echo "Step 2: Removing vite files..."
rm -f server/vite.ts
rm -f vite.config.ts

# Verify deletion
if [ -f "server/vite.ts" ]; then
    echo "⚠️  Warning: server/vite.ts still exists"
else
    echo "✅ server/vite.ts deleted"
fi

if [ -f "vite.config.ts" ]; then
    echo "⚠️  Warning: vite.config.ts still exists"
else
    echo "✅ vite.config.ts deleted"
fi
echo ""

# Step 3: Verify package.json has correct start command
echo "Step 3: Verifying package.json..."
if [ -f "package.json" ]; then
    if grep -q '"start": "npx tsx server/index.ts"' package.json; then
        echo "✅ Start command is correct: npx tsx server/index.ts"
    else
        echo "⚠️  Start command may need updating in Render dashboard"
        echo "   Should be: npx tsx server/index.ts"
    fi
    
    if grep -q '"tsx"' package.json && grep -q '"dependencies"' package.json; then
        if grep -A 20 '"dependencies"' package.json | grep -q '"tsx"'; then
            echo "✅ tsx is in dependencies"
        else
            echo "⚠️  tsx may not be in dependencies"
        fi
    fi
else
    echo "❌ package.json not found"
fi
echo ""

# Step 4: List current files
echo "Step 4: Current server directory contents:"
ls -la server/ 2>/dev/null | head -10 || echo "Server directory not found"
echo ""

echo "=========================================="
echo "✅ Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Go to Render Dashboard → Events tab"
echo "  2. Click 'Manual Deploy' → 'Clear build cache & deploy'"
echo "  3. Wait 2-5 minutes for deployment"
echo ""
echo "Or the service will auto-redeploy if configured."
echo ""

