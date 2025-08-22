# Update MediaConvert Environment Variables in Vercel
Write-Host "🔧 Updating MediaConvert Environment Variables in Vercel" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# MediaConvert Role ARN and Endpoint
$MEDIACONVERT_ROLE_ARN = "arn:aws:iam::792298120704:role/MediaConvert-ServiceRole"
$MEDIACONVERT_ENDPOINT = "https://mediaconvert.us-east-1.amazonaws.com"

Write-Host "📋 Environment Variables to Set:" -ForegroundColor Yellow
Write-Host "   MEDIACONVERT_ROLE_ARN = $MEDIACONVERT_ROLE_ARN" -ForegroundColor White
Write-Host "   MEDIACONVERT_ENDPOINT = $MEDIACONVERT_ENDPOINT" -ForegroundColor White
Write-Host ""

# Remove existing variables (if they exist)
Write-Host "🗑️ Removing existing MediaConvert variables..." -ForegroundColor Yellow
try {
    & vercel env rm MEDIACONVERT_ROLE_ARN --yes 2>$null
    Write-Host "   ✅ Removed MEDIACONVERT_ROLE_ARN" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ MEDIACONVERT_ROLE_ARN not found (OK)" -ForegroundColor Yellow
}

try {
    & vercel env rm MEDIACONVERT_ENDPOINT --yes 2>$null
    Write-Host "   ✅ Removed MEDIACONVERT_ENDPOINT" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ MEDIACONVERT_ENDPOINT not found (OK)" -ForegroundColor Yellow
}

Write-Host ""

# Add new variables
Write-Host "➕ Adding clean MediaConvert variables..." -ForegroundColor Yellow

# Add MEDIACONVERT_ROLE_ARN
Write-Host "   Adding MEDIACONVERT_ROLE_ARN..." -ForegroundColor White
$env:VERCEL_ENV_VALUE = $MEDIACONVERT_ROLE_ARN
echo $MEDIACONVERT_ROLE_ARN | vercel env add MEDIACONVERT_ROLE_ARN production
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ MEDIACONVERT_ROLE_ARN added successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to add MEDIACONVERT_ROLE_ARN" -ForegroundColor Red
}

# Add MEDIACONVERT_ENDPOINT
Write-Host "   Adding MEDIACONVERT_ENDPOINT..." -ForegroundColor White
$env:VERCEL_ENV_VALUE = $MEDIACONVERT_ENDPOINT
echo $MEDIACONVERT_ENDPOINT | vercel env add MEDIACONVERT_ENDPOINT production
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ MEDIACONVERT_ENDPOINT added successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to add MEDIACONVERT_ENDPOINT" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Triggering Vercel Deployment..." -ForegroundColor Yellow
& vercel --prod
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Deployment triggered successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to trigger deployment" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 MediaConvert Environment Variables Updated!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Wait for deployment to complete" -ForegroundColor White
Write-Host "   2. Test MediaConvert integration:" -ForegroundColor White
Write-Host "      node test-mediaconvert-after-permissions-fix.js" -ForegroundColor Cyan
Write-Host "   3. Verify thumbnails switch from enhanced_svg to mediaconvert" -ForegroundColor White
Write-Host ""
