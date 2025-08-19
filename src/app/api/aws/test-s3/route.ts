import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  // Get raw credentials first
  const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Debug raw credentials
  const debugInfo = {
      rawAccessKey: {
        length: rawAccessKeyId?.length || 0,
        raw: rawAccessKeyId ? `${rawAccessKeyId.substring(0, 4)}...${rawAccessKeyId.substring(rawAccessKeyId.length - 4)}` : 'missing',
        characters: rawAccessKeyId ? Array.from(rawAccessKeyId).map((char, index) => ({
          index,
          char,
          code: char.charCodeAt(0),
          isVisible: char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126
        })) : [],
        hasNewlines: rawAccessKeyId ? /[\r\n]/.test(rawAccessKeyId) : false,
        hasWhitespace: rawAccessKeyId ? /\s/.test(rawAccessKeyId) : false
      },
      rawSecretKey: {
        length: rawSecretAccessKey?.length || 0,
        raw: rawSecretAccessKey ? `${rawSecretAccessKey.substring(0, 4)}...${rawSecretAccessKey.substring(rawSecretAccessKey.length - 4)}` : 'missing',
        hasNewlines: rawSecretAccessKey ? /[\r\n]/.test(rawSecretAccessKey) : false,
        hasWhitespace: rawSecretAccessKey ? /\s/.test(rawSecretAccessKey) : false
      }
    };
    
  try {
    // Get credentials directly and sanitize them
    const accessKeyId = rawAccessKeyId?.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '');
    const secretAccessKey = rawSecretAccessKey?.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '');
    const region = process.env.AWS_REGION || 'us-east-1';
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        error: 'Missing credentials',
        debugInfo,
        details: {
          hasAccessKey: !!accessKeyId,
          hasSecretKey: !!secretAccessKey,
          hasBucket: !!bucketName,
          hasRegion: !!region,
          sanitizedAccessKeyLength: accessKeyId?.length || 0,
          sanitizedSecretKeyLength: secretAccessKey?.length || 0
        }
      }, { status: 400 });
    }

    // Create a new S3 client with explicit credentials
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      }
    });

    // Test S3 access with a simple listObjects call
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1
    });
    
    const result = await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'S3 access successful',
      bucketName: bucketName,
      region: region,
      objectCount: result.KeyCount || 0,
      debugInfo,
      credentials: {
        accessKeyLength: accessKeyId.length,
        secretKeyLength: secretAccessKey.length,
        accessKeyStart: accessKeyId.substring(0, 4),
        accessKeyEnd: accessKeyId.substring(accessKeyId.length - 4)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('S3 test error:', error);
    return NextResponse.json({
      error: 'S3 test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: debugInfo,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
