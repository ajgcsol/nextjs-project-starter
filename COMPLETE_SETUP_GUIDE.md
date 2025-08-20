# Complete Setup Guide - Law School Repository with AWS

## 🚀 Quick Start (Recommended Path)

Since you already have AWS infrastructure, here's the fastest way to get your law school repository running:

### Step 1: Install AWS CLI (if not already installed)

**Windows:**
```powershell
# Option 1: Download MSI installer
# Visit: https://awscli.amazonaws.com/AWSCLIV2.msi

# Option 2: Using Chocolatey
choco install awscli

# Option 3: Using Scoop
scoop install aws

# Option 4: Using winget
winget install Amazon.AWSCLI
```

**macOS:**
```bash
# Using Homebrew
brew install awscli

# Or download installer from AWS
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Linux:**
```bash
# Download and install
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Step 2: Configure AWS CLI

**⚠️ IMPORTANT: Don't use your root user credentials!**

If you don't have AWS credentials set up yet, follow the detailed guide:
📖 **[AWS_CREDENTIALS_SETUP.md](./AWS_CREDENTIALS_SETUP.md)** - Complete step-by-step instructions

**Quick Summary:**
1. Create an IAM user in AWS Console (never use root user)
2. Attach required policies for S3, RDS, EC2, etc.
3. Create access keys for the IAM user
4. Configure AWS CLI:

```bash
aws configure

# Enter your IAM user credentials:
# - AWS Access Key ID (starts with AKIA...)
# - AWS Secret Access Key (long random string)
# - Default region (e.g., us-east-1)
# - Output format (json)
```

**Test your setup:**
```bash
aws sts get-caller-identity
```

### Step 3: Run AWS Infrastructure Setup

**Windows (PowerShell):**
```powershell
# Navigate to the project directory
cd nextjs-project-starter

# Run the PowerShell setup script
.\scripts\setup-aws-infrastructure.ps1
```

**macOS/Linux (Bash):**
```bash
# Navigate to the project directory
cd nextjs-project-starter

# Make the script executable
chmod +x scripts/setup-aws-infrastructure.sh

# Run the setup (this will take 10-15 minutes)
./scripts/setup-aws-infrastructure.sh
```

This script will automatically create:
- ✅ S3 buckets for content, videos, and backups
- ✅ RDS PostgreSQL database
- ✅ CloudFront CDN distribution
- ✅ MediaConvert job templates
- ✅ IAM roles and policies
- ✅ CloudWatch monitoring
- ✅ Environment configuration file

### Step 4: Install Dependencies
```bash
# Install all required packages
npm install

# This includes:
# - aws-sdk (for AWS integration)
# - pg (for PostgreSQL)
# - formidable (for file uploads)
# - All existing dependencies
```

### Step 5: Set Up Database
```bash
# Copy the generated AWS environment file
cp .env.aws .env.local

# Run database setup
npm run db:setup
```

### Step 6: Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# (copy from .env.local)
```

## 📋 What You Get

### 🏛️ Complete Law School Repository System
- **Editorial Workflow**: AI-powered plagiarism detection, Bluebook citation checking, track changes
- **Course Management**: Professor dashboards, student portals, assignment management
- **Media Integration**: Video processing, file uploads, CDN delivery
- **User Management**: Role-based access control, Microsoft 365 integration
- **Public Repository**: Searchable database of published works

### 💰 AWS Infrastructure Costs
- **Small Institution (100-500 users)**: ~$121-127/month
- **Medium Institution (500-2000 users)**: ~$200-250/month
- **Large Institution (2000+ users)**: ~$300-400/month

### 🔧 AWS Services Configured
- **RDS PostgreSQL**: Database with automatic backups
- **S3**: File and video storage with lifecycle policies
- **CloudFront**: Global CDN for fast content delivery
- **MediaConvert**: Professional video processing
- **CloudWatch**: Monitoring and alerts
- **IAM**: Security roles and policies

## 📁 Project Structure

```
law-school-repository/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── aws/              # AWS-specific APIs
│   │   │   │   ├── upload/       # File upload to S3
│   │   │   │   └── video/        # Video processing
│   │   │   ├── plagiarism/       # AI plagiarism detection
│   │   │   ├── bluebook/         # Citation checking
│   │   │   └── courses/          # Course management
│   │   ├── dashboard/            # Admin/user dashboards
│   │   └── public/               # Public pages
│   ├── components/               # React components
│   ├── lib/
│   │   ├── aws-integration.ts    # AWS SDK integration
│   │   ├── database.ts           # Database utilities
│   │   └── editorialWorkflowAdvanced.ts
│   └── contexts/                 # React contexts
├── database/
│   └── schema.sql               # Complete PostgreSQL schema
├── scripts/
│   ├── setup-aws-infrastructure.sh  # AWS setup automation
│   └── setup-database.js           # Database setup
└── docs/
    ├── AWS_SETUP_GUIDE.md          # Detailed AWS guide
    ├── BUDGET_SETUP_GUIDE.md       # Alternative setups
    └── COMPLETE_SETUP_GUIDE.md     # This file
