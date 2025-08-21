#!/bin/bash

echo "🚀 Setting up MediaConvert with AWS CLI..."
echo "=========================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   Windows: choco install awscli"
    echo "   macOS: brew install awscli"
    echo "   Linux: sudo apt-get install awscli"
    echo "   Or download from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run:"
    echo "   aws configure"
    echo "   And enter your AWS credentials"
    exit 1
fi

echo "✅ AWS CLI is installed and configured"
echo ""

# Get current AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
REGION=$(aws configure get region)
echo "📋 AWS Account: $ACCOUNT_ID"
echo "📋 Region: $REGION"
echo ""

# Step 1: Create trust policy
echo "📝 Creating MediaConvert trust policy..."
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

# Step 2: Check if role already exists
echo "🔍 Checking if MediaConvert-Role already exists..."
if aws iam get-role --role-name MediaConvert-Role &> /dev/null; then
    echo "⚠️ MediaConvert-Role already exists. Using existing role."
    ROLE_EXISTS=true
else
    echo "📋 Creating new MediaConvert-Role..."
    ROLE_EXISTS=false
    
    # Create IAM role
    aws iam create-role \
      --role-name MediaConvert-Role \
      --assume-role-policy-document file://mediaconvert-trust-policy.json \
      --description "Role for MediaConvert video processing"
    
    if [ $? -eq 0 ]; then
        echo "✅ MediaConvert-Role created successfully"
    else
        echo "❌ Failed to create MediaConvert-Role"
        exit 1
    fi
fi

# Step 3: Attach policies (safe to run multiple times)
echo "🔐 Attaching required policies..."

aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess

aws iam attach-role-policy \
  --role-name MediaConvert-Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

echo "✅ Policies attached"

# Step 4: Get role ARN
echo "📝 Getting role ARN..."
ROLE_ARN=$(aws iam get-role --role-name MediaConvert-Role --query 'Role.Arn' --output text)

if [ -z "$ROLE_ARN" ]; then
    echo "❌ Failed to get role ARN"
    exit 1
fi

echo "✅ Role ARN: $ROLE_ARN"

# Step 5: Get MediaConvert endpoint
echo "🔍 Getting MediaConvert endpoint..."
ENDPOINT=$(aws mediaconvert describe-endpoints --region $REGION --query 'Endpoints[0].Url' --output text 2>/dev/null)

if [ -z "$ENDPOINT" ] || [ "$ENDPOINT" = "None" ]; then
    echo "⚠️ Failed to get endpoint for region $REGION, trying us-east-1..."
    ENDPOINT=$(aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text 2>/dev/null)
    
    if [ -z "$ENDPOINT" ] || [ "$ENDPOINT" = "None" ]; then
        echo "❌ Failed to get MediaConvert endpoint. MediaConvert might not be available in your region."
        echo "💡 You can still use the role ARN and let the system auto-discover the endpoint."
        ENDPOINT="AUTO_DISCOVER"
    else
        echo "✅ Endpoint (us-east-1): $ENDPOINT"
    fi
else
    echo "✅ Endpoint: $ENDPOINT"
fi

# Step 6: Test MediaConvert access
echo "🧪 Testing MediaConvert access..."
if aws mediaconvert list-jobs --region $REGION --max-results 1 &> /dev/null; then
    echo "✅ MediaConvert access confirmed"
elif aws mediaconvert list-jobs --region us-east-1 --max-results 1 &> /dev/null; then
    echo "✅ MediaConvert access confirmed (us-east-1)"
else
    echo "⚠️ MediaConvert access test failed, but role is created"
fi

# Cleanup
rm -f mediaconvert-trust-policy.json

# Step 7: Display results
echo ""
echo "🎉 MEDIACONVERT SETUP COMPLETE!"
echo "==============================="
echo ""
echo "📋 Add these environment variables to Vercel:"
echo ""
echo "MEDIACONVERT_ROLE_ARN=$ROLE_ARN"

if [ "$ENDPOINT" != "AUTO_DISCOVER" ]; then
    echo "MEDIACONVERT_ENDPOINT=$ENDPOINT"
else
    echo "# MEDIACONVERT_ENDPOINT not needed - system will auto-discover"
fi

echo ""
echo "🚀 Next steps:"
echo "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables"
echo "2. Add the MEDIACONVERT_ROLE_ARN variable above"
if [ "$ENDPOINT" != "AUTO_DISCOVER" ]; then
    echo "3. Add the MEDIACONVERT_ENDPOINT variable above"
    echo "4. Redeploy your application"
else
    echo "3. Redeploy your application (endpoint will auto-discover)"
fi
echo "5. Test with: node test-mediaconvert-auto-setup.js"
echo ""
echo "✅ Real thumbnail generation and WMV conversion will be enabled!"
