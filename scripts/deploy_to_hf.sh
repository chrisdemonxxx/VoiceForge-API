#!/bin/bash
# Direct deployment to HuggingFace Spaces using Git over HTTPS
# This uploads the current Dockerfile with Python 3.10 fixes

set -e

SPACE_REPO="Chrisdemonxxx/VoiceForgeAI"
HF_TOKEN="${HF_TOKEN:-$HUGGINGFACE_TOKEN}"

if [ -z "$HF_TOKEN" ]; then
    echo "❌ ERROR: HF_TOKEN or HUGGINGFACE_TOKEN not set"
    exit 1
fi

echo "================================================================================"
echo "🚀 Direct Deployment to HuggingFace Spaces"
echo "================================================================================"
echo "Space: $SPACE_REPO"
echo "Method: Git over HTTPS"
echo "================================================================================"

# Create temporary directory for HF Space clone
TEMP_DIR=$(mktemp -d)
echo "📁 Temp directory: $TEMP_DIR"

cleanup() {
    echo "🧹 Cleaning up..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Clone the HF Space repository
echo ""
echo "📥 Cloning HuggingFace Space..."
git clone "https://user:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}" "$TEMP_DIR" 2>&1 | grep -v "Cloning\|remote:" || true

cd "$TEMP_DIR"

# Copy critical files
echo ""
echo "📦 Copying updated files..."

FILES_TO_COPY=(
    "Dockerfile"
    "app.py"
    "requirements-deployment.txt"
    "requirements-build.txt"
    "README.md"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "drizzle.config.ts"
    "vite.config.ts"
    ".dockerignore"
)

for file in "${FILES_TO_COPY[@]}"; do
    if [ -f "/home/runner/workspace/$file" ]; then
        cp "/home/runner/workspace/$file" "$file"
        echo "  ✓ $file"
    else
        echo "  ⚠️  $file (not found)"
    fi
done

# Copy directories
echo ""
echo "📂 Copying directories..."

DIRS_TO_COPY=(
    "server"
    "client"
    "shared"
    "db"
    ".github"
)

for dir in "${DIRS_TO_COPY[@]}"; do
    if [ -d "/home/runner/workspace/$dir" ]; then
        rm -rf "$dir"
        cp -r "/home/runner/workspace/$dir" "$dir"
        echo "  ✓ $dir/"
    else
        echo "  ⚠️  $dir/ (not found)"
    fi
done

# Check for changes
echo ""
echo "🔍 Checking for changes..."
if git diff --quiet && git diff --cached --quiet; then
    echo "⚠️  No changes detected. Space is already up to date."
    exit 0
fi

# Commit and push
echo ""
echo "💾 Committing changes..."
git config user.email "deploy@voiceforge.ai"
git config user.name "VoiceForge Deploy Bot"
git add -A
git commit -m "Direct deploy: Fix Python 3.10 compatibility (bypass GitHub sync)"

echo ""
echo "🚀 Pushing to HuggingFace Spaces..."
git push origin main

echo ""
echo "================================================================================"
echo "✅ Deployment complete!"
echo "================================================================================"
echo "🔄 HuggingFace Spaces will now rebuild with Python 3.10 fixes"
echo "📊 Monitor build: https://huggingface.co/spaces/$SPACE_REPO"
echo "================================================================================"
