# Add Mux Credentials to Vercel Environment Variables
Write-Host "Adding CORRECT Mux credentials to Vercel..." -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version
    Write-Host "Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Adding VIDEO_MUX_TOKEN_ID..." -ForegroundColor Cyan

# Add VIDEO_MUX_TOKEN_ID
$env:VERCEL_TOKEN_ID = "1b2e483d-891b-40e4-b4a6-ebdf4ca76f91"
echo $env:VERCEL_TOKEN_ID | vercel env add VIDEO_MUX_TOKEN_ID production

Write-Host "Adding VIDEO_MUX_TOKEN_SECRET..." -ForegroundColor Cyan

# Add VIDEO_MUX_TOKEN_SECRET
$env:VERCEL_TOKEN_SECRET = "lBaHTzOGybS1SvITG1hn7DOwp2MlZ7EdWJIHLysoWW5me0fkQOun3T0xeWOYTJClQWL3FBcPSAu"
echo $env:VERCEL_TOKEN_SECRET | vercel env add VIDEO_MUX_TOKEN_SECRET production

Write-Host ""
Write-Host "CORRECT Mux Video API credentials added to Vercel!" -ForegroundColor Green
Write-Host ""
Write-Host "Credentials Summary:" -ForegroundColor Cyan
Write-Host "   VIDEO_MUX_TOKEN_ID: 1b2e483d-891b-40e4-b4a6-ebdf4ca76f91" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Redeploy your application in Vercel dashboard" -ForegroundColor White
Write-Host "2. Run: node test-mux-thumbnail-generation.js" -ForegroundColor White
Write-Host "3. Check that method shows mux instead of enhanced_svg" -ForegroundColor White
Write-Host ""
Write-Host "Real video thumbnails should now work with Mux Video API!" -ForegroundColor Green
