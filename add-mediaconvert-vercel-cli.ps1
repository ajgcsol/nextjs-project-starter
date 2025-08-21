# 🚀 Add MediaConvert Environment Variables to Vercel via CLI (PowerShell)
Write-Host "🚀 Adding MediaConvert environment variables to Vercel..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $null = vercel --version 2>$null
    Write-Host "✅ Vercel CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Login to Vercel (if not already logged in)
Write-Host "🔐 Ensuring Vercel authentication..." -ForegroundColor Yellow
try {
    $null = vercel whoami 2>$null
    Write-Host "✅ Already logged in to Vercel" -ForegroundColor Green
}
catch {
    Write-Host "🔐 Please log in to Vercel..." -ForegroundColor Yellow
    vercel login
}

# Add MediaConvert Role ARN to Production
Write-Host "📝 Adding MEDIACONVERT_ROLE_ARN to production..." -ForegroundColor Yellow
$roleArn = "arn:aws:iam::792298120704:role/MediaConvert-Role"
echo $roleArn | vercel env add MEDIACONVERT_ROLE_ARN production

# Add MediaConvert Endpoint to Production
Write-Host "📝 Adding MEDIACONVERT_ENDPOINT to production..." -ForegroundColor Yellow
$endpoint = "https://mediaconvert.us-east-1.amazonaws.com"
echo $endpoint | vercel env add MEDIACONVERT_ENDPOINT production

# Add to Preview Environment
Write-Host "📝 Adding to preview environment..." -ForegroundColor Yellow
echo $roleArn | vercel env add MEDIACONVERT_ROLE_ARN preview
echo $endpoint | vercel env add MEDIACONVERT_ENDPOINT preview

# Add to Development Environment
Write-Host "📝 Adding to development environment..." -ForegroundColor Yellow
echo $roleArn | vercel env add MEDIACONVERT_ROLE_ARN development
echo $endpoint | vercel env add MEDIACONVERT_ENDPOINT development

# Trigger a new deployment
Write-Host "🚀 Triggering new deployment..." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "🎉 MEDIACONVERT ENVIRONMENT VARIABLES ADDED!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ MEDIACONVERT_ROLE_ARN=arn:aws:iam::792298120704:role/MediaConvert-Role" -ForegroundColor White
Write-Host "✅ MEDIACONVERT_ENDPOINT=https://mediaconvert.us-east-1.amazonaws.com" -ForegroundColor White
Write-Host ""
Write-Host "🚀 New deployment triggered automatically" -ForegroundColor Green
Write-Host "📋 Real thumbnails and WMV conversion are now enabled!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Test the setup with:" -ForegroundColor Cyan
Write-Host "   node test-mediaconvert-auto-setup.js" -ForegroundColor White
