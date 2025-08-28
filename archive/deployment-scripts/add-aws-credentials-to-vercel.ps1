# Quick script to add AWS credentials to Vercel
# Run this after installing Vercel CLI: npm i -g vercel

Write-Host "🚀 Adding AWS credentials to Vercel..." -ForegroundColor Green

# Set the credentials
$accessKey = "AKIA3Q6FIgepTNX7X"
$secretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # This appears to be a placeholder
$region = "us-east-1"
$bucket = "law-school-repository-content"
$cloudfront = "d24qjgz9z4yzof.cloudfront.net"

Write-Host "Adding environment variables to Vercel..." -ForegroundColor Yellow

# Add each environment variable
vercel env add AWS_ACCESS_KEY_ID production --value="$accessKey"
vercel env add AWS_SECRET_ACCESS_KEY production --value="$secretKey"
vercel env add AWS_REGION production --value="$region"
vercel env add S3_BUCKET_NAME production --value="$bucket"
vercel env add CLOUDFRONT_DOMAIN production --value="$cloudfront"

Write-Host "✅ AWS credentials added to Vercel!" -ForegroundColor Green
Write-Host "Now redeploy your application in Vercel dashboard" -ForegroundColor Yellow
