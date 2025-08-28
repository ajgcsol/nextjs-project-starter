import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, contentType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5GB (current: ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB)` },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-m4v',
      'video/avi',
      'video/mov'
    ];

    if (!allowedTypes.includes(contentType) && !contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    // Generate unique S3 key
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    const fileExtension = filename.split('.').pop() || 'mp4';
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `videos/${timestamp}_${randomId}_${sanitizedFilename}`;

    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.S3_BUCKET_NAME;
    if (!bucketName) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: fileSize,
      CacheControl: 'max-age=31536000', // 1 year cache
      Metadata: {
        'original-filename': filename,
        'upload-timestamp': timestamp.toString(),
        'file-size': fileSize.toString()
      }
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Generate public URL
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const publicUrl = cloudFrontDomain 
      ? `https://${cloudFrontDomain}/${s3Key}`
      : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    console.log('✅ Generated presigned URL for:', filename, `(${(fileSize / (1024*1024)).toFixed(1)}MB)`);

    return NextResponse.json({
      presignedUrl,
      s3Key,
      publicUrl,
      expiresIn: 3600,
      maxFileSize: maxSize,
      uploadInstructions: {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        note: 'Upload directly to the presignedUrl using PUT method'
      }
    });

  } catch (error) {
    console.error('❌ Presigned URL generation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
