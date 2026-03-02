#!/bin/bash

# iWB Send - Vercel Deployment Script
# Deploys all three apps to Vercel

set -e

echo "🚀 iWB Send - Vercel Deployment"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
    exit 1
fi

# Verify logged in
echo "🔐 Checking Vercel login..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Running 'vercel login'..."
    vercel login
fi

# Get root directory
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo ""
echo "📦 Deploying to Vercel..."
echo ""

# 1. Deploy Marketing
echo "1️⃣  Deploying Marketing Site..."
echo "   Root: apps/marketing"
echo "   Domain: www.iwbsend.com"
cd "$ROOT_DIR/apps/marketing"
vercel --prod --name iwb-send-marketing
MARKETING_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "Check Vercel Dashboard")
echo "✅ Marketing deployed: $MARKETING_URL"
echo ""

# 2. Deploy Dashboard
echo "2️⃣  Deploying Dashboard..."
echo "   Root: apps/dashboard"
echo "   Domain: app.iwbsend.com"
cd "$ROOT_DIR/apps/dashboard"
vercel --prod --name iwb-send-dashboard --env NEXT_PUBLIC_API_URL=https://api.iwbsend.com
DASHBOARD_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "Check Vercel Dashboard")
echo "✅ Dashboard deployed: $DASHBOARD_URL"
echo ""

# 3. Deploy API
echo "3️⃣  Deploying API..."
echo "   Root: apps/api"
echo "   Domain: api.iwbsend.com"
cd "$ROOT_DIR/apps/api"
vercel --prod --name iwb-send-api --env AWS_REGION=ap-south-1
API_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "Check Vercel Dashboard")
echo "✅ API deployed: $API_URL"
echo ""

echo "================================"
echo "✨ Deployment Complete!"
echo "================================"
echo ""
echo "📊 Deployment Summary:"
echo "   Marketing:  $MARKETING_URL → www.iwbsend.com"
echo "   Dashboard:  $DASHBOARD_URL → app.iwbsend.com"
echo "   API:        $API_URL → api.iwbsend.com"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Go to https://vercel.com/dashboard"
echo "   2. For each project, add custom domain:"
echo "      - iwb-send-marketing → www.iwbsend.com"
echo "      - iwb-send-dashboard → app.iwbsend.com"
echo "      - iwb-send-api → api.iwbsend.com"
echo "   3. Configure DNS in your domain provider"
echo "   4. Verify SSL certificates are active"
echo ""
echo "✅ Done!"
