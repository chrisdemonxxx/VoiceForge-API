#!/bin/bash
# VoiceForge - Push to Hugging Face Space
# Quick deployment script for HF Spaces

set -e

# Configuration
SPACE_REPO="chrisdemonxxx/voiceforge_v1.0"
HF_SPACE_URL="https://chrisdemonxxx-voiceforge-v1-0.hf.space"

# Check for HF token
if [ -z "$HF_TOKEN" ]; then
    echo "❌ ERROR: HF_TOKEN environment variable not set"
    echo ""
    echo "To get your HF token:"
    echo "1. Visit: https://huggingface.co/settings/tokens"
    echo "2. Create a new token with 'write' permissions"
    echo "3. Export it: export HF_TOKEN=hf_your_token_here"
    echo ""
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     VoiceForge - Push to Hugging Face Space                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Space: $SPACE_REPO"
echo "URL: $HF_SPACE_URL"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📁 Using temp directory: $TEMP_DIR"

cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Clone the HF Space repository
echo ""
echo "📥 Cloning HuggingFace Space..."
git clone "https://oauth2:${HF_TOKEN}@huggingface.co/spaces/${SPACE_REPO}" "$TEMP_DIR" 2>&1 | grep -v "Cloning\|remote:" || {
    echo "❌ Failed to clone Space. Check your HF_TOKEN and Space name."
    exit 1
}

cd "$TEMP_DIR"

# Copy critical files from project root
echo ""
echo "📦 Copying files to Space..."

# Essential files
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
    "postcss.config.js"
    "tailwind.config.ts"
    "components.json"
    "SPACE_CONFIG.yaml"
)

PROJECT_ROOT="/home/cjs/.cursor/worktrees/Voiceforge/lDYRA"

for file in "${FILES_TO_COPY[@]}"; do
    if [ -f "$PROJECT_ROOT/$file" ]; then
        cp "$PROJECT_ROOT/$file" "$file"
        echo "  ✓ $file"
    else
        echo "  ⚠️  $file (not found, skipping)"
    fi
done

# Copy essential directories
echo ""
echo "📂 Copying directories..."

DIRS_TO_COPY=(
    "server"
    "client"
    "shared"
    "db"
    "migrations"
)

for dir in "${DIRS_TO_COPY[@]}"; do
    if [ -d "$PROJECT_ROOT/$dir" ]; then
        rm -rf "$dir"
        cp -r "$PROJECT_ROOT/$dir" "$dir"
        echo "  ✓ $dir/"
    else
        echo "  ⚠️  $dir/ (not found, skipping)"
    fi
done

# Check for changes
echo ""
echo "🔍 Checking for changes..."
if git diff --quiet && git diff --cached --quiet; then
    echo "⚠️  No changes detected. Space is already up to date."
    echo ""
    echo "To force update, you can:"
    echo "1. Make a small change to README.md"
    echo "2. Or factory reboot the Space from HF dashboard"
    exit 0
fi

# Commit and push
echo ""
echo "💾 Committing changes..."
git config user.email "deploy@voiceforge.ai"
git config user.name "VoiceForge Deploy Bot"
git add -A
git commit -m "Deploy VoiceForge API updates - $(date +%Y-%m-%d)" || {
    echo "⚠️  No changes to commit"
    exit 0
}

echo ""
echo "🚀 Pushing to HuggingFace Space..."
git push origin main

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOYMENT COMPLETE!                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Monitor build: $HF_SPACE_URL"
echo "⏱️  Build time: ~10-15 minutes"
echo ""
echo "🧪 Test after deployment:"
echo "   npx tsx test-hf-spaces-api.ts"
echo ""
echo "🔄 To factory reboot (if needed):"
echo "   Go to Space Settings → Danger Zone → Factory Reboot"
echo ""

