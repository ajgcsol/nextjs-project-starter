import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadBucketCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

// Sanitize credentials helper
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  return credential.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '').trim();
};

// Create S3 client
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = sanitizeCredential(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = sanitizeCredential(process.env.AWS_SECRET_ACCESS_KEY);
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured');
  }
  
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

export async function GET() {
  try {
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    const region = process.env.AWS_REGION || 'us-east-1';
    const s3Client = createS3Client();
    
    console.log('🧪 Testing S3 Configuration:', {
      bucketName,
      region,
      timestamp: new Date().toISOString()
    });

    // Test 1: Check if bucket exists and is accessible
    let bucketExists = false;
    let bucketError = null;
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      bucketExists = true;
      console.log('✅ Bucket exists and is accessible');
    } catch (error) {
      bucketError = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Bucket access error:', bucketError);
    }

    // Test 2: Check CORS configuration
    let corsConfig = null;
    let corsError = null;
    try {
      const corsResult = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
      corsConfig = corsResult.CORSRules;
      console.log('✅ CORS configuration retrieved');
    } catch (error) {
      corsError = error instanceof Error ? error.message : 'Unknown error';
      console.log('⚠️ CORS configuration error:', corsError);
    }

    // Test 3: Environment variables
    const envTest = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      hasBucketName: !!process.env.S3_BUCKET_NAME,
      hasCloudFront: !!process.env.CLOUDFRONT_DOMAIN
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        bucket: {
          name: bucketName,
          region,
          exists: bucketExists,
          error: bucketError
        },
        cors: {
          configured: !!corsConfig,
          rules: corsConfig,
          error: corsError
        },
        environment: envTest
      },
      recommendations: [
        !bucketExists ? 'Bucket is not accessible - check credentials and bucket name' : null,
        !corsConfig ? 'CORS not configured - this may cause 413 errors for large uploads' : null,
        !envTest.hasCloudFront ? 'CloudFront domain not configured' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}