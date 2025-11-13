#!/bin/bash
# VoiceForge API - Hugging Face Spaces Deployment Script
# This script helps you deploy VoiceForge API to Hugging Face Spaces

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      VoiceForge API - Hugging Face Deployment Helper          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️  Git repository not initialized. Initializing..."
    git init
    git add .
    git commit -m "Initial commit: VoiceForge API"
    echo "✓ Git repository initialized"
fi

echo "📋 Deployment Checklist:"
echo ""
echo "1. Create Hugging Face Space:"
echo "   → Visit: https://huggingface.co/spaces"
echo "   → Click 'Create new Space'"
echo "   → Name: voiceforge-api (or your choice)"
echo "   → SDK: Docker"
echo "   → Hardware: CPU basic (upgrade later)"
echo ""

read -p "Press Enter when you've created the Space..."

echo ""
echo "2. Get your Space Git URL:"
read -p "   Enter Space URL (e.g., https://huggingface.co/spaces/username/voiceforge-api): " SPACE_URL

# Extract username and space name from URL
SPACE_PATH=$(echo $SPACE_URL | sed 's|https://huggingface.co/spaces/||')

echo ""
echo "3. Hugging Face authentication:"
echo "   You'll need a Hugging Face token with write access"
echo "   → Get token from: https://huggingface.co/settings/tokens"
read -p "   Enter your Hugging Face token: " HF_TOKEN

# Configure git remote
GIT_URL="https://oauth2:${HF_TOKEN}@huggingface.co/spaces/${SPACE_PATH}"

if git remote get-url origin &>/dev/null; then
    echo "   Updating existing origin remote..."
    git remote set-url origin $GIT_URL
else
    echo "   Adding Hugging Face as origin remote..."
    git remote add origin $GIT_URL
fi

echo "✓ Git remote configured"
echo ""

echo "4. Pushing code to Hugging Face Space..."
git add .
git commit -m "Deploy VoiceForge API to Hugging Face Spaces" || echo "No changes to commit"
git push -u origin main

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    🚀 DEPLOYMENT STARTED!                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "✓ Code pushed to Hugging Face Space"
echo "✓ Build will start automatically (10-15 minutes)"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure environment secrets:"
echo "   → Go to: ${SPACE_URL}/settings"
echo "   → Click 'Repository secrets'"
echo "   → Add required secrets (see .env.production.example)"
echo ""
echo "2. Upgrade to A100 GPU:"
echo "   → Go to: ${SPACE_URL}/settings"
echo "   → Click 'Hardware'"
echo "   → Select 'A100 - 80GB' (\$4.13/hour)"
echo "   → Configure sleep time: 3600 (1 hour recommended)"
echo ""
echo "3. Monitor build progress:"
echo "   → Go to: ${SPACE_URL}"
echo "   → Click 'Logs' tab"
echo "   → Wait for 'Running' status"
echo ""
echo "4. Test deployment:"
echo "   → curl ${SPACE_URL}/api/health"
echo ""
echo "📚 Full documentation: README-DEPLOYMENT.md"
echo ""
echo "🎉 Happy deploying!"
echo ""
