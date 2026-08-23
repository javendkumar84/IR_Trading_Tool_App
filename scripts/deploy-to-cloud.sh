#!/usr/bin/env bash
# Free Cloud Deployment Automation Script

echo "=================================================="
echo "🚀 AUTOMATED CLOUD DEPLOYMENT PREPARATION"
echo "=================================================="

# 1. Check Git Status
if [ -d ".git" ]; then
    echo "1. Staging and committing all project files..."
    git add .
    git commit -m "Production Release: Python Quant Engine & React Derivatives Terminal" || true
    echo "✅ Git repository updated"
else
    echo "1. Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial Release: Rates Trading Platform"
    echo "✅ Git repository initialized"
fi

echo "=================================================="
echo "📑 DEPLOYMENT INSTRUCTIONS (FREE CLOUD HOSTING)"
echo "=================================================="
echo "1. Push to GitHub:"
echo "   git remote add origin <your-github-repo-url>"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "2. Backend Deploy (Render.com - Free Tier):"
echo "   - Go to https://dashboard.render.com/select-repo?type=blueprint"
echo "   - Select your GitHub repo"
echo "   - Click 'Apply' (Render auto-builds from render.yaml)"
echo ""
echo "3. Database Setup (Supabase - Free Tier):"
echo "   - Go to https://supabase.com -> New Project"
echo "   - Open SQL Editor -> Run scripts/init-supabase-db.sql"
echo ""
echo "4. Frontend Deploy (Vercel - Free Tier):"
echo "   - Go to https://vercel.com/new"
echo "   - Import your GitHub repo"
echo "   - Click 'Deploy' (Vercel auto-configures via vercel.json)"
echo "=================================================="
