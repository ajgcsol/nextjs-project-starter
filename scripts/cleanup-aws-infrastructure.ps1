# AWS Infrastructure Cleanup Script for Law School Repository (Windows PowerShell)
# This script removes all AWS resources created by the setup script

param(
    [string]$Region = "us-east-1",
    [string]$ProjectName = "law-school-repository",
    [switch]$Force = $false
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

Write-Host "🧹 Law School Repository - AWS Infrastructure Cleanup" -ForegroundColor $Blue
Write-Host "====================================================" -ForegroundColor $Blue

if (-not $Force) {
    Write-Host "⚠️  WARNING: This will delete ALL AWS resources created for the law school repository!" -ForegroundColor $Red
    Write-Host "This includes:" -ForegroundColor $Yellow
    Write-Host "• S3 buckets and all their contents" -ForegroundColor $Yellow
    Write-Host "• RDS database instance" -ForegroundColor $Yellow
    Write-Host "• VPC, subnets, and security groups" -ForegroundColor $Yellow
    Write-Host "• All data will be permanently lost!" -ForegroundColor $Yellow
    Write-Host ""
    $confirm = Read-Host "Type 'DELETE' to confirm cleanup"
    if ($confirm -ne "DELETE") {
        Write-Host "❌ Cleanup cancelled" -ForegroundColor $Green
        exit 0
    }
}

Write-Host "🚀 Starting AWS infrastructure cleanup..." -ForegroundColor $Yellow

# Delete RDS instance
Write-Host "🗄️  Deleting RDS database..." -ForegroundColor $Blue
try {
    aws rds delete-db-instance --db-instance-identifier "$ProjectName-db" --skip-final-snapshot --region $Region
    Write-Host "✅ RDS deletion initiated" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  RDS instance may not exist or already deleted" -ForegroundColor $Yellow
}

# Delete S3 buckets (empty them first)
Write-Host "📦 Deleting S3 buckets..." -ForegroundColor $Blue

$buckets = @(
    "$ProjectName-content",
    "$ProjectName-video-processing", 
    "$ProjectName-backups"
)

foreach ($bucket in $buckets) {
    try {
        # Empty bucket first
        aws s3 rm "s3://$bucket" --recursive --region $Region
        # Delete bucket
        aws s3 rb "s3://$bucket" --region $Region
        Write-Host "✅ Deleted bucket: $bucket" -ForegroundColor $Green
    } catch {
        Write-Host "⚠️  Bucket $bucket may not exist or already deleted" -ForegroundColor $Yellow
    }
}

# Wait for RDS to be deleted before cleaning up VPC
Write-Host "⏳ Waiting for RDS deletion to complete..." -ForegroundColor $Yellow
try {
    aws rds wait db-instance-deleted --db-instance-identifier "$ProjectName-db" --region $Region
    Write-Host "✅ RDS instance deleted" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  RDS deletion wait failed or instance didn't exist" -ForegroundColor $Yellow
}

# Delete DB subnet group
Write-Host "🔒 Deleting DB subnet group..." -ForegroundColor $Blue
try {
    aws rds delete-db-subnet-group --db-subnet-group-name "$ProjectName-db-subnet-group" --region $Region
    Write-Host "✅ DB subnet group deleted" -ForegroundColor $Green
} catch {
    Write-Host "⚠️  DB subnet group may not exist or already deleted" -ForegroundColor $Yellow
}

# Get VPC ID
try {
    $vpcResult = aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$ProjectName-vpc" --region $Region | ConvertFrom-Json
    if ($vpcResult.Vpcs.Count -gt 0) {
        $vpcId = $vpcResult.Vpcs[0].VpcId
        
        # Delete security groups
        Write-Host "🔒 Deleting security groups..." -ForegroundColor $Blue
        try {
            $sgResult = aws ec2 describe-security-groups --filters "Name=group-name,Values=$ProjectName-db-sg" --region $Region | ConvertFrom-Json
            if ($sgResult.SecurityGroups.Count -gt 0) {
                $sgId = $sgResult.SecurityGroups[0].GroupId
                aws ec2 delete-security-group --group-id $sgId --region $Region
                Write-Host "✅ Security group deleted" -ForegroundColor $Green
            }
        } catch {
            Write-Host "⚠️  Security group may not exist or already deleted" -ForegroundColor $Yellow
        }
        
        # Delete subnets
        Write-Host "🌐 Deleting subnets..." -ForegroundColor $Blue
        try {
            $subnetResult = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --region $Region | ConvertFrom-Json
            foreach ($subnet in $subnetResult.Subnets) {
                aws ec2 delete-subnet --subnet-id $subnet.SubnetId --region $Region
                Write-Host "✅ Deleted subnet: $($subnet.SubnetId)" -ForegroundColor $Green
            }
        } catch {
            Write-Host "⚠️  Subnets may not exist or already deleted" -ForegroundColor $Yellow
        }
        
        # Delete VPC
        Write-Host "🌐 Deleting VPC..." -ForegroundColor $Blue
        try {
            aws ec2 delete-vpc --vpc-id $vpcId --region $Region
            Write-Host "✅ VPC deleted" -ForegroundColor $Green
        } catch {
            Write-Host "⚠️  VPC may not exist or already deleted" -ForegroundColor $Yellow
        }
    }
} catch {
    Write-Host "⚠️  VPC resources may not exist or already deleted" -ForegroundColor $Yellow
}

# Clean up local files
Write-Host "📝 Cleaning up local files..." -ForegroundColor $Blue
Remove-Item -Path ".env.aws" -ErrorAction SilentlyContinue
Remove-Item -Path "bucket-policy.json" -ErrorAction SilentlyContinue
Write-Host "✅ Local files cleaned up" -ForegroundColor $Green

Write-Host "🎉 AWS Infrastructure Cleanup Complete!" -ForegroundColor $Green
Write-Host "=========================================" -ForegroundColor $Green
Write-Host ""
Write-Host "✅ All AWS resources have been removed" -ForegroundColor $Green
Write-Host "✅ You can now run the setup script again if needed" -ForegroundColor $Green
Write-Host ""
Write-Host "💡 To set up infrastructure again:" -ForegroundColor $Blue
Write-Host "   .\scripts\setup-aws-infrastructure.ps1" -ForegroundColor $Blue
