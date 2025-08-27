import { NextResponse } from 'next/server';
import { S3Client, GetBucketPolicyCommand, GetBucketCorsCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3';

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
    
    console.log('🔍 Checking S3 permissions for bucket:', BUCKET_NAME);
    
    const results: any = {
      bucket: BUCKET_NAME,
      timestamp: new Date().toISOString()
    };

    // Check bucket policy
    try {
      const policyResponse = await s3Client.send(new GetBucketPolicyCommand({ Bucket: BUCKET_NAME }));
      results.bucketPolicy = policyResponse.Policy ? JSON.parse(policyResponse.Policy) : null;
      console.log('📋 Current bucket policy:', results.bucketPolicy);
    } catch (error: any) {
      if (error.name === 'NoSuchBucketPolicy') {
        results.bucketPolicy = null;
        results.bucketPolicyError = 'No bucket policy exists';
      } else {
        results.bucketPolicyError = error.message;
      }
    }

    // Check CORS
    try {
      const corsResponse = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
      results.cors = corsResponse.CORSRules;
      console.log('🌐 CORS configuration:', results.cors);
    } catch (error: any) {
      results.corsError = error.message;
    }

    // Check public access block
    try {
      const blockResponse = await s3Client.send(new GetPublicAccessBlockCommand({ Bucket: BUCKET_NAME }));
      results.publicAccessBlock = blockResponse.PublicAccessBlockConfiguration;
      console.log('🚫 Public access block:', results.publicAccessBlock);
    } catch (error: any) {
      results.publicAccessBlockError = error.message;
    }

    // Test a presigned URL generation
    try {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'videos/test-key.mp4', // Test key
      });

      const testPresignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
      results.presignedUrlTest = {
        success: true,
        url: testPresignedUrl,
        message: 'Presigned URL generation works'
      };
    } catch (error: any) {
      results.presignedUrlTest = {
        success: false,
        error: error.message
      };
    }

    // Analysis and recommendations
    results.analysis = {
      corsStatus: results.cors ? '✅ CORS configured correctly' : '❌ CORS not configured',
      policyStatus: results.bucketPolicy ? '⚠️ Bucket policy exists - check if it allows GetObject' : '❌ No bucket policy - presigned URLs may fail',
      blockStatus: results.publicAccessBlock ? '⚠️ Public access blocked - may prevent presigned URL access' : '✅ No public access block',
      recommendations: []
    };

    if (!results.bucketPolicy) {
      results.analysis.recommendations.push('Add bucket policy to allow s3:GetObject for presigned URLs');
    }

    if (results.publicAccessBlock?.BlockPublicAcls || results.publicAccessBlock?.BlockPublicPolicy) {
      results.analysis.recommendations.push('Consider adjusting public access block settings for presigned URLs');
    }

    results.analysis.recommendations.push('Test: curl -I https://law-school-repository.vercel.app/api/videos/stream/56184f11-7e2c-4b03-a214-948ce7c5e1e8');

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Error checking S3 permissions:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.Code,
      details: 'Failed to check S3 permissions'
    }, { status: 500 });
  }
}