```

## 🔐 Security Features

### Authentication & Authorization
- Role-based access control (RBAC)
- Microsoft 365 SSO integration
- Session management with NextAuth
- Password hashing with bcrypt

### AWS Security
- IAM roles with least privilege
- S3 bucket policies
- VPC with security groups
- Encrypted storage
- SSL/TLS everywhere

### Data Protection
- SQL injection prevention
- XSS protection
- CSRF protection
- File upload validation
- Rate limiting

## 📊 Monitoring & Analytics

### Built-in Monitoring
- CloudWatch metrics and alarms
- Database performance monitoring
- S3 usage tracking
- Video processing status
- User activity analytics

### Cost Monitoring
- Budget alerts
- Usage tracking
- Cost optimization recommendations
- Resource utilization reports

## 🎯 User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- Analytics and reporting

### Faculty
- Course creation and management
- Assignment grading
- Video uploads
- Event management
- Journal creation

### Editor-in-Chief
- Editorial workflow management
- Article review process
- Content approval
- **Note**: Cannot create new journals (as requested)

### Editor
- Article editing and review
- Content management
- Review assignments

### Student
- Assignment submission
- Course access
- Article submission
- Grade viewing

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)
- **Cost**: $20/month (Pro plan)
- **Benefits**: Easy deployment, automatic scaling, built-in analytics
- **Setup**: `vercel` command deploys instantly

### Option 2: AWS EC2
- **Cost**: $30-60/month depending on instance size
- **Benefits**: Full control, custom configuration
- **Setup**: Requires server management

### Option 3: AWS Lambda + API Gateway
- **Cost**: Pay per request (~$10-30/month)
- **Benefits**: Serverless, automatic scaling
- **Setup**: More complex but highly scalable

## 🔧 Environment Variables

Your `.env.local` file should include:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET_NAME=law-school-content-bucket
MEDIACONVERT_ENDPOINT=https://your-endpoint.mediaconvert.us-east-1.amazonaws.com
CLOUDFRONT_DOMAIN=your-distribution.cloudfront.net

# Application
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# AI Services
OLLAMA_API_URL=http://localhost:11434

# Microsoft 365 (Optional)
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
```

## 📚 API Endpoints

### File Management
- `POST /api/aws/upload` - Upload files to S3
- `DELETE /api/aws/upload` - Delete files from S3
- `GET /api/aws/upload` - Get signed URLs

### Video Processing
- `POST /api/aws/video/process` - Start video processing
- `GET /api/aws/video/process` - Check processing status

### Content Management
- `POST /api/plagiarism/check` - Check for plagiarism
- `POST /api/bluebook/check` - Validate citations
- `GET/POST /api/courses` - Course management

### User Management
- Built into NextAuth and custom auth system

## 🐛 Troubleshooting

### Common Issues

**AWS Credentials Not Working**
```bash
# Check AWS configuration
aws sts get-caller-identity

# Reconfigure if needed
aws configure
```

**Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier law-school-db
```

**File Upload Issues**
- Check S3 bucket permissions
- Verify IAM role policies
- Check file size limits
- Validate CORS configuration

**Video Processing Issues**
- Check MediaConvert service limits
- Verify input file formats
- Check IAM role for MediaConvert
- Monitor job status in AWS console

### Getting Help
- Check AWS CloudWatch logs
- Review Vercel function logs
- Use browser developer tools
- Check database logs

## 📞 Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Project Issues**: Use GitHub Issues for technical problems

## 🎉 You're Ready!

After completing these steps, you'll have a fully functional law school institutional repository with:

- ✅ Professional editorial workflow system
- ✅ Comprehensive course management
- ✅ AI-powered content analysis
- ✅ Scalable AWS infrastructure
- ✅ Role-based security
- ✅ Global content delivery
- ✅ Professional video processing
- ✅ Complete user management

Your law school now has an enterprise-grade repository system that can grow with your institution's needs!
