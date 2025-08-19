import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// Configure AWS SDK with explicit credential handling and sanitization
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  // Remove all whitespace, newlines, carriage returns, and non-printable characters
  // Also remove any non-ASCII characters that might cause header issues
  return credential.replace(/[^\x20-\x7E]/g, '').replace(/[\s\r\n\t]/g, '').trim();
};

const createS3Client = () => {
  // Use the proven working credentials approach
  // This resolves the "Invalid character in header content" issue with Vercel + AWS SDK v3
  const region = 'us-east-1';
  const accessKeyId = 'AKIA3Q6FF4YAHNYSVFPW';
  const secretAccessKey = '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';
  
  console.log('Creating S3 Client with verified working credentials');
  
  return new S3Client({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    // AWS credentials are now hardcoded with working values
    const bucketName = 'law-school-repository-content';

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'documents';
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Generate S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const s3Key = `${context}/${userId || 'anonymous'}/${timestamp}-${randomString}.${extension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'upload-date': new Date().toISOString(),
        'user-id': userId || 'anonymous',
        'context': context
      }
    };

    // Upload to S3
    const s3Client = createS3Client();
    const command = new PutObjectCommand(uploadParams);
    const uploadResult = await s3Client.send(command);

    // Get public URL
    const publicUrl = `https://${bucketName}.s3.us-east-1.amazonaws.com/${s3Key}`;

    // Create file record for database
    const fileRecord = {
      id: crypto.randomUUID(),
      filename: s3Key.split('/').pop() || file.name,
      originalName: file.name,
      s3Key: s3Key,
      s3Bucket: bucketName,
      size: file.size,
      mimeType: file.type,
      uploadedBy: userId || 'anonymous',
      uploadedAt: new Date(),
      url: publicUrl,
      context: context
    };

    return NextResponse.json({
      success: true,
      file: fileRecord,
      s3Location: publicUrl,
      publicUrl: publicUrl,
      etag: uploadResult.ETag
    });

  } catch (error) {
    console.error('AWS upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('key');
    const bucketName = 'law-school-repository-content';

    if (!s3Key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      );
    }

    const s3Client = createS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('AWS delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('key');
    const bucketName = 'law-school-repository-content';
    const expiresIn = parseInt(searchParams.get('expires') || '3600');

    if (!s3Key) {
      return NextResponse.json(
        { error: 'S3 key is required' },
        { status: 400 }
      );
    }

    const s3Client = createS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return NextResponse.json({
      success: true,
      signedUrl: signedUrl,
      expiresIn: expiresIn
    });

  } catch (error) {
    console.error('AWS signed URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signed URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
