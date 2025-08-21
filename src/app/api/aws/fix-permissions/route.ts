import { NextResponse } from 'next/server';
import { S3Client, PutBucketCorsCommand, PutBucketPolicyCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    console.log('🔧 Fixing S3 permissions for bucket:', BUCKET_NAME);
    
    // Set CORS configuration
    const corsConfig = {
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST'],
            AllowedOrigins: ['*'], // Allow all origins for presigned URLs
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'x-amz-request-id'],
            MaxAgeSeconds: 3600
          }
        ]
      }
    };

    await s3Client.send(new PutBucketCorsCommand(corsConfig));
    console.log('✅ CORS configuration updated');

    // Check current policy
    let currentPolicy;
    try {
      const policyResponse = await s3Client.send(new GetBucketPolicyCommand({ Bucket: BUCKET_NAME }));
      currentPolicy = JSON.parse(policyResponse.Policy);
    } catch (error: any) {
      if (error.name === 'NoSuchBucketPolicy') {
        currentPolicy = null;
      } else {
        throw error;
      }
    }

    // Create a more permissive bucket policy for presigned URLs
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowPresignedURLGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(bucketPolicy)
    }));
    
    console.log('✅ Bucket policy updated');

    return NextResponse.json({
      success: true,
      message: 'S3 permissions fixed successfully',
      bucket: BUCKET_NAME,
      policy: bucketPolicy,
      cors: corsConfig.CORSConfiguration,
      instructions: [
        'Permissions have been updated',
        'Wait 1-2 minutes for changes to propagate',
        'Test video playback at: https://law-school-repository.vercel.app/dashboard/videos'
      ]
    });

  } catch (error: any) {
    console.error('❌ Error fixing S3 permissions:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.Code,
      details: {
        message: 'Failed to update S3 permissions',
        suggestion: error.name === 'AccessDenied' 
          ? 'IAM user needs s3:PutBucketPolicy and s3:PutBucketCors permissions'
          : 'Check AWS credentials and bucket name'
      }
    }, { status: 500 });
  }
}