# Azure/AWS Setup Guide for Law School Repository

Since you already have Azure or AWS accounts, here's the optimized setup using your existing cloud infrastructure.

## 🎯 Recommended Setup Using Your Existing Cloud Services

### Option A: Azure-Based Setup (~$85-120/month)

| Service | Cost | Purpose |
|---------|------|---------|
| **Azure Database for PostgreSQL** | $35-50/month | Main database |
| **Azure Blob Storage** | $10-15/month | File and video storage |
| **Azure Media Services** | $25-40/month | Video processing |
| **Vercel Pro** | $20/month | App hosting |
| **Total** | **$90-125/month** | Complete system |

### Option B: AWS-Based Setup (~$100-164/month)

| Service | Cost | Purpose |
|---------|------|---------|
| **AWS RDS PostgreSQL** | $25-40/month | Main database |
| **AWS S3** | $15-25/month | File storage |
| **AWS MediaConvert** | $30-60/month | Video processing |
| **AWS CloudFront** | $15-25/month | CDN |
| **Vercel Pro** | $20/month | App hosting |
| **Total** | **$105-170/month** | Enterprise system |

---

## 🗄️ Database Setup

### Option A: Azure Database for PostgreSQL

#### 1. Create Azure PostgreSQL Database
```bash
# Using Azure CLI
az postgres server create \
  --resource-group law-school-rg \
  --name law-school-db \
  --location eastus \
  --admin-user lawschooladmin \
  --admin-password YourSecurePassword123! \
  --sku-name B_Gen5_1 \
  --version 13

# Create database
az postgres db create \
  --resource-group law-school-rg \
  --server-name law-school-db \
  --name lawschool
```

#### 2. Configure Connection
```bash
# .env.local
DATABASE_URL=postgresql://lawschooladmin:YourSecurePassword123!@law-school-db.postgres.database.azure.com:5432/lawschool?sslmode=require
```

### Option B: AWS RDS PostgreSQL

#### 1. Create RDS Instance
```bash
# Using AWS CLI
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
  --storage-encrypted
```

#### 2. Configure Connection
```bash
# .env.local
DATABASE_URL=postgresql://lawschooladmin:YourSecurePassword123!@law-school-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/lawschool
```

---

## 📁 File Storage Setup

### Option A: Azure Blob Storage

#### 1. Create Storage Account
```bash
# Create storage account
az storage account create \
  --name lawschoolstorage \
  --resource-group law-school-rg \
  --location eastus \
  --sku Standard_LRS

# Create containers
az storage container create \
  --name documents \
  --account-name lawschoolstorage

az storage container create \
  --name videos \
  --account-name lawschoolstorage

az storage container create \
  --name images \
  --account-name lawschoolstorage
```

#### 2. Configure Azure Storage
```javascript
// lib/azure-storage.js
const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);

export async function uploadFile(file, containerName, fileName) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    const uploadBlobResponse = await blockBlobClient.uploadData(file, {
      blobHTTPHeaders: {
        blobContentType: file.type
      }
    });
    
    return {
      url: blockBlobClient.url,
      uploadId: uploadBlobResponse.requestId
    };
  } catch (error) {
    console.error('Azure upload error:', error);
    throw error;
  }
}
```

#### 3. Environment Variables
```bash
# .env.local
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=lawschoolstorage;AccountKey=your-key;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=lawschoolstorage
```

### Option B: AWS S3 Storage

#### 1. Create S3 Buckets
```bash
# Create main content bucket
aws s3 mb s3://law-school-content-bucket

# Create video processing bucket
aws s3 mb s3://law-school-video-processing

# Set up CORS configuration
aws s3api put-bucket-cors \
  --bucket law-school-content-bucket \
  --cors-configuration file://cors-config.json
```

#### 2. Configure S3
```javascript
// lib/aws-storage.js
import AWS from 'aws-sdk';

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

export async function uploadFile(file, bucketName, key) {
  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'upload-date': new Date().toISOString()
      }
    };
    
    const result = await s3.upload(uploadParams).promise();
    return {
      url: result.Location,
      key: result.Key
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}
```

#### 3. Environment Variables
```bash
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=law-school-content-bucket
```

---

## 🎥 Video Processing Setup

### Option A: Azure Media Services

#### 1. Create Media Services Account
```bash
# Create media services account
az ams account create \
  --name lawschoolmedia \
  --resource-group law-school-rg \
  --storage-account lawschoolstorage \
  --location eastus
```

#### 2. Configure Video Processing
```javascript
// lib/azure-media.js
const { AzureMediaServices } = require('@azure/arm-mediaservices');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const client = new AzureMediaServices(credential, process.env.AZURE_SUBSCRIPTION_ID);

export async function processVideo(inputUrl, outputName) {
  try {
    const transformName = 'LawSchoolTransform';
    
    // Create encoding job
    const job = await client.jobs.create(
      process.env.AZURE_RESOURCE_GROUP,
      process.env.AZURE_MEDIA_ACCOUNT,
      transformName,
      outputName,
      {
        input: {
          '@odata.type': '#Microsoft.Media.JobInputHttp',
          baseUri: inputUrl
        },
        outputs: [
          {
            '@odata.type': '#Microsoft.Media.JobOutputAsset',
            assetName: outputName
          }
        ]
      }
    );
    
    return job;
  } catch (error) {
    console.error('Azure Media processing error:', error);
    throw error;
  }
}
```

