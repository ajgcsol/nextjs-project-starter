# AWS Infrastructure Setup Script for Law School Repository (Windows PowerShell)
# This script sets up all required AWS services automatically

param(
    [string]$Region = "us-east-1",
    [string]$ProjectName = "law-school-repository"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

Write-Host "🏛️  Law School Repository - AWS Infrastructure Setup" -ForegroundColor $Blue
Write-Host "==================================================" -ForegroundColor $Blue

# Check if AWS CLI is installed and try to fix PATH issues
$awsFound = $false
$awsPaths = @(
    "aws",
    "C:\Program Files\Amazon\AWSCLIV2\aws.exe",
    "C:\Program Files (x86)\Amazon\AWSCLIV2\aws.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python*\Scripts\aws.exe"
)

foreach ($awsPath in $awsPaths) {
    try {
        if ($awsPath -eq "aws") {
            $awsVersion = & aws --version 2>$null
        } else {
            if (Test-Path $awsPath) {
                $awsVersion = & $awsPath --version 2>$null
                # Add to PATH for this session
                $env:PATH = "$env:PATH;$(Split-Path $awsPath)"
                $awsFound = $true
                break
            }
        }
        if ($awsVersion) {
            $awsFound = $true
            break
        }
    } catch {
        continue
    }
}

if (-not $awsFound) {
    Write-Host "❌ AWS CLI is installed but not accessible. Trying to fix PATH..." -ForegroundColor $Yellow
    
    # Try to find AWS CLI in common locations
    $possiblePaths = @(
        "C:\Program Files\Amazon\AWSCLIV2",
        "C:\Program Files (x86)\Amazon\AWSCLIV2",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python*\Scripts"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\aws.exe") {
            Write-Host "✅ Found AWS CLI at: $path" -ForegroundColor $Green
            $env:PATH = "$env:PATH;$path"
            $awsFound = $true
            break
        }
    }
    
    if (-not $awsFound) {
        Write-Host "❌ AWS CLI installation not found. Please:" -ForegroundColor $Red
        Write-Host "1. Restart PowerShell as Administrator" -ForegroundColor $Yellow
        Write-Host "2. Or manually add AWS CLI to PATH" -ForegroundColor $Yellow
        Write-Host "3. Or reinstall AWS CLI: winget install --id Amazon.AWSCLI" -ForegroundColor $Yellow
        exit 1
    }
}

Write-Host "✅ AWS CLI is accessible" -ForegroundColor $Green

# Check if AWS CLI is configured
try {
    $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
    Write-Host "✅ AWS CLI is configured for account: $($identity.Account)" -ForegroundColor $Green
} catch {
    Write-Host "❌ AWS CLI is not configured. Please run 'aws configure' first." -ForegroundColor $Red
    Write-Host "You'll need:" -ForegroundColor $Yellow
    Write-Host "- AWS Access Key ID" -ForegroundColor $Yellow
    Write-Host "- AWS Secret Access Key" -ForegroundColor $Yellow
    Write-Host "- Default region (e.g., us-east-1)" -ForegroundColor $Yellow
    Write-Host "- Output format (json)" -ForegroundColor $Yellow
    exit 1
}

# Get user input
if (-not $Region) {
    $Region = Read-Host "Enter AWS region (default: us-east-1)"
    if (-not $Region) { $Region = "us-east-1" }
}

$DbPassword = Read-Host "Enter database password (min 8 characters)" -AsSecureString
$DbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword))

if ($DbPasswordPlain.Length -lt 8) {
    Write-Host "❌ Password must be at least 8 characters" -ForegroundColor $Red
    exit 1
}

$DomainName = Read-Host "Enter your domain name (optional, e.g., repository.lawschool.edu)"

Write-Host "🚀 Starting AWS infrastructure setup..." -ForegroundColor $Yellow

# Create S3 buckets
Write-Host "📦 Creating S3 buckets..." -ForegroundColor $Blue

$buckets = @(
    "$ProjectName-content",
    "$ProjectName-video-processing", 
    "$ProjectName-backups"
)

foreach ($bucket in $buckets) {
    try {
        aws s3 mb "s3://$bucket" --region $Region
        Write-Host "✅ Created bucket: $bucket" -ForegroundColor $Green
    } catch {
        Write-Host "⚠️  Bucket $bucket may already exist or creation failed" -ForegroundColor $Yellow
    }
}

