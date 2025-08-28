# AWS Media Services & Infrastructure Setup Guide

## Overview
This guide provides detailed instructions for setting up AWS infrastructure for the Law School Institutional Repository, including cost estimates, optimization strategies, and implementation steps.

## Architecture Overview

### Core Services Required
1. **AWS MediaConvert** - Video transcoding and processing
2. **AWS Elemental MediaPackage** - Video packaging and delivery
3. **Amazon CloudFront** - Content delivery network
4. **Amazon S3** - Storage for videos, documents, and static assets
5. **Amazon RDS** - Database for application data
6. **AWS Lambda** - Serverless functions for processing
7. **Amazon EC2** - Application hosting (alternative to Vercel)
8. **AWS Cognito** - User authentication (alternative to MSAL)

## Cost Estimates (Monthly)

### Small Institution (100-500 users)
- **Video Storage (S3)**: 500GB @ $0.023/GB = $11.50
- **Document Storage (S3)**: 100GB @ $0.023/GB = $2.30
- **CloudFront CDN**: 1TB transfer @ $0.085/GB = $85.00
- **MediaConvert**: 50 hours @ $0.0075/min = $22.50
- **RDS (db.t3.micro)**: $12.41
- **Lambda**: 1M requests @ $0.20/1M = $0.20
- **EC2 (t3.medium)**: $30.37
- **Total Estimated**: ~$164/month

### Medium Institution (500-2000 users)
- **Video Storage (S3)**: 2TB @ $0.023/GB = $47.10
- **Document Storage (S3)**: 500GB @ $0.023/GB = $11.50
- **CloudFront CDN**: 5TB transfer @ $0.085/GB = $425.00
- **MediaConvert**: 200 hours @ $0.0075/min = $90.00
- **RDS (db.t3.small)**: $24.82
- **Lambda**: 5M requests @ $0.20/1M = $1.00
- **EC2 (t3.large)**: $60.74
- **Total Estimated**: ~$660/month

### Large Institution (2000+ users)
- **Video Storage (S3)**: 10TB @ $0.023/GB = $235.52
- **Document Storage (S3)**: 2TB @ $0.023/GB = $47.10
- **CloudFront CDN**: 20TB transfer @ $0.085/GB = $1,700.00
- **MediaConvert**: 500 hours @ $0.0075/min = $225.00
- **RDS (db.t3.medium)**: $49.64
- **Lambda**: 20M requests @ $0.20/1M = $4.00
- **EC2 (t3.xlarge)**: $121.47
- **Total Estimated**: ~$2,383/month

## Cost Optimization Strategies

### 1. S3 Storage Optimization
```bash
# Use S3 Intelligent Tiering for automatic cost optimization
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket your-bucket-name \
  --id EntireBucket \
  --intelligent-tiering-configuration \
  Id=EntireBucket,Status=Enabled,Filter={},Tiering={Days=1,AccessTier=ARCHIVE_ACCESS},{Days=90,AccessTier=DEEP_ARCHIVE_ACCESS}
```

### 2. CloudFront Caching
- Set appropriate cache headers for static content (1 year)
- Use CloudFront compression
- Implement regional edge caches

### 3. Video Processing Optimization
- Use AWS MediaConvert job templates
- Implement adaptive bitrate streaming
- Use H.264 with optimized settings

## Setup Instructions

### 1. S3 Bucket Configuration

```bash
# Create main content bucket
aws s3 mb s3://law-school-content-bucket

# Create video processing bucket
aws s3 mb s3://law-school-video-processing

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket law-school-content-bucket \
  --versioning-configuration Status=Enabled

# Set up lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket law-school-content-bucket \
  --lifecycle-configuration file://lifecycle-policy.json
```

**lifecycle-policy.json:**
```json
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
    }
  ]
}
```

### 2. CloudFront Distribution Setup

