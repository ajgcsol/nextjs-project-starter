import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const s3Key = url.searchParams.get('key') || 'videos/1755666317810-pad1ir4251l.mp4';
    
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    const region = process.env.AWS_REGION || 'us-east-1';
    
    // Direct S3 URL
    const directS3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    
    // CloudFront URL
    const cloudFrontUrl = process.env.CLOUDFRONT_DOMAIN 
      ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
      : null;

    return NextResponse.json({
      s3Key,
      bucket: bucketName,
      region,
      directS3Url,
      cloudFrontUrl,
      cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
      testInstructions: {
        message: "Try accessing these URLs directly in your browser:",
        directS3: `${directS3Url} - If this works, S3 is fine`,
        cloudFront: cloudFrontUrl ? `${cloudFrontUrl} - If this fails but S3 works, CloudFront issue` : "CloudFront domain not configured"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to generate test URLs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}