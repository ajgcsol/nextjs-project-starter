# AWS Permissions Fix Guide

## 🚨 Issue Identified

Your AWS IAM user `CSOLRepository` doesn't have sufficient permissions to create the required AWS resources. The setup script failed because the user lacks permissions for:

- S3 bucket creation (`s3:CreateBucket`)
- EC2 VPC creation (`ec2:CreateVpc`)
- RDS database creation (`rds:CreateDBInstance`)
- And other essential services

## 🔧 Solution Options

### Option 1: Update IAM User Permissions (Recommended)

**Step 1: Access AWS Console**
1. Go to https://aws.amazon.com/console/
2. Sign in with your **root account** (not the CSOLRepository user)
3. Navigate to **IAM** service

**Step 2: Update User Permissions**
1. Click **"Users"** in the left sidebar
2. Find and click on **"CSOLRepository"**
3. Go to **"Permissions"** tab
4. Click **"Add permissions"** → **"Attach policies directly"**

**Step 3: Attach Required Policies**
Select these AWS managed policies:
- ✅ `PowerUserAccess` (Recommended - gives most permissions except IAM user management)

**OR** for more granular control, attach these specific policies:
- ✅ `AmazonS3FullAccess`
- ✅ `AmazonRDSFullAccess`
- ✅ `AmazonEC2FullAccess`
- ✅ `CloudFrontFullAccess`
- ✅ `ElementalMediaConvertFullAccess`
- ✅ `IAMFullAccess`
- ✅ `CloudWatchFullAccess`

**Step 4: Save Changes**
1. Click **"Next"**
2. Click **"Add permissions"**

### Option 2: Use AWS CloudShell (Alternative)

If you prefer not to modify permissions, use AWS CloudShell with your root account:

1. **Access CloudShell**:
   - Go to AWS Console
   - Click the CloudShell icon (terminal) in the top toolbar
   - Wait for CloudShell to initialize

2. **Upload Setup Script**:
   ```bash
   # Create a new file
   nano setup-infrastructure.sh
   
   # Copy the contents from scripts/setup-aws-infrastructure.sh
   # Save with Ctrl+X, then Y, then Enter
   
   # Make executable
   chmod +x setup-infrastructure.sh
   
   # Run the script
   ./setup-infrastructure.sh
   ```

### Option 3: Manual Resource Creation

If automated setup continues to fail, create resources manually:

**S3 Buckets:**
1. Go to **S3** service in AWS Console
2. Click **"Create bucket"**
3. Create these buckets:
   - `law-school-repository-content`
   - `law-school-repository-video-processing`
   - `law-school-repository-backups`

**RDS Database:**
1. Go to **RDS** service
2. Click **"Create database"**
3. Choose **PostgreSQL**
4. Select **Free tier** (if eligible)
5. Set:
   - DB instance identifier: `law-school-repository-db`
   - Master username: `lawschooladmin`
   - Master password: [your secure password]

## 🔄 After Fixing Permissions

Once permissions are updated, retry the setup:

```powershell
# Test AWS access
aws sts get-caller-identity

# Should now show your account with proper permissions

# Retry the infrastructure setup
.\scripts\setup-aws-infrastructure.ps1
```

## 🛡️ Security Best Practices

### ✅ Recommended Approach
- Use `PowerUserAccess` policy for development
- This gives broad permissions but prevents IAM user management
- Suitable for development and testing environments

### 🔒 Production Approach
- Create custom policies with minimal required permissions
- Use separate IAM users for different environments
- Enable MFA on all accounts
- Regularly rotate access keys

## 📋 Custom Policy (Production)

If you want minimal permissions, create this custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:DeleteBucket",
                "s3:GetBucketLocation",
                "s3:ListBucket",
                "s3:PutBucketPolicy",
                "s3:PutBucketVersioning",
                "s3:PutLifecycleConfiguration",
                "ec2:CreateVpc",
                "ec2:CreateSubnet",
                "ec2:CreateSecurityGroup",
                "ec2:CreateTags",
                "ec2:AuthorizeSecurityGroupIngress",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeAvailabilityZones",
                "rds:CreateDBInstance",
                "rds:CreateDBSubnetGroup",
                "rds:DescribeDBInstances",
                "rds:DescribeDBSubnetGroups",
                "cloudfront:CreateDistribution",
                "cloudfront:GetDistribution",
                "mediaconvert:CreateJobTemplate",
                "mediaconvert:DescribeEndpoints",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:CreatePolicy",
                "iam:GetRole",
                "iam:PassRole",
                "cloudwatch:PutMetricAlarm",
                "sts:GetCallerIdentity"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🚀 Next Steps

1. **Fix permissions** using Option 1 above
2. **Retry setup script**: `.\scripts\setup-aws-infrastructure.ps1`
3. **Continue with application setup**:
   ```powershell
   npm install
   copy .env.aws .env.local
   npm run db:setup
   npm run dev
   ```

## 💡 Alternative: Simplified Setup

If you want to skip AWS infrastructure for now and focus on the application:

1. **Use local development**:
   ```powershell
   npm install
   npm run dev
   ```

2. **Access the application**: http://localhost:3000

3. **Set up AWS later** when you're ready for production deployment

## 📞 Need Help?

- **AWS Documentation**: https://docs.aws.amazon.com/IAM/latest/UserGuide/
- **AWS Support**: Available through your AWS Console
- **Common Issues**: Check CloudWatch logs for detailed error messages

The application is fully functional without AWS - the cloud integration is for production deployment and advanced features like video processing and file storage.
