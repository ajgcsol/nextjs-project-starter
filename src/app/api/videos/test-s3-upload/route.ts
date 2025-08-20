import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing S3 upload flow...');

    // Step 1: Get presigned URL
    const presignedResponse = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/videos/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'test-video.mp4',
        contentType: 'video/mp4',
        fileSize: 1000000,
      }),
    });

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      throw new Error(`Presigned URL failed: ${errorData.error}`);
    }

    const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();

    console.log('🔗 Got presigned URL:', {
      s3Key,
      publicUrl,
      urlLength: presignedUrl.length,
      urlPreview: presignedUrl.substring(0, 100) + '...'
    });

    // Step 2: Test the presigned URL with a small test payload
    const testData = new Blob(['test video content'], { type: 'video/mp4' });
    
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: testData,
    });

    console.log('📤 S3 Upload test result:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      headers: Object.fromEntries(uploadResponse.headers.entries()),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ S3 upload failed:', errorText);
      return NextResponse.json({
        success: false,
        error: `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        details: errorText,
        presignedUrl: presignedUrl.substring(0, 100) + '...',
      });
    }

    // Step 3: Verify file exists
    console.log('✅ S3 upload successful, testing file access...');
    
    const verifyResponse = await fetch(publicUrl, { method: 'HEAD' });
    console.log('🔍 File verification:', {
      status: verifyResponse.status,
      statusText: verifyResponse.statusText,
    });

    return NextResponse.json({
      success: true,
      message: 'S3 upload test completed successfully',
      results: {
        presignedUrlGenerated: true,
        s3UploadStatus: uploadResponse.status,
        s3UploadSuccess: uploadResponse.ok,
        fileVerification: verifyResponse.status,
        fileExists: verifyResponse.ok,
        s3Key,
        publicUrl,
      }
    });

  } catch (error) {
    console.error('🧪 S3 test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'S3 upload test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}