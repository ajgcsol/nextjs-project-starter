import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fromEnv } from '@aws-sdk/credential-providers';

export async function GET(request: NextRequest) {
  try {
    // Test using AWS credential provider chain instead of explicit credentials
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromEnv(), // This uses the credential provider chain
    });

    console.log('Testing S3 with credential provider chain');

    // Test S3 access with a simple listObjects call
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      MaxKeys: 1
    });
    
    const result = await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'S3 access successful with credential provider!',
      method: 'credential-provider-chain',
      bucketName: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      objectCount: result.KeyCount || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('S3 credential provider test error:', error);
    return NextResponse.json({
      error: 'S3 test failed with credential provider',
      method: 'credential-provider-chain',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Test upload using credential provider
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromEnv(),
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const context = formData.get('context') as string || 'provider-test';
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
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'upload-date': new Date().toISOString(),
        'user-id': userId,
        'context': context,
        'method': 'credential-provider'
      }
    };

    console.log('Attempting S3 upload with credential provider:', {
      bucket: uploadParams.Bucket,
      key: uploadParams.Key,
      contentType: uploadParams.ContentType,
      size: buffer.length
    });

    // Upload to S3
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectCommand(uploadParams);
    const uploadResult = await s3Client.send(command);

    // Get public URL
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    return NextResponse.json({
      success: true,
      message: 'Upload successful with credential provider!',
      method: 'credential-provider-chain',
      s3Key: s3Key,
      publicUrl: publicUrl,
      etag: uploadResult.ETag,
      fileSize: buffer.length,
      originalName: file.name
    });

  } catch (error) {
    console.error('Upload with credential provider error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed with credential provider', 
        method: 'credential-provider-chain',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}