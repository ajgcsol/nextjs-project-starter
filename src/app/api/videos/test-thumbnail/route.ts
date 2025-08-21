import { NextRequest, NextResponse } from 'next/server';
import { ThumbnailGenerator } from '@/lib/thumbnailGenerator';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, method = 'auto' } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing thumbnail generation for video: ${videoId} with method: ${method}`);

    // Get video details
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    let result;

    switch (method) {
      case 'mediaconvert':
        if (!video.s3_key) {
          return NextResponse.json(
            { error: 'Video S3 key not found - cannot use MediaConvert' },
            { status: 400 }
          );
        }
        result = await ThumbnailGenerator.generateWithMediaConvert(video.s3_key, videoId);
        break;

      case 'ffmpeg':
        if (!video.s3_key) {
          return NextResponse.json(
            { error: 'Video S3 key not found - cannot use FFmpeg' },
            { status: 400 }
          );
        }
        result = await ThumbnailGenerator.generateWithFFmpeg(video.s3_key, videoId);
        break;

      case 'placeholder':
        result = await ThumbnailGenerator.generatePlaceholderThumbnail(videoId);
        break;

      case 'auto':
      default:
        result = await ThumbnailGenerator.generateThumbnail(
          videoId,
          video.s3_key || undefined,
          video.file_path || undefined
        );
        break;
    }

    return NextResponse.json({
      success: result.success,
      message: `Thumbnail generation ${result.success ? 'completed' : 'failed'}`,
      method: result.method,
      thumbnailUrl: result.thumbnailUrl,
      s3Key: result.s3Key,
      jobId: result.jobId,
      error: result.error,
      videoInfo: {
        id: video.id,
        title: video.title,
        filename: video.filename,
        s3_key: video.s3_key,
        current_thumbnail: video.thumbnail_path
      }
    });

  } catch (error) {
    console.error('❌ Thumbnail test API error:', error);
    return NextResponse.json(
      { 
        error: 'Thumbnail test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list-videos') {
      // List videos that need thumbnails for testing
      const limit = parseInt(searchParams.get('limit') || '10');
      const videos = await VideoDB.findVideosWithoutThumbnails(limit);
      
      return NextResponse.json({
        success: true,
        count: videos.length,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          filename: v.filename,
          s3_key: v.s3_key,
          thumbnail_path: v.thumbnail_path,
          file_path: v.file_path,
          uploaded_at: v.uploaded_at
        }))
      });

    } else if (action === 'check-config') {
      // Check thumbnail generation configuration
      const config = {
        mediaconvert: {
          available: !!(process.env.MEDIACONVERT_ROLE_ARN && process.env.MEDIACONVERT_ENDPOINT),
          role_arn: process.env.MEDIACONVERT_ROLE_ARN ? 'configured' : 'missing',
          endpoint: process.env.MEDIACONVERT_ENDPOINT ? 'configured' : 'missing'
        },
        aws: {
          access_key: process.env.AWS_ACCESS_KEY_ID ? 'configured' : 'missing',
          secret_key: process.env.AWS_SECRET_ACCESS_KEY ? 'configured' : 'missing',
          region: process.env.AWS_REGION || 'us-east-1',
          s3_bucket: process.env.S3_BUCKET_NAME || 'not configured'
        },
        cloudfront: {
          domain: process.env.CLOUDFRONT_DOMAIN || 'not configured'
        },
        environment: {
          vercel: !!process.env.VERCEL,
          netlify: !!process.env.NETLIFY,
          node_env: process.env.NODE_ENV
        }
      };

      return NextResponse.json({
        success: true,
        config
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: list-videos, check-config' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Thumbnail test GET API error:', error);
    return NextResponse.json(
      { error: 'Request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
