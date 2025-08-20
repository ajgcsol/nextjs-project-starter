#!/bin/bash

# Set all environment variables for Vercel
echo "Setting up Vercel environment variables..."

# AWS Configuration
vercel env add AWS_REGION production <<< "us-east-1"
vercel env add AWS_ACCESS_KEY_ID production <<< "AKIA3Q6FF4YAHNYSVFPW"
vercel env add AWS_SECRET_ACCESS_KEY production <<< "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"

# S3 Buckets
vercel env add S3_BUCKET_NAME production <<< "law-school-repository-content"
vercel env add S3_VIDEO_BUCKET production <<< "law-school-repository-video-processing"
vercel env add S3_BACKUP_BUCKET production <<< "law-school-repository-backups"

# Database
vercel env add DATABASE_URL production <<< "postgresql://lawschooladmin:Csl2025!@law-school-repository-db.cw3ilasjkgfi.us-east-1.rds.amazonaws.com:5432/postgres"

# Application Settings
vercel env add NEXTAUTH_SECRET production <<< "your-random-secret-key-here-32-chars-long-for-production"
vercel env add NEXTAUTH_URL production <<< "https://law-school-repository.vercel.app"

# File Upload Settings
vercel env add MAX_FILE_SIZE production <<< "52428800"
vercel env add UPLOAD_DIR production <<< "./public/uploads"

echo "Environment variables setup complete!"
