#!/bin/bash

# AWS Infrastructure Setup Script for Law School Repository
# This script sets up all required AWS services automatically

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="law-school-repository"
REGION="us-east-1"
DB_USERNAME="lawschooladmin"
DB_PASSWORD=""
DOMAIN_NAME=""

echo -e "${BLUE}🏛️  Law School Repository - AWS Infrastructure Setup${NC}"
echo "=================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI is configured${NC}"

# Get user input
read -p "Enter AWS region (default: us-east-1): " input_region
REGION=${input_region:-$REGION}

read -p "Enter database password (min 8 characters): " -s DB_PASSWORD
echo
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}❌ Password must be at least 8 characters${NC}"
    exit 1
fi

read -p "Enter your domain name (optional, e.g., repository.lawschool.edu): " DOMAIN_NAME

echo -e "${YELLOW}🚀 Starting AWS infrastructure setup...${NC}"

# Create S3 buckets
echo -e "${BLUE}📦 Creating S3 buckets...${NC}"

# Main content bucket
aws s3 mb s3://${PROJECT_NAME}-content --region $REGION
aws s3 mb s3://${PROJECT_NAME}-video-processing --region $REGION
aws s3 mb s3://${PROJECT_NAME}-backups --region $REGION

# Configure bucket policies
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${PROJECT_NAME}-content/public/*"
        },
        {
            "Sid": "DenyInsecureConnections",
            "Effect": "Deny",
            "Principal": "*",
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::${PROJECT_NAME}-content",
                "arn:aws:s3:::${PROJECT_NAME}-content/*"
            ],
            "Condition": {
                "Bool": {
                    "aws:SecureTransport": "false"
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket ${PROJECT_NAME}-content --policy file:///tmp/bucket-policy.json

# Enable versioning
aws s3api put-bucket-versioning --bucket ${PROJECT_NAME}-content --versioning-configuration Status=Enabled
aws s3api put-bucket-versioning --bucket ${PROJECT_NAME}-video-processing --versioning-configuration Status=Enabled

# Set up lifecycle policies
cat > /tmp/lifecycle-policy.json << EOF
{
    "Rules": [
        {
            "ID": "VideoArchiving",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "videos/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ]
        },
        {
            "ID": "DocumentArchiving",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "documents/"
            },
            "Transitions": [
                {
                    "Days": 90,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 365,
                    "StorageClass": "GLACIER"
                }
            ]
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration --bucket ${PROJECT_NAME}-content --lifecycle-configuration file:///tmp/lifecycle-policy.json

echo -e "${GREEN}✅ S3 buckets created and configured${NC}"

# Create VPC and Security Groups
echo -e "${BLUE}🔒 Creating VPC and security groups...${NC}"

VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text --region $REGION)
aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=${PROJECT_NAME}-vpc --region $REGION

# Create subnets
SUBNET_1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${REGION}a --query 'Subnet.SubnetId' --output text --region $REGION)
SUBNET_2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${REGION}b --query 'Subnet.SubnetId' --output text --region $REGION)

aws ec2 create-tags --resources $SUBNET_1 --tags Key=Name,Value=${PROJECT_NAME}-subnet-1 --region $REGION
aws ec2 create-tags --resources $SUBNET_2 --tags Key=Name,Value=${PROJECT_NAME}-subnet-2 --region $REGION

# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
    --db-subnet-group-description "Subnet group for law school database" \
    --subnet-ids $SUBNET_1 $SUBNET_2 \
    --region $REGION

# Create security group for RDS
DB_SECURITY_GROUP=$(aws ec2 create-security-group \
    --group-name ${PROJECT_NAME}-db-sg \
    --description "Security group for law school database" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $REGION)

# Allow PostgreSQL access
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SECURITY_GROUP \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $REGION

echo -e "${GREEN}✅ VPC and security groups created${NC}"

# Create RDS PostgreSQL instance
echo -e "${BLUE}🗄️  Creating RDS PostgreSQL database...${NC}"

aws rds create-db-instance \
    --db-instance-identifier ${PROJECT_NAME}-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 13.13 \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --vpc-security-group-ids $DB_SECURITY_GROUP \
    --db-subnet-group-name ${PROJECT_NAME}-db-subnet-group \
    --backup-retention-period 7 \
    --storage-encrypted \
    --region $REGION

echo -e "${YELLOW}⏳ Database is being created (this takes 5-10 minutes)...${NC}"

# Create IAM roles
echo -e "${BLUE}👤 Creating IAM roles...${NC}"

# MediaConvert role
cat > /tmp/mediaconvert-trust-policy.json << EOF
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

aws iam create-role \
    --role-name ${PROJECT_NAME}-MediaConvertRole \
    --assume-role-policy-document file:///tmp/mediaconvert-trust-policy.json

aws iam attach-role-policy \
    --role-name ${PROJECT_NAME}-MediaConvertRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Application role for EC2/Lambda
cat > /tmp/app-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": ["ec2.amazonaws.com", "lambda.amazonaws.com"]
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name ${PROJECT_NAME}-AppRole \
    --assume-role-policy-document file:///tmp/app-trust-policy.json

# Create custom policy for app
cat > /tmp/app-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${PROJECT_NAME}-content",
                "arn:aws:s3:::${PROJECT_NAME}-content/*",
                "arn:aws:s3:::${PROJECT_NAME}-video-processing",
                "arn:aws:s3:::${PROJECT_NAME}-video-processing/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "mediaconvert:CreateJob",
                "mediaconvert:GetJob",
                "mediaconvert:ListJobs"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "rds:DescribeDBInstances"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam create-policy \
    --policy-name ${PROJECT_NAME}-AppPolicy \
    --policy-document file:///tmp/app-policy.json

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws iam attach-role-policy \
    --role-name ${PROJECT_NAME}-AppRole \
    --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/${PROJECT_NAME}-AppPolicy

echo -e "${GREEN}✅ IAM roles created${NC}"

# Set up MediaConvert
echo -e "${BLUE}🎥 Setting up MediaConvert...${NC}"

# Get MediaConvert endpoint
MEDIACONVERT_ENDPOINT=$(aws mediaconvert describe-endpoints --query 'Endpoints[0].Url' --output text --region $REGION)

# Create job template
cat > /tmp/mediaconvert-template.json << EOF
{
    "Name": "${PROJECT_NAME}-template",
    "Description": "Standard video processing for law school content",
    "Settings": {
        "OutputGroups": [
            {
                "Name": "HLS",
                "OutputGroupSettings": {
                    "Type": "HLS_GROUP_SETTINGS",
                    "HlsGroupSettings": {
                        "Destination": "s3://${PROJECT_NAME}-video-processing/hls/",
                        "SegmentLength": 10,
                        "MinSegmentLength": 0
                    }
                },
                "Outputs": [
                    {
                        "NameModifier": "_720p",
                        "VideoDescription": {
                            "Width": 1280,
                            "Height": 720,
                            "CodecSettings": {
                                "Codec": "H_264",
                                "H264Settings": {
                                    "Bitrate": 3000000,
                                    "RateControlMode": "CBR"
                                }
                            }
                        },
                        "AudioDescriptions": [
                            {
                                "CodecSettings": {
                                    "Codec": "AAC",
                                    "AacSettings": {
                                        "Bitrate": 128000,
                                        "SampleRate": 48000
                                    }
                                }
                            }
                        ]
                    },
                    {
                        "NameModifier": "_480p",
                        "VideoDescription": {
                            "Width": 854,
                            "Height": 480,
                            "CodecSettings": {
                                "Codec": "H_264",
                                "H264Settings": {
                                    "Bitrate": 1500000,
                                    "RateControlMode": "CBR"
                                }
                            }
                        },
                        "AudioDescriptions": [
                            {
                                "CodecSettings": {
                                    "Codec": "AAC",
                                    "AacSettings": {
                                        "Bitrate": 128000,
                                        "SampleRate": 48000
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
EOF

aws mediaconvert create-job-template \
    --cli-input-json file:///tmp/mediaconvert-template.json \
    --endpoint-url $MEDIACONVERT_ENDPOINT \
    --region $REGION

echo -e "${GREEN}✅ MediaConvert configured${NC}"

# Create CloudFront distribution
echo -e "${BLUE}🌐 Creating CloudFront distribution...${NC}"

cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "${PROJECT_NAME}-$(date +%s)",
    "Comment": "Law School Repository CDN",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${PROJECT_NAME}-content",
                "DomainName": "${PROJECT_NAME}-content.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${PROJECT_NAME}-content",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        }
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

CLOUDFRONT_ID=$(aws cloudfront create-distribution \
    --distribution-config file:///tmp/cloudfront-config.json \
    --query 'Distribution.Id' \
    --output text)

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id $CLOUDFRONT_ID \
    --query 'Distribution.DomainName' \
    --output text)

echo -e "${GREEN}✅ CloudFront distribution created${NC}"

# Wait for database to be available
echo -e "${YELLOW}⏳ Waiting for database to be available...${NC}"
aws rds wait db-instance-available --db-instance-identifier ${PROJECT_NAME}-db --region $REGION

# Get database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier ${PROJECT_NAME}-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION)

echo -e "${GREEN}✅ Database is ready${NC}"

# Set up CloudWatch alarms
echo -e "${BLUE}📊 Setting up monitoring...${NC}"

# High storage usage alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-High-Storage-Usage" \
    --alarm-description "Alert when S3 storage exceeds 80% of budget" \
    --metric-name BucketSizeBytes \
    --namespace AWS/S3 \
    --statistic Average \
    --period 86400 \
    --threshold 858993459200 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=BucketName,Value=${PROJECT_NAME}-content Name=StorageType,Value=StandardStorage \
    --region $REGION

# Database CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "${PROJECT_NAME}-DB-High-CPU" \
    --alarm-description "Alert when database CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/RDS \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=DBInstanceIdentifier,Value=${PROJECT_NAME}-db \
    --region $REGION

echo -e "${GREEN}✅ Monitoring configured${NC}"

# Generate environment file
echo -e "${BLUE}📝 Generating environment configuration...${NC}"

cat > .env.aws << EOF
# AWS Configuration
AWS_REGION=$REGION
AWS_ACCOUNT_ID=$ACCOUNT_ID

# Database
DATABASE_URL=postgresql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:5432/postgres

# S3 Storage
S3_BUCKET_NAME=${PROJECT_NAME}-content
S3_VIDEO_BUCKET=${PROJECT_NAME}-video-processing
S3_BACKUP_BUCKET=${PROJECT_NAME}-backups

# MediaConvert
MEDIACONVERT_ENDPOINT=$MEDIACONVERT_ENDPOINT
MEDIACONVERT_ROLE_ARN=arn:aws:iam::$ACCOUNT_ID:role/${PROJECT_NAME}-MediaConvertRole
MEDIACONVERT_TEMPLATE=${PROJECT_NAME}-template

# CloudFront
CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN
CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_ID

# Application Settings
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://$DOMAIN_NAME

# File Upload Settings
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# Ollama (for plagiarism detection)
OLLAMA_API_URL=http://localhost:11434

# Microsoft 365 Integration (optional)
# NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
# NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
# NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=https://$DOMAIN_NAME/dashboard
# NEXT_PUBLIC_AZURE_AD_LOGOUT_REDIRECT_URI=https://$DOMAIN_NAME/login
EOF

# Clean up temporary files
rm -f /tmp/*.json

echo -e "${GREEN}🎉 AWS Infrastructure Setup Complete!${NC}"
echo "=============================================="
echo
echo -e "${BLUE}📋 Setup Summary:${NC}"
echo "• S3 Buckets: ${PROJECT_NAME}-content, ${PROJECT_NAME}-video-processing, ${PROJECT_NAME}-backups"
echo "• RDS Database: ${PROJECT_NAME}-db"
echo "• CloudFront Distribution: $CLOUDFRONT_DOMAIN"
echo "• MediaConvert Template: ${PROJECT_NAME}-template"
echo "• IAM Roles: ${PROJECT_NAME}-MediaConvertRole, ${PROJECT_NAME}-AppRole"
echo
echo -e "${BLUE}💰 Estimated Monthly Costs:${NC}"
echo "• RDS (db.t3.micro): ~$12-15"
echo "• S3 Storage (100GB): ~$2-5"
echo "• CloudFront (1TB): ~$85"
echo "• MediaConvert (50 hours): ~$22"
echo "• Total: ~$121-127/month"
echo
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "1. Copy .env.aws to .env.local in your Next.js project"
echo "2. Install dependencies: npm install aws-sdk"
echo "3. Run database setup: npm run db:setup"
echo "4. Deploy to Vercel or your preferred hosting platform"
echo "5. Configure your domain DNS to point to CloudFront"
echo
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• Save your database password securely"
echo "• Configure AWS credentials for your application"
echo "• Set up SSL certificate for your domain"
echo "• Review and adjust CloudWatch alarms as needed"
echo
echo -e "${GREEN}✅ Your law school repository infrastructure is ready!${NC}"
