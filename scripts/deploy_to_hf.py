#!/usr/bin/env python3
"""
Direct deployment script for HuggingFace Spaces
Bypasses GitHub sync by uploading files directly to HF using the Hub API
"""

import os
import sys
from pathlib import Path
from huggingface_hub import HfApi, CommitOperationAdd

# Configuration
SPACE_ID = "Chrisdemonxxx/VoiceForgeAI"
HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")

if not HF_TOKEN:
    print("❌ ERROR: HF_TOKEN or HUGGINGFACE_TOKEN environment variable not set")
    sys.exit(1)

print("=" * 80)
print("🚀 Direct Deployment to HuggingFace Spaces")
print("=" * 80)
print(f"Space: {SPACE_ID}")
print(f"Token: {HF_TOKEN[:10]}..." if HF_TOKEN else "❌ Missing")
print("=" * 80)

# Files to upload (critical files for Docker build)
files_to_upload = [
    "Dockerfile",
    "app.py",
    "requirements-deployment.txt",
    "requirements-build.txt",
    "package.json",
    "package-lock.json",
    "README.md",
    "tsconfig.json",
    "drizzle.config.ts",
    "vite.config.ts",
    ".dockerignore",
]

# Directories to upload
dirs_to_upload = [
    "server",
    "client",
    "shared",
    "db",
    ".github",
]

print("\n📦 Preparing files for upload...")

# Initialize HF API
api = HfApi()

operations = []

# Add individual files
for file_path in files_to_upload:
    if Path(file_path).exists():
        print(f"  ✓ {file_path}")
        operations.append(
            CommitOperationAdd(
                path_in_repo=file_path,
                path_or_fileobj=file_path,
            )
        )
    else:
        print(f"  ⚠️  {file_path} (not found, skipping)")

# Add directories recursively
for dir_path in dirs_to_upload:
    if Path(dir_path).exists():
        for file in Path(dir_path).rglob("*"):
            if file.is_file():
                # Skip node_modules, .git, etc.
                if any(skip in str(file) for skip in ["node_modules", ".git", "__pycache__", "dist", ".cache"]):
                    continue
                
                print(f"  ✓ {file}")
                operations.append(
                    CommitOperationAdd(
                        path_in_repo=str(file),
                        path_or_fileobj=str(file),
                    )
                )
    else:
        print(f"  ⚠️  {dir_path}/ (not found, skipping)")

print(f"\n📊 Total files to upload: {len(operations)}")

if not operations:
    print("❌ No files to upload!")
    sys.exit(1)

print("\n🚀 Uploading to HuggingFace Spaces...")
print("=" * 80)

try:
    commit_info = api.create_commit(
        repo_id=SPACE_ID,
        repo_type="space",
        operations=operations,
        commit_message="Direct deploy: Fix Python 3.10 compatibility (bypass GitHub sync)",
        token=HF_TOKEN,
    )
    
    print("\n✅ Upload successful!")
    print(f"Commit: {commit_info.commit_url}")
    print("\n🔄 HuggingFace Spaces will now rebuild with Python 3.10 fixes...")
    print(f"Monitor at: https://huggingface.co/spaces/{SPACE_ID}")
    
except Exception as e:
    print(f"\n❌ Upload failed: {e}")
    sys.exit(1)

print("=" * 80)
print("✅ Deployment complete! Check HF Spaces for build status.")
print("=" * 80)
