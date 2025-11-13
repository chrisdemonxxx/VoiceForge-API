#!/usr/bin/env python3
"""
VoiceForge API - Hugging Face Spaces Deployment Script
Deploys VoiceForge API to Hugging Face Spaces using Hub API
"""

import os
import sys
import shutil
import tempfile
from pathlib import Path
from huggingface_hub import HfApi, SpaceHardware

def create_staging_directory():
    """Create a clean staging directory with only deployment files"""
    print("📦 Creating deployment staging directory...")
    
    # Create temporary staging directory
    staging_dir = tempfile.mkdtemp(prefix="voiceforge_deploy_")
    print(f"   → Staging: {staging_dir}")
    
    # Source directory (current workspace)
    source_dir = Path.cwd()
    
    # Files and directories to include
    include_patterns = [
        # Deployment configuration
        "Dockerfile",
        ".dockerignore",
        "app.py",
        "requirements-deployment.txt",
        "SPACE_CONFIG.yaml",
        
        # Documentation
        "README.md",
        "README-DEPLOYMENT.md",
        "DEPLOYMENT-SUMMARY.md",
        "DEPLOYMENT-READY.md",
        "LICENSE",
        "LICENSES.md",
        
        # Application code
        "client/**/*",
        "server/**/*",
        "shared/**/*",
        "db/**/*",
        "public/**/*",
        
        # Configuration files
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "tailwind.config.ts",
        "postcss.config.js",
        "vite.config.ts",
        "drizzle.config.ts",
        
        # Environment template
        ".env.production.example",
    ]
    
    # Directories to exclude
    exclude_dirs = {
        'node_modules', 'dist', '.git', '.pythonlibs', '__pycache__',
        'ml-cache', '.cache', 'attached_assets', 'scripts'
    }
    
    # Copy files to staging
    files_copied = 0
    for item in source_dir.rglob('*'):
        # Skip excluded directories
        if any(excluded in item.parts for excluded in exclude_dirs):
            continue
            
        # Skip hidden files except specific ones
        if item.name.startswith('.') and item.name not in ['.dockerignore', '.env.production.example']:
            continue
            
        # Get relative path
        rel_path = item.relative_to(source_dir)
        dest_path = Path(staging_dir) / rel_path
        
        # Copy file or create directory
        if item.is_file():
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_path)
            files_copied += 1
        elif item.is_dir() and not dest_path.exists():
            dest_path.mkdir(parents=True, exist_ok=True)
    
    print(f"   ✓ Copied {files_copied} files")
    
    # Create .hfignore (similar to .gitignore for HF)
    hfignore_content = """# VoiceForge API - Hugging Face Ignore
# Exclude build artifacts and cache

node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.replit
replit.nix
.pythonlibs/
__pycache__/
*.pyc
ml-cache/
.cache/
attached_assets/
scripts/
"""
    
    hfignore_path = Path(staging_dir) / ".hfignore"
    hfignore_path.write_text(hfignore_content)
    print("   ✓ Created .hfignore")
    
    return staging_dir


def deploy_to_space(staging_dir: str, space_id: str, token: str):
    """Deploy files to Hugging Face Space using Hub API"""
    print(f"\n🚀 Deploying to Hugging Face Space: {space_id}")
    
    api = HfApi(token=token)
    
    # Ensure Space exists (safe - won't fail if already exists)
    try:
        print("   → Ensuring Space exists...")
        api.create_repo(
            repo_id=space_id,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True
        )
        print("   ✓ Space repository ready")
    except Exception as e:
        print(f"   ⚠️  Space creation skipped: {e}")
    
    # Upload all files
    print("   → Uploading files to Space...")
    try:
        api.upload_folder(
            repo_id=space_id,
            repo_type="space",
            folder_path=staging_dir,
            commit_message="Deploy VoiceForge API v1.0 - Production Ready",
            ignore_patterns=[
                ".hfignore",
                "node_modules/**",
                "dist/**",
                ".cache/**",
                "__pycache__/**",
                "*.pyc",
                "*.log"
            ]
        )
        print("   ✓ Files uploaded successfully!")
    except Exception as e:
        print(f"   ❌ Upload failed: {e}")
        return False
    
    return True


def configure_space_hardware(space_id: str, token: str):
    """Configure Space hardware settings"""
    print(f"\n⚙️  Configuring Space hardware...")
    
    api = HfApi(token=token)
    
    try:
        # Request L40S GPU (62GB) - $1.80/hour
        print("   → Requesting Nvidia L40S GPU (62GB)...")
        api.request_space_hardware(
            repo_id=space_id,
            hardware=SpaceHardware.L40S
        )
        print("   ✓ Hardware upgrade requested: L40S (62GB)")
        print("   ⏳ Space will rebuild automatically")
    except Exception as e:
        print(f"   ⚠️  Hardware upgrade failed: {e}")
        print("   → You can upgrade manually in Space settings")
    
    try:
        # Set auto-sleep to 1 hour (3600 seconds)
        print("   → Configuring auto-sleep (1 hour)...")
        api.set_space_sleep_time(
            repo_id=space_id,
            sleep_time=3600
        )
        print("   ✓ Auto-sleep configured: 1 hour of inactivity")
    except Exception as e:
        print(f"   ⚠️  Sleep time configuration failed: {e}")
        print("   → You can configure manually in Space settings")


def main():
    """Main deployment function"""
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║        VoiceForge API - Hugging Face Deployment              ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print()
    
    # Get configuration
    space_id = "Chrisdemonxxx/VoiceForgeAI"
    token = os.environ.get("HF_TOKEN")
    
    if not token:
        print("❌ Error: HF_TOKEN environment variable not set")
        print("   → Add your Hugging Face token to Replit Secrets")
        sys.exit(1)
    
    print(f"✓ Space ID: {space_id}")
    print(f"✓ Token: {'*' * 20}{token[-4:]}")
    print()
    
    # Create staging directory
    staging_dir = None
    try:
        staging_dir = create_staging_directory()
        
        # Deploy to Space
        success = deploy_to_space(staging_dir, space_id, token)
        
        if not success:
            print("\n❌ Deployment failed!")
            sys.exit(1)
        
        # Configure hardware
        configure_space_hardware(space_id, token)
        
        # Success!
        print()
        print("╔════════════════════════════════════════════════════════════════╗")
        print("║                  🎉 DEPLOYMENT SUCCESSFUL!                     ║")
        print("╚════════════════════════════════════════════════════════════════╝")
        print()
        print(f"✓ VoiceForge API deployed to: https://huggingface.co/spaces/{space_id}")
        print()
        print("📋 Next Steps:")
        print()
        print("1. Configure environment secrets:")
        print(f"   → https://huggingface.co/spaces/{space_id}/settings")
        print("   → Add: DATABASE_URL, TWILIO credentials, etc.")
        print()
        print("2. Monitor build progress:")
        print(f"   → https://huggingface.co/spaces/{space_id}")
        print("   → Check 'Logs' tab for build status")
        print()
        print("3. Test your deployment:")
        print(f"   → curl https://{space_id.replace('/', '-').lower()}.hf.space/api/health")
        print()
        print("4. Upgrade GPU if needed:")
        print(f"   → https://huggingface.co/spaces/{space_id}/settings")
        print("   → Select L40S (62GB) for $1.80/hour")
        print()
        print("🎉 Your Voice AI platform is live!")
        print()
        
    finally:
        # Cleanup staging directory
        if staging_dir and os.path.exists(staging_dir):
            shutil.rmtree(staging_dir)
            print(f"🧹 Cleaned up staging directory")


if __name__ == "__main__":
    main()
