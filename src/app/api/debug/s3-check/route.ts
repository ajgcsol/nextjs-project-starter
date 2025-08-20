import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const s3Key = url.searchParams.get('key');
    
    if (!s3Key) {
      return NextResponse.json({ error: 'S3 key parameter required' }, { status: 400 });
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    console.log('🔍 Checking S3 object:', { bucket: bucketName, key: s3Key });

    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      const response = await s3Client.send(headCommand);
      
      return NextResponse.json({
        exists: true,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
        s3Url: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
        cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
          ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
          : null
      });
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return NextResponse.json({
          exists: false,
          error: 'Object not found in S3',
          bucket: bucketName,
          key: s3Key
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('S3 check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check S3 object',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : typeof error,
        errorStack: error instanceof Error ? error.stack : null,
        awsConfig: {
          region: process.env.AWS_REGION || 'us-east-1',
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          bucket: process.env.S3_BUCKET_NAME || 'law-school-repository-content'
        }
      },
      { status: 500 }
    );
  }
}