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

try {
    # Add environment variable to Vercel for each environment separately
    Write-Host "Adding to Production environment..." -ForegroundColor Blue
    $prodResult = vercel env add MUX_WEBHOOK_SECRET production 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Provide the secret value when prompted
        echo $MUX_WEBHOOK_SECRET | vercel env add MUX_WEBHOOK_SECRET production 2>&1 | Out-Null
    }
    
    Write-Host "Adding to Preview environment..." -ForegroundColor Blue
    $previewResult = vercel env add MUX_WEBHOOK_SECRET preview 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Provide the secret value when prompted
        echo $MUX_WEBHOOK_SECRET | vercel env add MUX_WEBHOOK_SECRET preview 2>&1 | Out-Null
    }
    
    Write-Host "Adding to Development environment..." -ForegroundColor Blue
    $devResult = vercel env add MUX_WEBHOOK_SECRET development 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Provide the secret value when prompted
        echo $MUX_WEBHOOK_SECRET | vercel env add MUX_WEBHOOK_SECRET development 2>&1 | Out-Null
    }
    
    Write-Host "✅ Environment variables added to Vercel" -ForegroundColor Green
    Write-Host "💡 Note: You may need to enter the secret value manually when prompted" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error adding environment variable: $_" -ForegroundColor Red
    Write-Host "💡 Please add it manually using the Vercel dashboard or CLI:" -ForegroundColor Yellow
    Write-Host "   Dashboard: Go to Project Settings > Environment Variables" -ForegroundColor Gray
    Write-Host "   CLI: vercel env add MUX_WEBHOOK_SECRET production" -ForegroundColor Gray
    Write-Host "   Then enter: $MUX_WEBHOOK_SECRET" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📋 Environment Variable Summary:" -ForegroundColor Cyan
Write-Host "   Variable: MUX_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host "   Value: $MUX_WEBHOOK_SECRET" -ForegroundColor Gray
Write-Host "   Environments: Production, Preview, Development" -ForegroundColor Gray

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Deploy your changes to Vercel" -ForegroundColor Gray
Write-Host "   2. Test the webhook endpoint" -ForegroundColor Gray
Write-Host "   3. Upload a test video to verify the integration" -ForegroundColor Gray

Write-Host ""
Write-Host "🧪 Test the webhook:" -ForegroundColor Cyan
Write-Host "   node test-mux-webhook-integration.js" -ForegroundColor Gray

Write-Host ""
Write-Host "✅ Mux webhook secret configuration complete!" -ForegroundColor Green
