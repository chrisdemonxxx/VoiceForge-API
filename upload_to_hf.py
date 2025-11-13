#!/usr/bin/env python3
"""Upload VoiceForge to Hugging Face Space"""
from huggingface_hub import HfApi, login
import os
import sys

# Get token from environment variable
token = os.environ.get("HF_TOKEN")
if not token:
    print("❌ Error: HF_TOKEN environment variable not set")
    print("Usage: HF_TOKEN=your_token python3 upload_to_hf.py")
    sys.exit(1)

login(token=token)

# Initialize API
api = HfApi()

# Upload the entire repository
print("Uploading VoiceForge to Hugging Face Space...")
print("This may take a few minutes...")

try:
    api.upload_folder(
        folder_path=".",
        repo_id="chrisdemonxxx/voiceforge_v1.0",
        repo_type="space",
        commit_message="Deploy VoiceForge from Claude Code",
        ignore_patterns=[".git/*", ".github/*", "*.tar.gz", "__pycache__/*", "node_modules/*", ".env"],
    )
    print("\n✅ Successfully uploaded to Hugging Face Space!")
    print("🚀 View your space at: https://huggingface.co/spaces/chrisdemonxxx/voiceforge_v1.0")
except Exception as e:
    print(f"\n❌ Error uploading: {e}")
    print("\nTrying alternative method...")
    # Try uploading just key files
    files_to_upload = [
        "app.py",
        "main.py",
        "Dockerfile",
        "requirements-deployment.txt",
        "SPACE_CONFIG.yaml"
    ]
    for file in files_to_upload:
        if os.path.exists(file):
            try:
                api.upload_file(
                    path_or_fileobj=file,
                    path_in_repo=file,
                    repo_id="chrisdemonxxx/voiceforge_v1.0",
                    repo_type="space",
                )
                print(f"✓ Uploaded {file}")
            except Exception as e2:
                print(f"✗ Failed to upload {file}: {e2}")
