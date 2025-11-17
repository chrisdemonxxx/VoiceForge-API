#!/bin/bash
# Redeploy After Vite Fix

echo "=========================================="
echo "Redeploy After Removing Vite Files"
echo "=========================================="
echo ""

echo "Step 1: Checking git status..."
git status --short

echo ""
echo "Step 2: Current branch:"
git branch --show-current

echo ""
echo "Step 3: Recent commits:"
git log --oneline -3

echo ""
echo "=========================================="
echo "Choose an option:"
echo "=========================================="
echo ""
echo "A) Push to current branch (for PR/merge)"
echo "B) Create new branch and push"
echo "C) Show manual redeploy instructions"
echo ""
read -p "Enter option (A/B/C): " option

case $option in
  A)
    echo ""
    echo "Pushing to current branch..."
    git push origin HEAD
    echo ""
    echo "✅ Pushed! Now merge this branch to main in GitHub."
    echo "   Render will auto-deploy from main."
    ;;
  B)
    read -p "Enter branch name: " branch_name
    git checkout -b "$branch_name"
    git push origin "$branch_name"
    echo ""
    echo "✅ Created and pushed branch: $branch_name"
    ;;
  C)
    echo ""
    echo "=========================================="
    echo "Manual Redeploy Instructions"
    echo "=========================================="
    echo ""
    echo "1. Go to Render Dashboard:"
    echo "   https://dashboard.render.com/web/srv-d4d76gggjchc73dq2900"
    echo ""
    echo "2. Click 'Shell' tab"
    echo ""
    echo "3. Run these commands:"
    echo "   rm -f server/vite.ts"
    echo "   rm -f vite.config.ts"
    echo ""
    echo "4. Go to 'Events' tab"
    echo ""
    echo "5. Click 'Manual Deploy' → 'Deploy latest commit'"
    echo ""
    echo "OR"
    echo ""
    echo "5. Click 'Manual Deploy' → 'Clear build cache & deploy'"
    echo ""
    ;;
  *)
    echo "Invalid option"
    ;;
esac

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="
