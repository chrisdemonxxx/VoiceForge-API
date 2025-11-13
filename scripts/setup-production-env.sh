#!/bin/bash
# Production Environment Setup Script
# This script helps set up environment variables for production deployment

set -e

echo "=========================================="
echo "VoiceForge Production Environment Setup"
echo "=========================================="
echo ""

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    echo "⚠️  .env.production already exists!"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Get DATABASE_URL
echo "📊 Database Configuration"
echo "Please provide your PostgreSQL DATABASE_URL"
echo "Format: postgresql://user:password@host:port/database"
read -p "DATABASE_URL: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is required!"
    exit 1
fi

# Confirm HF Spaces URL
echo ""
echo "🤖 ML Services Configuration"
read -p "HF Spaces URL [https://chrisdemonxxx-voiceforge-v1-0.hf.space]: " HF_URL
HF_URL=${HF_URL:-https://chrisdemonxxx-voiceforge-v1-0.hf.space}

# Generated secrets (from DEPLOYMENT-SECRETS.md)
ADMIN_TOKEN="7f079d155271b8067811cc0885393c8ef12312cd6df83695b6b96992adf52162"
SESSION_SECRET="e67b7e405d4d44293c6e6bf46d42c7837ff84a01600a0432abef24f1800ab66a"

# Create .env.production file
cat > .env.production << EOF
# VoiceForge Production Environment Variables
# Generated: $(date)
# DO NOT commit this file to Git!

# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DATABASE_URL=${DATABASE_URL}

# Security Configuration
ADMIN_TOKEN=${ADMIN_TOKEN}
SESSION_SECRET=${SESSION_SECRET}

# ML Services Configuration
USE_HF_SPACES_ML=true
HF_ML_API_URL=${HF_URL}
EOF

echo ""
echo "✅ .env.production file created!"
echo ""
echo "📝 Next steps:"
echo "1. Review .env.production file"
echo "2. Test locally: npm start"
echo "3. Deploy to Render and Vercel"
echo ""
echo "⚠️  Remember: DO NOT commit .env.production to Git!"


