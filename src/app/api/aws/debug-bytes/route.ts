import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    
    // Convert to byte arrays to see exact content
    const accessKeyBytes = Buffer.from(accessKey, 'utf8');
    const secretKeyBytes = Buffer.from(secretKey, 'utf8');
    
    // Create detailed byte analysis
    const accessKeyAnalysis = {
      length: accessKey.length,
      bytes: Array.from(accessKeyBytes),
      hexValues: Array.from(accessKeyBytes).map(byte => '0x' + byte.toString(16).padStart(2, '0')),
      characters: Array.from(accessKey).map((char, index) => ({
        index,
        char: char,
        charCode: char.charCodeAt(0),
        hex: '0x' + char.charCodeAt(0).toString(16).padStart(2, '0'),
        isASCII: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126,
        isPrintable: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126,
        isAlphaNumeric: /^[a-zA-Z0-9]$/.test(char)
      })),
      hasInvalidChars: Array.from(accessKey).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126),
      endsWithNewline: accessKey.endsWith('\n') || accessKey.endsWith('\r\n') || accessKey.endsWith('\r'),
      startsWithSpace: accessKey.startsWith(' '),
      endsWithSpace: accessKey.endsWith(' ')
    };
    
    const secretKeyAnalysis = {
      length: secretKey.length,
      bytes: Array.from(secretKeyBytes),
      hexValues: Array.from(secretKeyBytes).map(byte => '0x' + byte.toString(16).padStart(2, '0')),
      // Only show first and last few characters for security
      characters: [
        ...Array.from(secretKey.substring(0, 4)).map((char, index) => ({
          index,
          char: char,
          charCode: char.charCodeAt(0),
          hex: '0x' + char.charCodeAt(0).toString(16).padStart(2, '0'),
          isASCII: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
        })),
        { index: '...', char: '...', charCode: '...', hex: '...', isASCII: '...' },
        ...Array.from(secretKey.substring(secretKey.length - 4)).map((char, index) => ({
          index: secretKey.length - 4 + index,
          char: char,
          charCode: char.charCodeAt(0),
          hex: '0x' + char.charCodeAt(0).toString(16).padStart(2, '0'),
          isASCII: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
        }))
      ],
      hasInvalidChars: Array.from(secretKey).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126),
      endsWithNewline: secretKey.endsWith('\n') || secretKey.endsWith('\r\n') || secretKey.endsWith('\r'),
      startsWithSpace: secretKey.startsWith(' '),
      endsWithSpace: secretKey.endsWith(' ')
    };

    return NextResponse.json({
      accessKey: accessKeyAnalysis,
      secretKey: secretKeyAnalysis,
      recommendations: {
        shouldCleanAccessKey: accessKeyAnalysis.hasInvalidChars || accessKeyAnalysis.endsWithNewline || accessKeyAnalysis.startsWithSpace || accessKeyAnalysis.endsWithSpace,
        shouldCleanSecretKey: secretKeyAnalysis.hasInvalidChars || secretKeyAnalysis.endsWithNewline || secretKeyAnalysis.startsWithSpace || secretKeyAnalysis.endsWithSpace,
        accessKeyIssues: [
          ...(accessKeyAnalysis.endsWithNewline ? ['Ends with newline character'] : []),
          ...(accessKeyAnalysis.startsWithSpace ? ['Starts with space'] : []),
          ...(accessKeyAnalysis.endsWithSpace ? ['Ends with space'] : []),
          ...(accessKeyAnalysis.hasInvalidChars ? ['Contains non-ASCII characters'] : [])
        ],
        secretKeyIssues: [
          ...(secretKeyAnalysis.endsWithNewline ? ['Ends with newline character'] : []),
          ...(secretKeyAnalysis.startsWithSpace ? ['Starts with space'] : []),
          ...(secretKeyAnalysis.endsWithSpace ? ['Ends with space'] : []),
          ...(secretKeyAnalysis.hasInvalidChars ? ['Contains non-ASCII characters'] : [])
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Byte analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Byte analysis failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}