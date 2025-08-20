import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
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
      UploadId: uploadId,
      ContentType: contentType
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