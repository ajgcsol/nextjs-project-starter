# 🚀 MediaConvert Setup Using AWS CLI - Complete Guide

## 🎯 **OVERVIEW**

This guide will help you set up MediaConvert using AWS CLI commands. This is the fastest and most reliable method.

## 📋 **PREREQUISITES**

1. **AWS CLI installed** - If not installed:
   ```bash
   # Windows (using chocolatey)
   choco install awscli
   
   # Or download from: https://aws.amazon.com/cli/
   ```

2. **AWS CLI configured** with your credentials:
   ```bash
   aws configure
   ```
   Enter your:
   - AWS Access Key ID
   - AWS Secret Access Key  
   - Default region (use `us-east-1`)
   - Default output format (use `json`)

## 🔧 **STEP 1: CREATE MEDIACONVERT IAM ROLE**

### **1.1 Create Trust Policy File**
```bash
# Create trust policy for MediaConvert
cat > mediaconvert-trust-policy.json << 'EOF'
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
EOF
```

### **1.2 Create the IAM Role**
```bash
# Create MediaConvert role
aws iam create-role \
  --role-name MediaConvert-Role \
  --assume-role-policy-document file://mediaconvert-trust-policy.json \
  --description "Role for MediaConvert video processing"
```

### **1.3 Attach Required Policies**
```bash
# Attach MediaConvert policy
aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess

# Attach S3 access policy
aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### **1.4 Get Role ARN**
```bash
# Get the role ARN (you'll need this for Vercel)
aws iam get-role --role-name MediaConvert-Role --query 'Role.Arn' --output text
```

**Copy this ARN** - it looks like: `arn:aws:iam::123456789012:role/MediaConvert-Role`

## 🔍 **STEP 2: GET MEDIACONVERT ENDPOINT**

```bash
# Get your account-specific MediaConvert endpoint
aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text
```

**Copy this endpoint** - it looks like: `https://abc123def.mediaconvert.us-east-1.amazonaws.com`

## 🌐 **STEP 3: ADD TO VERCEL**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

```
MEDIACONVERT_ROLE_ARN=arn:aws:iam::123456789012:role/MediaConvert-Role
MEDIACONVERT_ENDPOINT=https://abc123def.mediaconvert.us-east-1.amazonaws.com
```

5. **Redeploy** your application

## ✅ **STEP 4: TEST THE SETUP**

Run the test script to verify everything works:

```bash
node test-mediaconvert-auto-setup.js
```

## 🔧 **COMPLETE AWS CLI SCRIPT**

Here's a complete script that does everything:

```bash
#!/bin/bash

echo "🚀 Setting up MediaConvert with AWS CLI..."

# Step 1: Create trust policy
cat > mediaconvert-trust-policy.json << 'EOF'
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
EOF

# Step 2: Create IAM role
echo "📋 Creating MediaConvert IAM role..."
aws iam create-role \
  --role-name MediaConvert-Role \
  --assume-role-policy-document file://mediaconvert-trust-policy.json \
  --description "Role for MediaConvert video processing"

# Step 3: Attach policies
echo "🔐 Attaching required policies..."
aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess

aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Step 4: Get role ARN
echo "📝 Getting role ARN..."
ROLE_ARN=$(aws iam get-role --role-name MediaConvert-Role --query 'Role.Arn' --output text)
echo "✅ Role ARN: $ROLE_ARN"

# Step 5: Get MediaConvert endpoint
echo "🔍 Getting MediaConvert endpoint..."
ENDPOINT=$(aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text)
echo "✅ Endpoint: $ENDPOINT"

# Step 6: Display results
echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo "Add these to Vercel environment variables:"
echo ""
echo "MEDIACONVERT_ROLE_ARN=$ROLE_ARN"
echo "MEDIACONVERT_ENDPOINT=$ENDPOINT"
echo ""
echo "Then redeploy your application."

# Cleanup
rm mediaconvert-trust-policy.json
```

## 🚨 **TROUBLESHOOTING**

### **If role creation fails:**
```bash
# Check if role already exists
aws iam get-role --role-name MediaConvert-Role

# If it exists, just get the ARN
aws iam get-role --role-name MediaConvert-Role --query 'Role.Arn' --output text
```

### **If endpoint discovery fails:**
```bash
# Make sure you're in the right region
aws configure get region

# Try different region if needed
aws mediaconvert describe-endpoints --region us-west-2 --query 'Endpoints[0].Url' --output text
```

### **If permissions are denied:**
```bash
# Check your AWS credentials
aws sts get-caller-identity

# Make sure you have IAM permissions
aws iam list-roles --max-items 1
```

## 🎯 **VERIFICATION COMMANDS**

After setup, verify everything works:

```bash
# Test MediaConvert access
aws mediaconvert list-jobs --region us-east-1 --max-results 1

# Test role exists
aws iam get-role --role-name MediaConvert-Role

# Test endpoint
aws mediaconvert describe-endpoints --region us-east-1
```

## 💡 **WHAT THIS ENABLES**

Once configured, your video system will have:

✅ **Real thumbnail generation** from video frames  
✅ **WMV to MP4 conversion** for web compatibility  
✅ **Professional video processing** with AWS MediaConvert  
✅ **Automatic processing** for new uploads  
✅ **Batch processing** for existing videos  

## 🏁 **NEXT STEPS**

1. Run the AWS CLI commands above
2. Add the environment variables to Vercel
3. Redeploy your application
4. Test with: `node test-mediaconvert-auto-setup.js`
5. Upload a video to see real thumbnails in action!

---

**This method is much easier than using the AWS Console and guarantees the correct configuration.**
