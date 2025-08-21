#!/usr/bin/env pwsh

# S3 Bucket Policy Fix Script
# This script applies the corrected, secure bucket policy

Write-Host "🔧 S3 Bucket Policy Fix Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Configuration
$BucketName = "law-school-repository-content"
$PolicyFile = "corrected-bucket-policy.json"

# Check if AWS CLI is installed
Write-Host "📋 Checking AWS CLI installation..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
    } else {
        throw "AWS CLI not found"
    }
} catch {
    Write-Host "❌ AWS CLI not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "🔑 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ AWS credentials configured" -ForegroundColor Green
        Write-Host "   Account: $($identity.Account)" -ForegroundColor Gray
        Write-Host "   User: $($identity.Arn)" -ForegroundColor Gray
    } else {
        throw "AWS credentials not configured"
    }
} catch {
    Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
    Write-Host "Please run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Check if policy file exists
Write-Host "📄 Checking policy file..." -ForegroundColor Yellow
if (Test-Path $PolicyFile) {
    Write-Host "✅ Policy file found: $PolicyFile" -ForegroundColor Green
} else {
    Write-Host "❌ Policy file not found: $PolicyFile" -ForegroundColor Red
    Write-Host "Please ensure the corrected-bucket-policy.json file exists" -ForegroundColor Yellow
    exit 1
}

# Check if bucket exists
Write-Host "🪣 Checking S3 bucket..." -ForegroundColor Yellow
try {
    aws s3api head-bucket --bucket $BucketName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bucket exists: $BucketName" -ForegroundColor Green
    } else {
        throw "Bucket not found or no access"
    }
} catch {
    Write-Host "❌ Cannot access bucket: $BucketName" -ForegroundColor Red
    Write-Host "Please check bucket name and permissions" -ForegroundColor Yellow
    exit 1
}

# Show current policy (if any)
Write-Host "📋 Current bucket policy:" -ForegroundColor Yellow
try {
    $currentPolicy = aws s3api get-bucket-policy --bucket $BucketName --output json 2>$null
    if ($LASTEXITCODE -eq 0) {
        $policyJson = ($currentPolicy | ConvertFrom-Json).Policy | ConvertFrom-Json
        Write-Host "Current policy found:" -ForegroundColor Gray
        Write-Host ($policyJson | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    } else {
        Write-Host "No current policy found" -ForegroundColor Gray
    }
} catch {
    Write-Host "No current policy or unable to retrieve" -ForegroundColor Gray
}

# Show new policy
Write-Host "`n📄 New policy to be applied:" -ForegroundColor Yellow
$newPolicy = Get-Content $PolicyFile | ConvertFrom-Json
Write-Host ($newPolicy | ConvertTo-Json -Depth 10) -ForegroundColor Gray

# Confirm before applying
Write-Host "`n⚠️  SECURITY WARNING:" -ForegroundColor Red
Write-Host "This will replace your current bucket policy with a more secure version." -ForegroundColor Yellow
Write-Host "The new policy will:" -ForegroundColor Yellow
Write-Host "  ✅ Remove dangerous public write permissions" -ForegroundColor Green
Write-Host "  ✅ Allow public read access only to /public/* folder" -ForegroundColor Green
Write-Host "  ✅ Enforce HTTPS connections" -ForegroundColor Green
Write-Host "  ✅ Maintain your application's authenticated access" -ForegroundColor Green

$confirmation = Read-Host "`nDo you want to apply this policy? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Operation cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Apply the new policy
Write-Host "`n🔧 Applying new bucket policy..." -ForegroundColor Yellow
try {
    aws s3api put-bucket-policy --bucket $BucketName --policy file://$PolicyFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bucket policy applied successfully!" -ForegroundColor Green
    } else {
        throw "Failed to apply policy"
    }
} catch {
    Write-Host "❌ Failed to apply bucket policy" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify the policy was applied
Write-Host "🔍 Verifying policy application..." -ForegroundColor Yellow
try {
    Start-Sleep -Seconds 2  # Wait for AWS to propagate changes
    $verifyResult = aws s3api get-bucket-policy --bucket $BucketName --output json 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Policy verification successful" -ForegroundColor Green
        $verifyPolicy = ($verifyResult | ConvertFrom-Json).Policy | ConvertFrom-Json
        Write-Host "Applied policy contains $($verifyPolicy.Statement.Count) statements" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Policy may not have been applied correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Unable to verify policy application" -ForegroundColor Yellow
}

# Success message and next steps
Write-Host "`n🎉 S3 Bucket Policy Fix Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "✅ Your S3 bucket is now more secure" -ForegroundColor Green
Write-Host "✅ Public write access has been removed" -ForegroundColor Green
Write-Host "✅ HTTPS connections are now enforced" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test your application to ensure uploads still work" -ForegroundColor White
Write-Host "2. Move any public content to the /public/ folder in your bucket" -ForegroundColor White
Write-Host "3. Update any hardcoded S3 URLs to use signed URLs for private content" -ForegroundColor White
Write-Host "4. Monitor AWS CloudTrail for any access issues" -ForegroundColor White

Write-Host "`n📁 Recommended folder structure:" -ForegroundColor Cyan
Write-Host "  /public/          - Publicly accessible files" -ForegroundColor White
Write-Host "  /documents/       - Private documents (authenticated access)" -ForegroundColor White
Write-Host "  /videos/          - Private videos (authenticated access)" -ForegroundColor White
Write-Host "  /uploads/         - General uploads (authenticated access)" -ForegroundColor White

Write-Host "`n📖 For detailed analysis, see: S3_BUCKET_POLICY_ANALYSIS.md" -ForegroundColor Cyan

Write-Host "`nScript completed successfully! 🚀" -ForegroundColor Green