```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**cloudfront-config.json:**
```json
{
  "CallerReference": "law-school-cdn-2024",
  "Comment": "Law School Repository CDN",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-law-school-content-bucket",
        "DomainName": "law-school-content-bucket.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-law-school-content-bucket",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

### 3. MediaConvert Job Template

```json
{
  "Name": "LawSchoolVideoProcessing",
  "Description": "Standard video processing for law school content",
  "Settings": {
    "OutputGroups": [
      {
        "Name": "HLS",
        "OutputGroupSettings": {
          "Type": "HLS_GROUP_SETTINGS",
          "HlsGroupSettings": {
            "Destination": "s3://law-school-video-processing/hls/",
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
            }
          }
        ]
      }
    ]
  }
}
```

### 4. Lambda Function for Video Processing

```javascript
// lambda-video-processor.js
const AWS = require('aws-sdk');
const mediaconvert = new AWS.MediaConvert({
  endpoint: 'https://your-account-id.mediaconvert.region.amazonaws.com'
});

exports.handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  
  const params = {
    Role: 'arn:aws:iam::your-account:role/MediaConvertRole',
    JobTemplate: 'LawSchoolVideoProcessing',
    Settings: {
      Inputs: [
        {
          FileInput: `s3://${bucket}/${key}`
        }
      ]
    }
  };
  
  try {
    const result = await mediaconvert.createJob(params).promise();
    console.log('Job created:', result.Job.Id);
    return {
      statusCode: 200,
      body: JSON.stringify({ jobId: result.Job.Id })
    };
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
};
```

### 5. RDS Database Setup

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier law-school-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username lawschooladmin \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-your-security-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

## Integration with Next.js Application

### 1. Environment Variables

```bash
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=law-school-content-bucket
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
MEDIACONVERT_ENDPOINT=https://your-account-id.mediaconvert.us-east-1.amazonaws.com
RDS_HOST=law-school-db.cluster-xyz.us-east-1.rds.amazonaws.com
RDS_DATABASE=lawschool
RDS_USERNAME=lawschooladmin
RDS_PASSWORD=YourSecurePassword123!
```

### 2. AWS SDK Configuration

```javascript
// lib/aws-config.js
import AWS from 'aws-sdk';

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export const s3 = new AWS.S3();
export const mediaconvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT
});
export const cloudfront = new AWS.CloudFront();
```

### 3. Video Upload API Route

```javascript
// pages/api/videos/upload-to-aws.js
import { s3 } from '../../../lib/aws-config';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable();
  
  try {
    const [fields, files] = await form.parse(req);
    const file = files.video[0];
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `videos/raw/${Date.now()}-${file.originalFilename}`,
      Body: require('fs').createReadStream(file.filepath),
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalFilename,
        'upload-date': new Date().toISOString()
      }
    };
    
    const result = await s3.upload(uploadParams).promise();
    
    res.status(200).json({
      success: true,
      location: result.Location,
      key: result.Key
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

## Security Best Practices

### 1. IAM Roles and Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::law-school-content-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::law-school-content-bucket/public/*"
    },
    {
      "Sid": "DenyInsecureConnections",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::law-school-content-bucket",
        "arn:aws:s3:::law-school-content-bucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

## Monitoring and Alerts

### 1. CloudWatch Alarms

```bash
# High storage usage alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "S3-High-Storage-Usage" \
  --alarm-description "Alert when S3 storage exceeds 80% of budget" \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --statistic Average \
  --period 86400 \
  --threshold 858993459200 \
  --comparison-operator GreaterThanThreshold

# High data transfer alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "CloudFront-High-Data-Transfer" \
  --alarm-description "Alert when data transfer exceeds monthly budget" \
  --metric-name BytesDownloaded \
  --namespace AWS/CloudFront \
  --statistic Sum \
  --period 86400 \
  --threshold 5497558138880 \
  --comparison-operator GreaterThanThreshold
```

### 2. Cost Monitoring

```bash
# Set up billing alerts
aws budgets create-budget \
  --account-id your-account-id \
  --budget file://budget-config.json
```

**budget-config.json:**
```json
{
  "BudgetName": "LawSchoolMonthlyBudget",
  "BudgetLimit": {
    "Amount": "1000",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "Service": [
      "Amazon Simple Storage Service",
      "Amazon CloudFront",
      "AWS Elemental MediaConvert"
    ]
  }
}
```

## Backup and Disaster Recovery

### 1. Cross-Region Replication

```bash
# Enable cross-region replication for critical data
aws s3api put-bucket-replication \
  --bucket law-school-content-bucket \
  --replication-configuration file://replication-config.json
```

### 2. Database Backups

```bash
# Create automated backup policy
aws rds modify-db-instance \
  --db-instance-identifier law-school-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

## Performance Optimization

### 1. CloudFront Cache Behaviors

- **Videos**: Cache for 1 year (31536000 seconds)
- **Images**: Cache for 1 month (2592000 seconds)
- **Documents**: Cache for 1 week (604800 seconds)
- **API responses**: Cache for 5 minutes (300 seconds)

### 2. S3 Transfer Acceleration

```bash
# Enable S3 Transfer Acceleration
aws s3api put-bucket-accelerate-configuration \
  --bucket law-school-content-bucket \
  --accelerate-configuration Status=Enabled
```

## Estimated Annual Costs Summary

| Institution Size | Monthly Cost | Annual Cost | Cost per User/Month |
|------------------|--------------|-------------|-------------------|
| Small (100-500)  | $164        | $1,968      | $0.33-$1.64      |
| Medium (500-2000)| $660        | $7,920      | $0.33-$1.32      |
| Large (2000+)    | $2,383      | $28,596     | $1.19+           |

## Getting Started Checklist

- [ ] Set up AWS account and billing alerts
- [ ] Create IAM roles and policies
- [ ] Configure S3 buckets with lifecycle policies
- [ ] Set up CloudFront distribution
- [ ] Create MediaConvert job templates
- [ ] Deploy Lambda functions
- [ ] Configure RDS instance
- [ ] Set up monitoring and alerts
- [ ] Test video upload and processing workflow
- [ ] Implement backup and disaster recovery
- [ ] Configure security groups and VPC
- [ ] Set up SSL certificates
- [ ] Test CDN performance
- [ ] Implement cost optimization strategies

This setup provides a scalable, cost-effective solution for hosting video content and managing the law school repository with professional-grade AWS services.
