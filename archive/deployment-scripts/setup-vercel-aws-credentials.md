# 🚨 URGENT: Fix AWS Credentials in Vercel

The multipart upload is failing because AWS credentials are not configured in your Vercel deployment. Here's how to fix it:

## Option 1: Quick Fix via Vercel Dashboard (Recommended)

### Step 1: Get Your AWS Credentials
1. Go to AWS Console → IAM → Users
2. Find your user (or create one if needed)
3. Go to "Security credentials" tab
4. Create access key if you don't have one
5. Copy both:
   - **Access Key ID** (starts with AKIA...)
   - **Secret Access Key** (long random string)

### Step 2: Add to Vercel Environment Variables
1. Go to https://vercel.com/dashboard
2. Select your project: `law-school-repository-...`
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
AWS_ACCESS_KEY_ID = AKIA... (your access key)
AWS_SECRET_ACCESS_KEY = wJalrXUt... (your secret key)
AWS_REGION = us-east-1
S3_BUCKET_NAME = law-school-repository-content
CLOUDFRONT_DOMAIN = d24qjgz9z4yzof.cloudfront.net
```

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete

## Option 2: Command Line (Alternative)

If you have Vercel CLI installed:

```bash
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY  
vercel env add AWS_REGION
vercel env add S3_BUCKET_NAME
vercel env add CLOUDFRONT_DOMAIN
```

## Option 3: Create AWS Infrastructure (If Needed)

If you don't have AWS set up yet:

```powershell
# Run the setup script
.\scripts\setup-aws-infrastructure.ps1
```

This will create:
- S3 buckets for video storage
- CloudFront distribution for fast delivery
- Proper IAM permissions

## Verify the Fix

After adding credentials and redeploying:

1. Go to your video upload page
2. Try uploading a large video (>100MB)
3. Should work without "Failed to initialize multipart upload" error

## Security Notes

✅ **Good practices:**
- Never commit AWS credentials to git
- Use environment variables in Vercel
- Create IAM user (don't use root account)
- Use minimal required permissions

❌ **Don't do:**
- Put credentials in code
- Use overly broad permissions
- Share credentials in chat/email

## Troubleshooting

### Still getting "Failed to initialize multipart upload"?
1. Check environment variables are set correctly in Vercel
2. Verify AWS credentials work: `aws sts get-caller-identity`
3. Check S3 bucket exists and has proper permissions
4. Ensure region matches between all services

### Need help with AWS setup?
- Follow `AWS_CREDENTIALS_SETUP.md` for detailed instructions
- Run `.\scripts\setup-aws-infrastructure.ps1` for automated setup
- Check AWS documentation for IAM best practices

## Expected Result

After fixing credentials:
- ✅ Large video uploads work
- ✅ Multipart upload initializes successfully  
- ✅ Videos stream without timeout
- ✅ CloudFront delivers content fast

The core streaming timeout issue is already fixed in the code - this just enables the upload functionality!
