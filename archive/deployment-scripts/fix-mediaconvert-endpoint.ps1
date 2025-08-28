# Fix MediaConvert Endpoint Environment Variable
Write-Host "🔧 Fixing MediaConvert Endpoint Environment Variable" -ForegroundColor Green

# Remove the existing endpoint with carriage returns
Write-Host "🗑️ Removing existing MEDIACONVERT_ENDPOINT..." -ForegroundColor Yellow
echo "y" | vercel env rm MEDIACONVERT_ENDPOINT production

# Add clean endpoint
Write-Host "➕ Adding clean MEDIACONVERT_ENDPOINT..." -ForegroundColor Yellow
echo "https://mediaconvert.us-east-1.amazonaws.com" | vercel env add MEDIACONVERT_ENDPOINT production

# Trigger deployment
Write-Host "🚀 Triggering deployment..." -ForegroundColor Yellow
vercel --prod

Write-Host "✅ MediaConvert endpoint fixed!" -ForegroundColor Green
