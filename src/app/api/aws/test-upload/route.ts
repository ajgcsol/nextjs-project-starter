import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: NextRequest) {
  try {
    // Use hardcoded working credentials for testing
    const s3Client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'AKIA3Q6FF4YAHNYSVFPW',
        secretAccessKey: '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'
      }
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'test';
    const userId = formData.get('userId') as string || 'test-user';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const s3Key = `${context}/${userId}/${timestamp}-${randomString}.${extension}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload parameters
    const uploadParams = {
      Bucket: 'law-school-repository-content',
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'upload-date': new Date().toISOString(),
        'user-id': userId,
        'context': context
      }
    };

    console.log('Attempting S3 upload with params:', {
      bucket: uploadParams.Bucket,
      key: uploadParams.Key,
      contentType: uploadParams.ContentType,
      size: buffer.length
    });

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    const uploadResult = await s3Client.send(command);

    // Get public URL
    const publicUrl = `https://law-school-repository-content.s3.us-east-1.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      success: true,
      message: 'Upload successful with hardcoded credentials!',
      s3Key: s3Key,
      publicUrl: publicUrl,
      etag: uploadResult.ETag,
      fileSize: buffer.length,
      originalName: file.name
    });

  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}