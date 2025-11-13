#!/bin/bash
# VoiceForge API - Simple Hugging Face Deployment
# Deploys directly from Replit to HF Space using git

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      VoiceForge API - Hugging Face Direct Deployment          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
SPACE_ID="Chrisdemonxxx/VoiceForgeAI"
SPACE_URL="https://huggingface.co/spaces/${SPACE_ID}"
GIT_URL="https://huggingface.co/spaces/${SPACE_ID}.git"

# Check HF_TOKEN
if [ -z "$HF_TOKEN" ]; then
    echo "❌ Error: HF_TOKEN environment variable not set"
    exit 1
fi

echo "✓ Space ID: ${SPACE_ID}"
echo "✓ Token configured"
echo ""

# Create temporary deployment directory
DEPLOY_DIR=$(mktemp -d)
echo "📦 Creating deployment package in: ${DEPLOY_DIR}"

# Copy essential deployment files
echo "   → Copying core files..."
cp Dockerfile "${DEPLOY_DIR}/"
cp app.py "${DEPLOY_DIR}/"
cp requirements-deployment.txt "${DEPLOY_DIR}/"
cp .dockerignore "${DEPLOY_DIR}/"
cp package.json "${DEPLOY_DIR}/"
cp package-lock.json "${DEPLOY_DIR}/"
cp tsconfig.json "${DEPLOY_DIR}/"
cp tailwind.config.ts "${DEPLOY_DIR}/"
cp postcss.config.js "${DEPLOY_DIR}/"
cp vite.config.ts "${DEPLOY_DIR}/"
cp drizzle.config.ts "${DEPLOY_DIR}/"

echo "   → Copying documentation..."
cp README.md "${DEPLOY_DIR}/" 2>/dev/null || true
cp LICENSE "${DEPLOY_DIR}/" 2>/dev/null || true
cp LICENSES.md "${DEPLOY_DIR}/" 2>/dev/null || true

echo "   → Copying application code..."
cp -r client "${DEPLOY_DIR}/"
cp -r server "${DEPLOY_DIR}/"
cp -r shared "${DEPLOY_DIR}/"
cp -r db "${DEPLOY_DIR}/"
cp -r public "${DEPLOY_DIR}/" 2>/dev/null || mkdir -p "${DEPLOY_DIR}/public"

echo "   ✓ Files copied"

# Initialize git in deployment directory
cd "${DEPLOY_DIR}"
git init
git config user.name "VoiceForge Deployment"
git config user.email "deploy@voiceforge.ai"

# Configure git credential helper
git config credential.helper store
echo "https://oauth2:${HF_TOKEN}@huggingface.co" > ~/.git-credentials

# Add HF Space as remote
git remote add origin "${GIT_URL}"

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
__pycache__/
*.pyc
ml-cache/
.cache/
EOF

# Add all files
git add .
git commit -m "Deploy VoiceForge API v1.0 - Production Ready

- Multi-stage Dockerfile for L40S GPU (62GB)
- Complete ML stack: TTS, STT, VAD, VLLM
- Production-ready configuration
- Full documentation and licensing"

echo ""
echo "🚀 Pushing to Hugging Face Space..."
echo ""

# Push to HF Space
if git push -f origin main; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  🎉 DEPLOYMENT SUCCESSFUL!                     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "✓ VoiceForge API deployed to: ${SPACE_URL}"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Configure environment secrets:"
    echo "   → ${SPACE_URL}/settings"
    echo "   → Add DATABASE_URL and other secrets"
    echo ""
    echo "2. Upgrade to L40S GPU:"
    echo "   → ${SPACE_URL}/settings"
    echo "   → Hardware: Select 'Nvidia L40S' (62GB, \$1.80/hour)"
    echo "   → Sleep time: 3600 seconds (1 hour)"
    echo ""
    echo "3. Monitor build:"
    echo "   → ${SPACE_URL}"
    echo "   → Check 'Logs' tab (build takes 10-15 minutes)"
    echo ""
    echo "4. Test deployment:"
    echo "   → curl https://chrisdemonxxx-voiceforgeai.hf.space/api/health"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "   Check error messages above"
    exit 1
fi

# Cleanup
cd /
rm -rf "${DEPLOY_DIR}"
rm -f ~/.git-credentials

echo "🧹 Cleanup complete"
echo ""
echo "🎉 Your Voice AI platform is live!"
echo ""
