import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Sanitize credentials helper
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  return credential.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '').trim();
};

// Create S3 client
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = sanitizeCredential(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = sanitizeCredential(process.env.AWS_SECRET_ACCESS_KEY);
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured');
  }
  
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, fileSize } = await request.json();
    
    console.log('🔗 Presigned URL Request:', {
      filename,
      contentType,
      fileSize: fileSize ? `${(fileSize / (1024*1024)).toFixed(2)}MB` : 'unknown',
      timestamp: new Date().toISOString()
    });
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and content type are required' },
        { status: 400 }
      );
    }
    
    // Validate file size (5GB max for videos)
    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? 5 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
    
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isVideo ? '5GB' : '100MB'}` },
        { status: 400 }
      );
    }
    
    // Generate unique S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    const s3Key = `videos/${timestamp}-${randomString}.${extension}`;
    
    // Create presigned URL for direct upload
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      // Don't set ContentLength - let the browser handle it
      Metadata: {
        'original-filename': filename,
        'upload-date': new Date().toISOString(),
        'file-size': fileSize?.toString() || '0'
      }
    });
    
    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    console.log('🔗 Generated Presigned URL:', {
      s3Key,
      bucketName,
      region: process.env.AWS_REGION || 'us-east-1',
      urlLength: presignedUrl.length,
      expiresIn: 3600
    });
    
    // Return presigned URL and S3 details
    return NextResponse.json({
      presignedUrl,
      s3Key,
      publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
      expiresIn: 3600
    });
    
  } catch (error) {
    console.error('Presigned URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate presigned URLs.' },
    { status: 405 }
  );
}