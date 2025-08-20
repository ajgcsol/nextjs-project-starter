import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// Advanced credential sanitization for Vercel + AWS SDK v3 compatibility
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  
  return credential
    // Remove BOM (Byte Order Mark) characters
    .replace(/^\uFEFF/, '')
    // Remove all Unicode control characters (0x00-0x1F, 0x7F-0x9F)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove all whitespace characters (spaces, tabs, newlines, etc.)
    .replace(/\s/g, '')
    // Remove any non-ASCII characters that could cause header issues
    .replace(/[^\x20-\x7E]/g, '')
    // Trim any remaining whitespace
    .trim();
};

// Validate AWS credential format
const validateCredential = (credential: string, type: 'accessKey' | 'secretKey'): boolean => {
  if (!credential) return false;
  
  if (type === 'accessKey') {
    // AWS Access Key format: AKIA followed by 16 alphanumeric characters
    return /^AKIA[A-Z0-9]{16}$/.test(credential);
  } else {
    // AWS Secret Key: 40 characters, base64-like
    return credential.length === 40 && /^[A-Za-z0-9+/]+$/.test(credential);
  }
};

const createS3Client = () => {
  // Get and sanitize credentials from environment variables
  const region = process.env.AWS_REGION || 'us-east-1';
  const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Sanitize credentials
  const accessKeyId = sanitizeCredential(rawAccessKeyId);
  const secretAccessKey = sanitizeCredential(rawSecretAccessKey);
  
  // Validate credentials
  if (!accessKeyId || !secretAccessKey) {
    console.error('AWS credentials missing from environment variables');
    throw new Error('AWS credentials not found in environment variables');
  }
  
  if (!validateCredential(accessKeyId, 'accessKey')) {
    console.error('Invalid AWS Access Key format after sanitization');
    throw new Error('Invalid AWS Access Key format');
  }
  
  if (!validateCredential(secretAccessKey, 'secretKey')) {
    console.error('Invalid AWS Secret Key format after sanitization');
    throw new Error('Invalid AWS Secret Key format');
  }
  
  console.log('Creating S3 Client with sanitized environment credentials');
  console.log(`Access Key: ${accessKeyId.substring(0, 8)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
  
  return new S3Client({
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    // Additional configuration to handle Vercel edge cases
    requestHandler: {
      requestTimeout: 30000,
      connectionTimeout: 5000
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

    // Validate file size (max 5GB for videos, 100MB for documents)
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 5 * 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 5GB for videos, 100MB for documents
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isVideo ? '5GB' : '100MB'}.` },
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
