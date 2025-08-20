import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const runtimeInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: {
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_REGION: process.env.VERCEL_REGION,
        NODE_ENV: process.env.NODE_ENV,
        AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV,
        AWS_LAMBDA_RUNTIME_API: process.env.AWS_LAMBDA_RUNTIME_API
      },
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    };

    // Test a simple header creation to see if it fails
    try {
      const testResponse = new Response('test');
      testResponse.headers.set('Test-Header', 'simple-value');
      testResponse.headers.set('Test-ASCII', 'test-ascii-value');
      return NextResponse.json({
        ...runtimeInfo,
        headerTest: 'SUCCESS - Basic headers work',
        message: 'Runtime info retrieved successfully'
      });
    } catch (headerError) {
      return NextResponse.json({
        ...runtimeInfo,
        headerTest: 'FAILED',
        headerError: headerError instanceof Error ? headerError.message : 'Unknown header error',
        message: 'Runtime info retrieved but header test failed'
      });
    }

  } catch (error) {
    console.error('Runtime info error:', error);
    return NextResponse.json(
      { 
        error: 'Runtime info failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}