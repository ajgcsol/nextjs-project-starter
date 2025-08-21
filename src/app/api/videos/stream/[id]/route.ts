import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { videoMonitor, PerformanceMonitor } from '@/lib/monitoring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let videoId = '';
  
  try {
    const { id } = await params;
    videoId = id;
    
    console.log('🎥 Stream request for video ID:', videoId);
    
    // Log video request
    await videoMonitor.logVideoRequest(videoId, {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    // Get video from database with performance monitoring
    const video = await PerformanceMonitor.measureAsync(
      `database-lookup-${videoId}`,
      () => VideoDB.findById(videoId)
    );
    
    if (!video) {
      console.log('❌ Video not found:', videoId);
      await videoMonitor.logVideoError(videoId, 'Video not found in database');
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log('✅ Video found:', {
      id: video.id,
      title: video.title,
      file_path: video.file_path,
      s3_key: video.s3_key
    });

    // Get the actual S3 URL - prefer direct S3 URL over CloudFront for now
    let videoUrl = video.file_path;
    
    // If we have S3 key, construct direct S3 URL
    if (video.s3_key && video.s3_bucket) {
      const region = process.env.AWS_REGION || 'us-east-1';
      videoUrl = `https://${video.s3_bucket}.s3.${region}.amazonaws.com/${video.s3_key}`;
      console.log('🔗 Using direct S3 URL:', videoUrl);
    } else if (video.file_path) {
      videoUrl = video.file_path;
      console.log('🔗 Using stored file path:', videoUrl);
    } else {
      console.log('❌ No video URL available');
      await videoMonitor.logVideoError(videoId, 'No video URL available');
      return NextResponse.json(
        { error: 'Video URL not available' },
        { status: 404 }
      );
    }

    // Both IAM user and CloudFront lack S3 access permissions
    // Create a temporary workaround by generating a presigned URL for downloads
    // This uses the same mechanism as uploads but for GET operations
    
    try {
      console.log('🔐 Attempting to generate presigned download URL...');
      
      // Import AWS SDK
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const command = new GetObjectCommand({
        Bucket: video.s3_bucket || process.env.S3_BUCKET_NAME!,
        Key: video.s3_key,
      });

      // Generate presigned URL for download (valid for 1 hour)
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      
      console.log('✅ Generated presigned download URL, redirecting...');
      
      const responseTime = Date.now() - startTime;
      await videoMonitor.logVideoSuccess(videoId, presignedUrl, responseTime);
      
      // Redirect to presigned URL
      return NextResponse.redirect(presignedUrl, {
        status: 302,
        headers: {
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type'
        }
      });
      
    } catch (presignedError) {
      console.error('❌ Error generating presigned download URL:', presignedError);
      
      await videoMonitor.logVideoError(videoId, 'Presigned URL generation failed', {
        error: presignedError instanceof Error ? presignedError.message : String(presignedError),
        s3Key: video?.s3_key,
        bucket: video?.s3_bucket
      });
      
      // If presigned URL fails, return a helpful error message
      return NextResponse.json(
        { 
          error: 'Video access temporarily unavailable',
          details: 'AWS permissions need to be configured for video playback',
          suggestion: 'Contact administrator to configure S3 bucket permissions or CloudFront Origin Access Control'
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('❌ Stream error:', error);
    
    await videoMonitor.logVideoError(videoId || 'unknown', 'Stream endpoint error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