### Option B: AWS MediaConvert

#### 1. Create MediaConvert Job Template
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
            "SegmentLength": 10
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
            }
          }
        ]
      }
    ]
  }
}
```

#### 2. Configure MediaConvert
```javascript
// lib/aws-media.js
import AWS from 'aws-sdk';

const mediaconvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT
});

export async function processVideo(inputUrl, outputPath) {
  try {
    const params = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      JobTemplate: 'LawSchoolVideoProcessing',
      Settings: {
        Inputs: [
          {
            FileInput: inputUrl
          }
        ]
      }
    };
    
    const result = await mediaconvert.createJob(params).promise();
    return result.Job;
  } catch (error) {
    console.error('MediaConvert error:', error);
    throw error;
  }
}
```

---

## 🔧 Updated File Upload API

### Azure Version
```javascript
// pages/api/files/upload-azure.js
import { uploadFile } from '../../../lib/azure-storage';
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
    const file = files.file[0];
    const context = fields.context[0] || 'documents';
    
    const fileName = `${Date.now()}-${file.originalFilename}`;
    const fileBuffer = require('fs').readFileSync(file.filepath);
    
    const result = await uploadFile(fileBuffer, context, fileName);
    
    res.status(200).json({
      success: true,
      url: result.url,
      filename: fileName
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

### AWS Version
```javascript
// pages/api/files/upload-aws.js
import { uploadFile } from '../../../lib/aws-storage';
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
    const file = files.file[0];
    const context = fields.context[0] || 'documents';
    
    const fileName = `${context}/${Date.now()}-${file.originalFilename}`;
    const fileStream = require('fs').createReadStream(file.filepath);
    
    const result = await uploadFile(fileStream, process.env.S3_BUCKET_NAME, fileName);
    
    res.status(200).json({
      success: true,
      url: result.url,
      key: result.key
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

---

## 📦 Updated Package Dependencies

```bash
# For Azure
npm install @azure/storage-blob @azure/arm-mediaservices @azure/identity

# For AWS
npm install aws-sdk

# Common dependencies
npm install formidable
```

---

## 🔐 Security Configuration

### Azure Security
```javascript
// lib/azure-auth.js
const { DefaultAzureCredential } = require('@azure/identity');

export function getAzureCredentials() {
  return new DefaultAzureCredential();
}

// Set up managed identity or service principal
export const azureConfig = {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
  resourceGroup: process.env.AZURE_RESOURCE_GROUP,
  credentials: getAzureCredentials()
};
```

### AWS Security
```javascript
// lib/aws-auth.js
import AWS from 'aws-sdk';

// Use IAM roles for EC2 or Lambda
AWS.config.update({
  region: process.env.AWS_REGION
});

// Or use access keys (less secure)
if (process.env.AWS_ACCESS_KEY_ID) {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });
}
```

---

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Database (choose one)
DATABASE_URL=postgresql://... # Azure or AWS RDS connection string

# Storage (choose one)
# Azure
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=...

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...

# Video Processing (choose one)
# Azure Media Services
AZURE_MEDIA_ACCOUNT=...

# AWS MediaConvert
MEDIACONVERT_ENDPOINT=...
MEDIACONVERT_ROLE_ARN=...

# App Configuration
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

---

## 💰 Cost Optimization

### Azure Optimization
- Use **Basic tier** for PostgreSQL during development
- Enable **auto-pause** for database during off-hours
- Use **Cool storage tier** for infrequently accessed files
- Set up **budget alerts** in Azure Cost Management

### AWS Optimization
- Use **db.t3.micro** for RDS (free tier eligible)
- Enable **S3 Intelligent Tiering**
- Use **Reserved Instances** for predictable workloads
- Set up **CloudWatch billing alarms**

---

## 📊 Monitoring Setup

### Azure Monitoring
```javascript
// lib/azure-monitoring.js
const { ApplicationInsights } = require('applicationinsights');

ApplicationInsights.setup(process.env.AZURE_INSIGHTS_KEY)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .setAutoCollectPerformance(true)
  .start();

export const appInsights = ApplicationInsights.defaultClient;
```

### AWS Monitoring
```javascript
// lib/aws-monitoring.js
import AWS from 'aws-sdk';

const cloudwatch = new AWS.CloudWatch();

export async function logMetric(metricName, value, unit = 'Count') {
  const params = {
    Namespace: 'LawSchool/Repository',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date()
      }
    ]
  };
  
  await cloudwatch.putMetricData(params).promise();
}
```

This setup leverages your existing Azure or AWS infrastructure while maintaining the same functionality and user experience. Choose the option that aligns with your current cloud provider and existing services.
