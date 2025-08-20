# AWS Credentials Setup Guide

## ⚠️ Important: Don't Use Root User for Development

For security reasons, you should **never use your AWS root user** for development or API access. Instead, create an IAM user with appropriate permissions.

## Step 1: Create an IAM User (Recommended)

### 1.1 Access AWS Console
1. Go to https://aws.amazon.com/console/
2. Sign in with your root account
3. Navigate to **IAM** service (search for "IAM" in the services)

### 1.2 Create New User
1. Click **"Users"** in the left sidebar
2. Click **"Create user"** button
3. Enter username: `law-school-dev-user` (or any name you prefer)
4. Check **"Provide user access to the AWS Management Console"** if you want console access
5. Click **"Next"**

### 1.3 Set Permissions
**Option A: Quick Setup (Less Secure)**
1. Select **"Attach policies directly"**
2. Search and select these policies:
   - `AmazonS3FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonEC2FullAccess`
   - `CloudFrontFullAccess`
   - `ElementalMediaConvertFullAccess`
   - `IAMFullAccess`
3. Click **"Next"**

**Option B: Custom Policy (More Secure - Recommended)**
1. Select **"Create policy"**
2. Click **"JSON"** tab
3. Paste this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "rds:*",
                "ec2:*",
                "cloudfront:*",
                "mediaconvert:*",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:CreatePolicy",
                "iam:GetRole",
                "iam:PassRole",
                "sts:GetCallerIdentity",
                "cloudwatch:*"
            ],
            "Resource": "*"
        }
    ]
}
```

4. Click **"Next"**
5. Name the policy: `LawSchoolRepositoryPolicy`
6. Click **"Create policy"**
7. Go back to user creation and attach this policy

### 1.4 Create Access Keys
1. After creating the user, click on the username
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Command Line Interface (CLI)"**
6. Check the confirmation box
7. Click **"Next"**
8. Add description: "Law School Repository Development"
9. Click **"Create access key"**

### 1.5 Save Your Credentials
**⚠️ IMPORTANT: Save these immediately - you won't see the secret key again!**

You'll see:
- **Access Key ID**: `AKIA...` (starts with AKIA)
- **Secret Access Key**: `wJalrXUt...` (long random string)

Copy both values to a secure location.

## Step 2: Configure AWS CLI

Now use these credentials with AWS CLI:

```powershell
aws configure
```

Enter:
- **AWS Access Key ID**: [Your Access Key ID from above]
- **AWS Secret Access Key**: [Your Secret Access Key from above]
- **Default region name**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

## Step 3: Test Your Setup

```powershell
# Test if credentials work
aws sts get-caller-identity

# Should return something like:
# {
#     "UserId": "AIDACKCEVSQ6C2EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/law-school-dev-user"
# }
```

## Step 4: Run the Infrastructure Setup

Now you can run the setup script:

```powershell
.\scripts\setup-aws-infrastructure.ps1
```

## Alternative: Use AWS CloudShell

If you don't want to set up local credentials, you can use AWS CloudShell:

1. Go to AWS Console
2. Click the CloudShell icon (terminal icon) in the top toolbar
3. Wait for CloudShell to load
4. Clone your repository or upload the setup script
5. Run the script directly in CloudShell

## Security Best Practices

### ✅ Do:
- Use IAM users instead of root user
- Create users with minimal required permissions
- Rotate access keys regularly
- Use MFA (Multi-Factor Authentication) on your root account
- Delete unused access keys

### ❌ Don't:
- Never use root user credentials for development
- Don't share access keys in code or documentation
- Don't use overly broad permissions like `*:*`
- Don't leave unused IAM users active

## Troubleshooting

### "Access Denied" Errors
- Check if your IAM user has the required permissions
- Verify the policy is attached to your user
- Make sure you're using the correct region

### "Invalid Credentials" Errors
- Double-check your Access Key ID and Secret Access Key
- Make sure there are no extra spaces when copying
- Try running `aws configure` again

### "Region Not Found" Errors
- Use a valid AWS region like `us-east-1`, `us-west-2`, `eu-west-1`
- Check available regions: https://docs.aws.amazon.com/general/latest/gr/rande.html

## Cost Monitoring

After setup, monitor your AWS costs:
1. Go to **AWS Billing Dashboard**
2. Set up **Budget Alerts** for your expected monthly spend
3. Enable **Cost Explorer** to track usage
4. Consider setting up **CloudWatch Billing Alarms**

## Next Steps

Once your credentials are set up:
1. Run the infrastructure setup script
2. Follow the remaining steps in `COMPLETE_SETUP_GUIDE.md`
3. Deploy your application
4. Set up monitoring and backups

## Support

If you encounter issues:
- Check AWS documentation: https://docs.aws.amazon.com/cli/
- AWS Support: https://aws.amazon.com/support/
- IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
