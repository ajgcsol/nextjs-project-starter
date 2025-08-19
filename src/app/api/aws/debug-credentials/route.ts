import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    
    // Convert to character codes to see invisible characters
    const accessKeyChars = Array.from(accessKey).map(char => ({
      char: char,
      code: char.charCodeAt(0),
      isVisible: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
    }));
    
    const secretKeyChars = Array.from(secretKey).map(char => ({
      char: char,
      code: char.charCodeAt(0),
      isVisible: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
    }));

    return NextResponse.json({
      accessKey: {
        length: accessKey.length,
        raw: accessKey,
        trimmed: accessKey.trim(),
        trimmedLength: accessKey.trim().length,
        characters: accessKeyChars,
        hasNewlines: accessKey.includes('\n') || accessKey.includes('\r'),
        firstChar: accessKey.length > 0 ? accessKey.charCodeAt(0) : null,
        lastChar: accessKey.length > 0 ? accessKey.charCodeAt(accessKey.length - 1) : null
      },
      secretKey: {
        length: secretKey.length,
        raw: secretKey.substring(0, 10) + '...' + secretKey.substring(secretKey.length - 4), // Partial for security
        trimmed: secretKey.trim().substring(0, 10) + '...' + secretKey.trim().substring(secretKey.trim().length - 4),
        trimmedLength: secretKey.trim().length,
        hasNewlines: secretKey.includes('\n') || secretKey.includes('\r'),
        firstChar: secretKey.length > 0 ? secretKey.charCodeAt(0) : null,
        lastChar: secretKey.length > 0 ? secretKey.charCodeAt(secretKey.length - 1) : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug credentials error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
