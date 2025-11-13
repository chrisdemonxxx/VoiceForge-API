# VoiceForge AI - Automated Deployment Workflow

## 🔄 One-Time Setup (Do This Once!)

### Step 1: Link HF Spaces to GitHub

1. Go to: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI/settings
2. Scroll to **"Repository"** or **"Linked Repository"** section
3. Click **"Sync from GitHub repository"**
4. Enter: `chrisdemonxxx/Voiceforge`
5. Branch: `main`
6. Click **"Link repository"**

### Step 2: Enable Auto-Sync

In the same settings page:
- ✅ Enable **"Automatically rebuild when GitHub updates"**
- ✅ Enable **"Pull changes from GitHub"**

---

## 🚀 Daily Workflow (Fully Automated!)

Once setup is complete, every time you make changes:

### In Replit:

1. **Make your code changes** (edit any files)
2. **Click "Version control" tab** (left sidebar)
3. **Click "Commit & push"**
4. **Done!** ✅

HF Spaces will automatically:
- Detect GitHub changes
- Pull latest code
- Rebuild Docker image
- Deploy updated app

**No manual file uploads ever again!** 🎉

---

## 📊 Monitor Deployment

Watch deployment progress:
1. Go to: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI
2. Click **"Logs"** tab
3. Watch build progress

Expected deployment time: **10-15 minutes**

---

## ✅ Verify Success

After deployment, check logs for:
```
🗄️  Initializing database...
✓ Database tables created/updated successfully
[Server] Database initialized successfully
```

