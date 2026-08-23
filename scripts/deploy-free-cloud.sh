#!/usr/bin/env bash
# Cloud Deployment Verification & Docker Container Builder

echo "=================================================="
echo "☁️ AUTOMATED FREE CLOUD DEPLOYMENT VERIFICATION"
echo "=================================================="

echo "1. Validating render.yaml blueprint..."
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml exists"
else
    echo "❌ render.yaml missing"
    exit 1
fi

echo "2. Checking Dockerfiles..."
if [ -f "Dockerfile" ] && [ -f "Dockerfile.frontend" ]; then
    echo "✅ Dockerfiles present"
else
    echo "❌ Dockerfile missing"
    exit 1
fi

echo "3. Running TypeScript Type Check & Build..."
npx tsc --noEmit && npm run build
if [ $? -eq 0 ]; then
    echo "✅ TypeScript & Production Build Passed"
else
    echo "❌ Build Failed"
    exit 1
fi

echo "=================================================="
echo "🚀 ALL PRE-DEPLOYMENT CHECKS PASSED SUCCESSFULLY!"
echo "Refer to docs/DEPLOYMENT_GUIDE.md to deploy to Render.com & Supabase."
echo "=================================================="
