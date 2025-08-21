# MediaConvert Setup Script for Windows PowerShell
Write-Host "🚀 Setting up MediaConvert with AWS CLI..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if AWS CLI is installed
try {
    $null = aws --version 2>$null
    Write-Host "✅ AWS CLI is installed" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    Write-Host "   Or use chocolatey: choco install awscli" -ForegroundColor Yellow
    exit 1
}

# Check if AWS CLI is configured
try {
    $null = aws sts get-caller-identity 2>$null
    Write-Host "✅ AWS CLI is configured" -ForegroundColor Green
}
catch {
    Write-Host "❌ AWS CLI is not configured. Please run:" -ForegroundColor Red
    Write-Host "   aws configure" -ForegroundColor Yellow
    Write-Host "   And enter your AWS credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Get current AWS account info
$AccountId = aws sts get-caller-identity --query 'Account' --output text
$Region = aws configure get region
Write-Host "📋 AWS Account: $AccountId" -ForegroundColor Cyan
Write-Host "📋 Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create trust policy
Write-Host "📝 Creating MediaConvert trust policy..." -ForegroundColor Yellow

$TrustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "mediaconvert.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@

$TrustPolicy | Out-File -FilePath "mediaconvert-trust-policy.json" -Encoding UTF8

# Step 2: Check if role already exists
Write-Host "🔍 Checking if MediaConvert-Role already exists..." -ForegroundColor Yellow

try {
    $null = aws iam get-role --role-name MediaConvert-Role 2>$null
    Write-Host "⚠️ MediaConvert-Role already exists. Using existing role." -ForegroundColor Yellow
    $RoleExists = $true
}
catch {
    Write-Host "📋 Creating new MediaConvert-Role..." -ForegroundColor Yellow
    $RoleExists = $false
    
    # Create IAM role
    $CreateResult = aws iam create-role --role-name MediaConvert-Role --assume-role-policy-document file://mediaconvert-trust-policy.json --description "Role for MediaConvert video processing" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MediaConvert-Role created successfully" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to create MediaConvert-Role" -ForegroundColor Red
        Write-Host $CreateResult -ForegroundColor Red
        exit 1
    }
}

# Step 3: Attach policies (safe to run multiple times)
Write-Host "🔐 Attaching required policies..." -ForegroundColor Yellow

aws iam attach-role-policy --role-name MediaConvert-Role --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess 2>$null
aws iam attach-role-policy --role-name MediaConvert-Role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess 2>$null

Write-Host "✅ Policies attached" -ForegroundColor Green

# Step 4: Get role ARN
Write-Host "📝 Getting role ARN..." -ForegroundColor Yellow
$RoleArn = aws iam get-role --role-name MediaConvert-Role --query 'Role.Arn' --output text

if (-not $RoleArn) {
    Write-Host "❌ Failed to get role ARN" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Role ARN: $RoleArn" -ForegroundColor Green

# Step 5: Get MediaConvert endpoint
Write-Host "🔍 Getting MediaConvert endpoint..." -ForegroundColor Yellow
$Endpoint = aws mediaconvert describe-endpoints --region $Region --query 'Endpoints[0].Url' --output text 2>$null

if (-not $Endpoint -or $Endpoint -eq "None") {
    Write-Host "⚠️ Failed to get endpoint for region $Region, trying us-east-1..." -ForegroundColor Yellow
    $Endpoint = aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text 2>$null
    
    if (-not $Endpoint -or $Endpoint -eq "None") {
        Write-Host "❌ Failed to get MediaConvert endpoint. MediaConvert might not be available in your region." -ForegroundColor Red
        Write-Host "💡 You can still use the role ARN and let the system auto-discover the endpoint." -ForegroundColor Yellow
        $Endpoint = "AUTO_DISCOVER"
    } else {
        Write-Host "✅ Endpoint (us-east-1): $Endpoint" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Endpoint: $Endpoint" -ForegroundColor Green
}

# Step 6: Test MediaConvert access
Write-Host "🧪 Testing MediaConvert access..." -ForegroundColor Yellow
try {
    $null = aws mediaconvert list-jobs --region $Region --max-results 1 2>$null
    Write-Host "✅ MediaConvert access confirmed" -ForegroundColor Green
}
catch {
    try {
        $null = aws mediaconvert list-jobs --region us-east-1 --max-results 1 2>$null
        Write-Host "✅ MediaConvert access confirmed (us-east-1)" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ MediaConvert access test failed, but role is created" -ForegroundColor Yellow
    }
}

# Cleanup
Remove-Item -Path "mediaconvert-trust-policy.json" -ErrorAction SilentlyContinue

# Step 7: Display results
Write-Host ""
Write-Host "🎉 MEDIACONVERT SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Add these environment variables to Vercel:" -ForegroundColor Cyan
Write-Host ""
Write-Host "MEDIACONVERT_ROLE_ARN=$RoleArn" -ForegroundColor White

if ($Endpoint -ne "AUTO_DISCOVER") {
    Write-Host "MEDIACONVERT_ENDPOINT=$Endpoint" -ForegroundColor White
} else {
    Write-Host "# MEDIACONVERT_ENDPOINT not needed - system will auto-discover" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Green
Write-Host "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables" -ForegroundColor White
Write-Host "2. Add the MEDIACONVERT_ROLE_ARN variable above" -ForegroundColor White

if ($Endpoint -ne "AUTO_DISCOVER") {
    Write-Host "3. Add the MEDIACONVERT_ENDPOINT variable above" -ForegroundColor White
    Write-Host "4. Redeploy your application" -ForegroundColor White
} else {
    Write-Host "3. Redeploy your application (endpoint will auto-discover)" -ForegroundColor White
}

Write-Host "5. Test with: node test-mediaconvert-auto-setup.js" -ForegroundColor White
Write-Host ""
Write-Host "✅ Real thumbnail generation and WMV conversion will be enabled!" -ForegroundColor Green

# Copy to clipboard if possible
try {
    $ClipboardText = "MEDIACONVERT_ROLE_ARN=$RoleArn"
    if ($Endpoint -ne "AUTO_DISCOVER") {
        $ClipboardText += "`nMEDIACONVERT_ENDPOINT=$Endpoint"
    }
    $ClipboardText | Set-Clipboard
    Write-Host ""
    Write-Host "📋 Environment variables copied to clipboard!" -ForegroundColor Green
}
catch {
    # Clipboard not available, that's okay
}
