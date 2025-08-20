import { NextRequest, NextResponse } from 'next/server';
import { AWSHealthCheck } from '@/lib/aws-integration';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting AWS health check...');
    
    // Perform comprehensive AWS health check
    const healthCheck = await AWSHealthCheck.performFullHealthCheck();
    
    console.log('AWS Health Check Results:', healthCheck);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: healthCheck.overall,
      services: healthCheck.services,
      environment: process.env.NODE_ENV,
      aws_region: process.env.AWS_REGION,
      s3_bucket: process.env.S3_BUCKET_NAME,
      has_credentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      has_credentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    }, { status: 500 });
  }
}