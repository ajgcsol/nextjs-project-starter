import { NextRequest, NextResponse } from 'next/server';
import { AWSHealthCheck } from '@/lib/aws-integration';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables first
    const envCheck = {
      AWS_REGION: !!process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      S3_BUCKET_NAME: !!process.env.S3_BUCKET_NAME,
      DATABASE_URL: !!process.env.DATABASE_URL
    };

    // Check for potential issues with credentials
    const credentialIssues = [];
    
    if (process.env.AWS_ACCESS_KEY_ID) {
      const accessKey = process.env.AWS_ACCESS_KEY_ID.trim();
      if (accessKey.includes('\n') || accessKey.includes('\r')) {
        credentialIssues.push('AWS_ACCESS_KEY_ID contains newline characters');
      }
      if (accessKey.length < 16 || accessKey.length > 32) {
        credentialIssues.push('AWS_ACCESS_KEY_ID has unusual length');
      }
    }

    if (process.env.AWS_SECRET_ACCESS_KEY) {
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY.trim();
      if (secretKey.includes('\n') || secretKey.includes('\r')) {
        credentialIssues.push('AWS_SECRET_ACCESS_KEY contains newline characters');
      }
      if (secretKey.length < 32 || secretKey.length > 64) {
        credentialIssues.push('AWS_SECRET_ACCESS_KEY has unusual length');
      }
    }

    // Perform AWS service health checks
    const healthCheck = await AWSHealthCheck.performFullHealthCheck();

    return NextResponse.json({
      success: true,
      environment: envCheck,
      credentialIssues,
      awsServices: healthCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        error: 'Health check failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
