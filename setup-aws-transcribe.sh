#!/bin/bash

# AWS Transcribe Setup Script
echo "🎤 Setting up AWS Transcribe with Speaker Diarization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is logged in to AWS
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get current user info
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
USER_NAME=$(aws sts get-caller-identity --query Arn --output text | cut -d'/' -f2)
echo -e "${GREEN}✅ Logged in as: $USER_NAME${NC}"

# Create IAM policy
POLICY_NAME="LawSchoolTranscribePolicy"
echo "📋 Creating IAM policy: $POLICY_NAME"

aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file://aws-transcribe-policy.json \
  --description "Policy for AWS Transcribe with S3 access for law school repository" \
  2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Policy created successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Policy may already exist, continuing...${NC}"
fi

# Get account ID for policy ARN
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

# Attach policy to current user
echo "🔗 Attaching policy to user: $USER_NAME"
aws iam attach-user-policy \
  --user-name $USER_NAME \
  --policy-arn $POLICY_ARN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Policy attached to user successfully${NC}"
else
    echo -e "${RED}❌ Failed to attach policy to user${NC}"
    echo "You may need to attach the policy manually in the AWS Console"
fi

# Create transcriptions folder in S3 bucket
echo "📁 Creating transcriptions folder in S3..."
aws s3api put-object \
  --bucket law-school-repository-content \
  --key transcriptions/ \
  --body /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Transcriptions folder created in S3${NC}"
else
    echo -e "${YELLOW}⚠️ Transcriptions folder may already exist or S3 bucket not accessible${NC}"
fi

# Test Transcribe permissions
echo "🧪 Testing AWS Transcribe permissions..."
aws transcribe list-transcription-jobs --max-results 1 &> /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AWS Transcribe access confirmed${NC}"
else
    echo -e "${RED}❌ AWS Transcribe access failed - check permissions${NC}"
fi

echo -e "\n${GREEN}🎉 AWS Transcribe setup complete!${NC}"
echo -e "${YELLOW}📋 Setup Summary:${NC}"
echo "  • Policy: $POLICY_NAME created and attached"
echo "  • S3 transcriptions folder: s3://law-school-repository-content/transcriptions/"
echo "  • User: $USER_NAME has Transcribe permissions"
echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "  • Deploy your updated application"
echo "  • Upload a video to test speaker identification"
echo "  • Check the transcriptions folder in S3 for results"

# Clean up policy file
rm -f aws-transcribe-policy.json
echo -e "${GREEN}✅ Cleaned up temporary policy file${NC}"