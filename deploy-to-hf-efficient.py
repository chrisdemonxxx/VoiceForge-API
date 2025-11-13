#!/usr/bin/env python3
"""
Efficient deployment script for Hugging Face Space
Uploads only essential files for Gradio UI deployment
"""

import os
import sys
from pathlib import Path
from huggingface_hub import HfApi, login

# Configuration
REPO_ID = "chrisdemonxxx/voiceforge_v1.0"
SPACE_URL = "https://chrisdemonxxx-voiceforge-v1-0.hf.space"

# Get token
token = os.environ.get("HF_TOKEN")
if not token:
    print("❌ ERROR: HF_TOKEN environment variable not set")
    print("Get your token from: https://huggingface.co/settings/tokens")
    sys.exit(1)

print("╔════════════════════════════════════════════════════════════════╗")
print("║     VoiceForge - Efficient Deployment to HF Space            ║")
print("╚════════════════════════════════════════════════════════════════╝")
print(f"\nSpace: {REPO_ID}")
print(f"URL: {SPACE_URL}\n")

# Login
try:
    login(token=token)
    print("✅ Authenticated with Hugging Face\n")
except Exception as e:
    print(f"❌ Authentication failed: {e}")
    sys.exit(1)

# Initialize API
api = HfApi()

# Essential files to upload (in order of importance)
ESSENTIAL_FILES = [
    # Core deployment files
    "app.py",
    "gradio_app.py",
    "Dockerfile",
    "requirements-deployment.txt",
    "requirements-build.txt",
    "SPACE_CONFIG.yaml",
    
    # Configuration files
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "drizzle.config.ts",
    "vite.config.ts",
    "postcss.config.js",
    "tailwind.config.ts",
    "components.json",
    
    # Documentation
    "README.md",
    "LICENSE",
]

# Essential directories (will be uploaded as folders)
ESSENTIAL_DIRS = [
    "server",
    "shared",
    "db",
    "migrations",
]

print("📦 Uploading essential files...")
print("=" * 80)

# Upload files
uploaded = 0
failed = 0

for file_path in ESSENTIAL_FILES:
    if os.path.exists(file_path):
        try:
            print(f"  Uploading: {file_path}...", end=" ", flush=True)
            api.upload_file(
                path_or_fileobj=file_path,
                path_in_repo=file_path,
                repo_id=REPO_ID,
                repo_type="space",
                commit_message=f"Deploy: {file_path} - Gradio UI + Worker Pool Fixes"
            )
            print("✅")
            uploaded += 1
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1
    else:
        print(f"  ⚠️  {file_path} (not found, skipping)")

print(f"\n✅ Uploaded {uploaded} files")
if failed > 0:
    print(f"❌ Failed to upload {failed} files")

# Upload directories using upload_folder for each
print("\n📂 Uploading essential directories...")
print("=" * 80)

for dir_path in ESSENTIAL_DIRS:
    if os.path.isdir(dir_path):
        try:
            print(f"  Uploading: {dir_path}/...", end=" ", flush=True)
            api.upload_folder(
                folder_path=dir_path,
                path_in_repo=dir_path,
                repo_id=REPO_ID,
                repo_type="space",
                commit_message=f"Deploy: {dir_path}/ - Gradio UI + Worker Pool Fixes",
                ignore_patterns=["__pycache__/*", "*.pyc", ".DS_Store"]
            )
            print("✅")
            uploaded += 1
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1
    else:
        print(f"  ⚠️  {dir_path}/ (not found, skipping)")

print("\n" + "=" * 80)
print("╔════════════════════════════════════════════════════════════════╗")
print("║                    ✅ DEPLOYMENT COMPLETE!                     ║")
print("╚════════════════════════════════════════════════════════════════╝")
print(f"\n📊 Space URL: {SPACE_URL}")
print("⏱️  Build time: ~10-15 minutes")
print("\n🧪 After build completes:")
print("   1. Open Gradio UI: " + SPACE_URL)
print("   2. Test all modules using the Gradio interface")
print("   3. Check logs if any issues occur")
print("\n📝 Key Changes Deployed:")
print("   ✅ Gradio UI (replaces Express frontend)")
print("   ✅ Python worker pool fixes")
print("   ✅ Automatic retry logic")
print("   ✅ Better error handling")
print("")