# Configure bucket policies
$bucketPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$ProjectName-content/public/*"
        },
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::$ProjectName-content",
                "arn:aws:s3:::$ProjectName-content/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
"@

# First, disable block public access for the content bucket (needed for public content)
Write-Host "🔓 Configuring bucket public access settings..." -ForegroundColor $Blue
try {
    aws s3api put-public-access-block --bucket "$ProjectName-content" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
    Write-Host "✅ Public access configured for content bucket" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  Could not configure public access - bucket policy will be skipped" -ForegroundColor $Yellow
}

# Apply bucket policy (only if public access was configured)
$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding UTF8
try {
    aws s3api put-bucket-policy --bucket "$ProjectName-content" --policy file://bucket-policy.json
    Write-Host "✅ Bucket policy applied" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  Bucket policy could not be applied - files will be private by default" -ForegroundColor $Yellow
}

# Enable versioning
try {
    aws s3api put-bucket-versioning --bucket "$ProjectName-content" --versioning-configuration Status=Enabled
    aws s3api put-bucket-versioning --bucket "$ProjectName-video-processing" --versioning-configuration Status=Enabled
    Write-Host "✅ Bucket versioning enabled" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  Could not enable versioning" -ForegroundColor $Yellow
}

Write-Host "✅ S3 buckets created and configured" -ForegroundColor $Green

# Create VPC and Security Groups
Write-Host "🔒 Creating VPC and security groups..." -ForegroundColor $Blue

$vpcResult = aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $Region | ConvertFrom-Json
$vpcId = $vpcResult.Vpc.VpcId
aws ec2 create-tags --resources $vpcId --tags Key=Name,Value="$ProjectName-vpc" --region $Region

# Create subnets
$subnet1Result = aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.1.0/24 --availability-zone "${Region}a" --region $Region | ConvertFrom-Json
$subnet2Result = aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.2.0/24 --availability-zone "${Region}b" --region $Region | ConvertFrom-Json

$subnet1 = $subnet1Result.Subnet.SubnetId
$subnet2 = $subnet2Result.Subnet.SubnetId

aws ec2 create-tags --resources $subnet1 --tags Key=Name,Value="$ProjectName-subnet-1" --region $Region
aws ec2 create-tags --resources $subnet2 --tags Key=Name,Value="$ProjectName-subnet-2" --region $Region

# Create DB subnet group
aws rds create-db-subnet-group --db-subnet-group-name "$ProjectName-db-subnet-group" --db-subnet-group-description "Subnet group for law school database" --subnet-ids $subnet1 $subnet2 --region $Region

# Create security group for RDS
$sgResult = aws ec2 create-security-group --group-name "$ProjectName-db-sg" --description "Security group for law school database" --vpc-id $vpcId --region $Region | ConvertFrom-Json
$dbSecurityGroup = $sgResult.GroupId

# Allow PostgreSQL access
aws ec2 authorize-security-group-ingress --group-id $dbSecurityGroup --protocol tcp --port 5432 --cidr 0.0.0.0/0 --region $Region

Write-Host "✅ VPC and security groups created" -ForegroundColor $Green

# Create RDS PostgreSQL instance
Write-Host "🗄️  Creating RDS PostgreSQL database..." -ForegroundColor $Blue

aws rds create-db-instance --db-instance-identifier "$ProjectName-db" --db-instance-class db.t3.micro --engine postgres --engine-version 13.13 --master-username lawschooladmin --master-user-password $DbPasswordPlain --allocated-storage 20 --storage-type gp2 --vpc-security-group-ids $dbSecurityGroup --db-subnet-group-name "$ProjectName-db-subnet-group" --backup-retention-period 7 --storage-encrypted --region $Region

Write-Host "⏳ Database is being created (this takes 5-10 minutes)..." -ForegroundColor $Yellow

# Wait for database to be available
Write-Host "⏳ Waiting for database to be available..." -ForegroundColor $Yellow
aws rds wait db-instance-available --db-instance-identifier "$ProjectName-db" --region $Region

# Get database endpoint
$dbResult = aws rds describe-db-instances --db-instance-identifier "$ProjectName-db" --region $Region | ConvertFrom-Json
$dbEndpoint = $dbResult.DBInstances[0].Endpoint.Address

Write-Host "✅ Database is ready at: $dbEndpoint" -ForegroundColor $Green

# Get account ID
$accountResult = aws sts get-caller-identity | ConvertFrom-Json
$accountId = $accountResult.Account

# Generate environment file
Write-Host "📝 Generating environment configuration..." -ForegroundColor $Blue

$envContent = @"
# AWS Configuration
AWS_REGION=$Region
AWS_ACCOUNT_ID=$accountId

# Database
DATABASE_URL=postgresql://lawschooladmin:$DbPasswordPlain@$dbEndpoint:5432/postgres

# S3 Storage
S3_BUCKET_NAME=$ProjectName-content
S3_VIDEO_BUCKET=$ProjectName-video-processing
S3_BACKUP_BUCKET=$ProjectName-backups

# Application Settings
NEXTAUTH_SECRET=$([System.Web.Security.Membership]::GeneratePassword(32, 0))
NEXTAUTH_URL=https://$DomainName

# File Upload Settings
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# Ollama (for plagiarism detection)
OLLAMA_API_URL=http://localhost:11434

# Microsoft 365 Integration (optional)
# NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
# NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
# NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=https://$DomainName/dashboard
# NEXT_PUBLIC_AZURE_AD_LOGOUT_REDIRECT_URI=https://$DomainName/login
"@

$envContent | Out-File -FilePath ".env.aws" -Encoding UTF8

# Clean up temporary files
Remove-Item -Path "bucket-policy.json" -ErrorAction SilentlyContinue

Write-Host "🎉 AWS Infrastructure Setup Complete!" -ForegroundColor $Green
Write-Host "==============================================" -ForegroundColor $Green
Write-Host ""
Write-Host "📋 Setup Summary:" -ForegroundColor $Blue
Write-Host "• S3 Buckets: $ProjectName-content, $ProjectName-video-processing, $ProjectName-backups"
Write-Host "• RDS Database: $ProjectName-db"
Write-Host "• Database Endpoint: $dbEndpoint"
Write-Host ""
Write-Host "💰 Estimated Monthly Costs:" -ForegroundColor $Blue
Write-Host "• RDS (db.t3.micro): ~`$12-15"
Write-Host "• S3 Storage (100GB): ~`$2-5"
Write-Host "• Total Basic Setup: ~`$14-20/month"
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor $Blue
Write-Host "1. Copy .env.aws to .env.local in your Next.js project"
Write-Host "2. Install dependencies: npm install"
Write-Host "3. Run database setup: npm run db:setup"
Write-Host "4. Start development: npm run dev"
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor $Yellow
Write-Host "• Save your database password securely"
Write-Host "• Configure AWS credentials for your application"
Write-Host "• Review and adjust security groups as needed"
Write-Host ""
Write-Host "✅ Your law school repository infrastructure is ready!" -ForegroundColor $Green
