import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      awsConfig: {
        region: process.env.AWS_REGION || 'us-east-1',
        hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
        accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length || 0,
        secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
        bucket: process.env.S3_BUCKET_NAME || 'law-school-repository-content',
        cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || null
      },
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check AWS config',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}