import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables without exposing sensitive data
    const envCheck = {
      AWS_REGION: process.env.AWS_REGION ? 'SET' : 'NOT SET',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? 'SET' : 'NOT SET',
      
      // Check for problematic characters in credentials (without exposing them)
      accessKeyIdLength: process.env.AWS_ACCESS_KEY_ID?.length || 0,
      secretAccessKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length || 0,
      
      // Check for common problematic characters
      accessKeyIdHasSpecialChars: process.env.AWS_ACCESS_KEY_ID ? 
        /[^A-Za-z0-9]/.test(process.env.AWS_ACCESS_KEY_ID) : false,
      secretAccessKeyHasSpecialChars: process.env.AWS_SECRET_ACCESS_KEY ? 
        /[^A-Za-z0-9+/=]/.test(process.env.AWS_SECRET_ACCESS_KEY) : false,
      
      // Check for whitespace
      accessKeyIdHasWhitespace: process.env.AWS_ACCESS_KEY_ID ? 
        /\s/.test(process.env.AWS_ACCESS_KEY_ID) : false,
      secretAccessKeyHasWhitespace: process.env.AWS_SECRET_ACCESS_KEY ? 
        /\s/.test(process.env.AWS_SECRET_ACCESS_KEY) : false,
    };

    return NextResponse.json({
      success: true,
      environment: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
