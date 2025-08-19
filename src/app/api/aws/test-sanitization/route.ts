import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const rawAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const rawSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    // Apply the same sanitization as in aws-integration.ts
    const sanitizeCredential = (credential: string | undefined): string | undefined => {
      if (!credential) return undefined;
      // Remove all whitespace, newlines, carriage returns, and non-printable characters
      return credential.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '').trim();
    };
    
    const sanitizedAccessKey = sanitizeCredential(rawAccessKey);
    const sanitizedSecretKey = sanitizeCredential(rawSecretKey);
    
    return NextResponse.json({
      raw: {
        accessKey: rawAccessKey ? `${rawAccessKey.substring(0, 4)}...${rawAccessKey.substring(rawAccessKey.length - 4)}` : 'missing',
        secretKey: rawSecretKey ? `${rawSecretKey.substring(0, 4)}...${rawSecretKey.substring(rawSecretKey.length - 4)}` : 'missing',
        accessKeyLength: rawAccessKey?.length,
        secretKeyLength: rawSecretKey?.length,
        accessKeyHasNewlines: rawAccessKey ? /[\r\n]/.test(rawAccessKey) : false,
        secretKeyHasNewlines: rawSecretKey ? /[\r\n]/.test(rawSecretKey) : false
      },
      sanitized: {
        accessKey: sanitizedAccessKey ? `${sanitizedAccessKey.substring(0, 4)}...${sanitizedAccessKey.substring(sanitizedAccessKey.length - 4)}` : 'missing',
        secretKey: sanitizedSecretKey ? `${sanitizedSecretKey.substring(0, 4)}...${sanitizedSecretKey.substring(sanitizedSecretKey.length - 4)}` : 'missing',
        accessKeyLength: sanitizedAccessKey?.length,
        secretKeyLength: sanitizedSecretKey?.length,
        accessKeyHasNewlines: sanitizedAccessKey ? /[\r\n]/.test(sanitizedAccessKey) : false,
        secretKeyHasNewlines: sanitizedSecretKey ? /[\r\n]/.test(sanitizedSecretKey) : false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sanitization test error:', error);
    return NextResponse.json(
      { 
        error: 'Sanitization test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
