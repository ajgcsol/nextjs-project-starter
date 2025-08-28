#!/usr/bin/env pwsh

# Add Mux Webhook Secret to Vercel Environment Variables
# This script adds the MUX_WEBHOOK_SECRET environment variable to your Vercel project

Write-Host "🔐 Adding Mux Webhook Secret to Vercel Environment Variables" -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version 2>$null
    if (-not $vercelVersion) {
        throw "Vercel CLI not found"
    }
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Mux webhook secret
$MUX_WEBHOOK_SECRET = "q6ac7p1sv5fqvcs2c5oboh84mhjoctko"

Write-Host "🔧 Adding MUX_WEBHOOK_SECRET to Vercel environment variables..." -ForegroundColor Blue
Write-Host "💡 You'll need to enter the secret value when prompted by Vercel CLI" -ForegroundColor Yellow
Write-Host "   Secret value: $MUX_WEBHOOK_SECRET" -ForegroundColor Cyan

Write-Host ""
Write-Host "Adding to Production environment..." -ForegroundColor Blue
vercel env add MUX_WEBHOOK_SECRET production

Write-Host ""
Write-Host "Adding to Preview environment..." -ForegroundColor Blue
vercel env add MUX_WEBHOOK_SECRET preview

Write-Host ""
Write-Host "Adding to Development environment..." -ForegroundColor Blue
vercel env add MUX_WEBHOOK_SECRET development

Write-Host ""
Write-Host "📋 Environment Variable Summary:" -ForegroundColor Cyan
Write-Host "   Variable: MUX_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host "   Value: $MUX_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host "   Environments: Production, Preview, Development" -ForegroundColor Gray

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Deploy your changes to Vercel: vercel --prod" -ForegroundColor Gray
Write-Host "   2. Test the webhook endpoint" -ForegroundColor Gray
Write-Host "   3. Upload a test video to verify the integration" -ForegroundColor Gray

Write-Host ""
Write-Host "🧪 Test the webhook:" -ForegroundColor Cyan
Write-Host "   node test-mux-webhook-integration.js" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Mux webhook secret configuration complete!" -ForegroundColor Green
