#!/bin/bash

# 🚀 Add MediaConvert Environment Variables to Vercel via CLI
echo "🚀 Adding MediaConvert environment variables to Vercel..."
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "🔐 Ensuring Vercel authentication..."
vercel whoami || vercel login

# Add MediaConvert Role ARN
echo "📝 Adding MEDIACONVERT_ROLE_ARN..."
echo "arn:aws:iam::792298120704:role/MediaConvert-Role" | vercel env add MEDIACONVERT_ROLE_ARN production

# Add MediaConvert Endpoint
echo "📝 Adding MEDIACONVERT_ENDPOINT..."
echo "https://mediaconvert.us-east-1.amazonaws.com" | vercel env add MEDIACONVERT_ENDPOINT production

# Also add to preview and development environments
echo "📝 Adding to preview environment..."
echo "arn:aws:iam::792298120704:role/MediaConvert-Role" | vercel env add MEDIACONVERT_ROLE_ARN preview
echo "https://mediaconvert.us-east-1.amazonaws.com" | vercel env add MEDIACONVERT_ENDPOINT preview

echo "📝 Adding to development environment..."
echo "arn:aws:iam::792298120704:role/MediaConvert-Role" | vercel env add MEDIACONVERT_ROLE_ARN development
echo "https://mediaconvert.us-east-1.amazonaws.com" | vercel env add MEDIACONVERT_ENDPOINT development

# Trigger a new deployment
echo "🚀 Triggering new deployment..."
vercel --prod

echo ""
echo "🎉 MEDIACONVERT ENVIRONMENT VARIABLES ADDED!"
echo "============================================="
echo ""
echo "✅ MEDIACONVERT_ROLE_ARN=arn:aws:iam::792298120704:role/MediaConvert-Role"
echo "✅ MEDIACONVERT_ENDPOINT=https://mediaconvert.us-east-1.amazonaws.com"
echo ""
echo "🚀 New deployment triggered automatically"
echo "📋 Real thumbnails and WMV conversion are now enabled!"
echo ""
echo "🧪 Test the setup with:"
echo "   node test-mediaconvert-auto-setup.js"
