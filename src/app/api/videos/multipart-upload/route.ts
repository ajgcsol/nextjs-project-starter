import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

// Create S3 client with enhanced error handling
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Check if credentials exist
  if (!rawAccessKeyId || !rawSecretAccessKey) {
    console.error('AWS credentials missing from environment variables');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('AWS')));
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  // Sanitize credentials
  const accessKeyId = sanitizeCredential(rawAccessKeyId);
  const secretAccessKey = sanitizeCredential(rawSecretAccessKey);
  
  // Validate credentials exist after sanitization
  if (!accessKeyId || !secretAccessKey) {
    console.error('AWS credentials became empty after sanitization');
    throw new Error('AWS credentials are invalid or contain unsupported characters');
  }
  
  // More lenient validation - just check basic format
  if (accessKeyId.length < 16 || secretAccessKey.length < 20) {
    console.error('AWS credentials appear to be too short');
    console.error(`Access Key length: ${accessKeyId.length}, Secret Key length: ${secretAccessKey.length}`);
    throw new Error('AWS credentials appear to be invalid (too short)');
  }
  
  console.log('Creating S3 Client for multipart upload with sanitized credentials');
  console.log(`Access Key: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
  console.log(`Secret Key length: ${secretAccessKey.length}`);
  
  try {
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      // Additional configuration to handle large files and Vercel edge cases
      requestHandler: {
        requestTimeout: 300000, // 5 minutes for large file operations
        connectionTimeout: 30000 // 30 seconds connection timeout
      }
    });
  } catch (s3Error) {
    console.error('Failed to create S3 client:', s3Error);
    throw new Error(`Failed to initialize S3 client: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
  }
};

// Initialize multipart upload
export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, fileSize } = await request.json();
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and content type are required' },
        { status: 400 }
      );
    }
    
    // Validate file size (up to 5TB for multipart uploads)
    const maxSize = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5TB' },
        { status: 400 }
      );
    }
    
    // Generate unique S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    const s3Key = `videos/${timestamp}-${randomString}.${extension}`;
    
    // Create multipart upload
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        'original-filename': filename,
        'upload-date': new Date().toISOString(),
        'file-size': fileSize?.toString() || '0'
      }
    });
    
    const createResult = await s3Client.send(createCommand);
    
    if (!createResult.UploadId) {
      throw new Error('Failed to create multipart upload');
    }
    
    // Calculate recommended part size (100MB to 1GB based on file size)
    let partSize = 100 * 1024 * 1024; // Start with 100MB
    if (fileSize) {
      if (fileSize > 10 * 1024 * 1024 * 1024) { // >10GB
        partSize = 1024 * 1024 * 1024; // 1GB parts
      } else if (fileSize > 1024 * 1024 * 1024) { // >1GB
        partSize = 500 * 1024 * 1024; // 500MB parts
      }
    }
    
    const totalParts = fileSize ? Math.ceil(fileSize / partSize) : 1;
    
    return NextResponse.json({
      uploadId: createResult.UploadId,
      s3Key,
      bucketName,
      partSize,
      totalParts,
      publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
      cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
        : undefined
    });
    
  } catch (error) {
    console.error('Multipart upload initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get presigned URLs for upload parts
export async function PUT(request: NextRequest) {
  try {
    const { uploadId, s3Key, partNumber, contentType } = await request.json();
    
    if (!uploadId || !s3Key || !partNumber) {
      return NextResponse.json(
        { error: 'Upload ID, S3 key, and part number are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const uploadPartCommand = new UploadPartCommand({
      Bucket: bucketName,
      Key: s3Key,
      PartNumber: partNumber,
      UploadId: uploadId
    });
    
    // Generate presigned URL for this part (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
    
    return NextResponse.json({
      presignedUrl,
      partNumber
    });
    
  } catch (error) {
    console.error('Part upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate part upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Complete multipart upload
export async function PATCH(request: NextRequest) {
  try {
    const { uploadId, s3Key, parts } = await request.json();
    
    if (!uploadId || !s3Key || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: 'Upload ID, S3 key, and parts array are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part: any) => ({
          ETag: part.etag,
          PartNumber: part.partNumber
        }))
      }
    });
    
    const completeResult = await s3Client.send(completeCommand);
    
    return NextResponse.json({
      success: true,
      location: completeResult.Location,
      s3Key,
      publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
      cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
        : undefined
    });
    
  } catch (error) {
    console.error('Complete multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to complete multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Abort multipart upload
export async function DELETE(request: NextRequest) {
  try {
    const { uploadId, s3Key } = await request.json();
    
    if (!uploadId || !s3Key) {
      return NextResponse.json(
        { error: 'Upload ID and S3 key are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId
    });
    
    await s3Client.send(abortCommand);
    
    return NextResponse.json({
      success: true,
      message: 'Multipart upload aborted successfully'
    });
    
  } catch (error) {
    console.error('Abort multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to abort multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}