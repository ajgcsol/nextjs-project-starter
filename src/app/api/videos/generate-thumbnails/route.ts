import { NextRequest, NextResponse } from 'next/server';
import { ThumbnailGenerator } from '@/lib/thumbnailGenerator';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, batchMode = false, limit = 10, forceRegenerate = false, offset = 0 } = body;

    if (batchMode) {
      // Batch generate thumbnails for multiple videos
      console.log(`🔄 Starting batch thumbnail generation (limit: ${limit}, offset: ${offset}, force: ${forceRegenerate})...`);
      
      const result = await ThumbnailGenerator.batchGenerateThumbnails(limit, forceRegenerate, offset);
      
      return NextResponse.json({
        success: true,
        message: `Batch thumbnail generation completed`,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
        forceRegenerate,
        offset
      });

    } else if (videoId) {
      // Generate thumbnail for specific video
      console.log(`🖼️ Generating thumbnail for video: ${videoId}`);
      
      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      const result = await ThumbnailGenerator.generateThumbnail(
        videoId,
        video.s3_key || undefined,
        video.file_path || undefined
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Thumbnail generation initiated',
          method: result.method,
          thumbnailUrl: result.thumbnailUrl,
          s3Key: result.s3Key
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Thumbnail generation failed',
          method: result.method,
          error: result.error
        }, { status: 500 });
      }

    } else {
      return NextResponse.json(
        { error: 'Either videoId or batchMode must be specified' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Thumbnail generation API error:', error);
    return NextResponse.json(
      { error: 'Thumbnail generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const videoId = searchParams.get('videoId');

    if (action === 'check-job-status' && videoId) {
      // Check MediaConvert job status for a specific video
      const jobId = searchParams.get('jobId');
      
      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required for status check' },
          { status: 400 }
        );
      }

      const isComplete = await ThumbnailGenerator.checkThumbnailJobStatus(jobId, videoId);
      
      return NextResponse.json({
        success: true,
        jobId,
        videoId,
        isComplete,
        message: isComplete ? 'Thumbnail generation completed' : 'Thumbnail generation in progress'
      });

    } else if (action === 'list-videos-without-thumbnails') {
      // List videos that need thumbnails
      const limit = parseInt(searchParams.get('limit') || '20');
      const videos = await VideoDB.findVideosWithoutThumbnails(limit);
      
      return NextResponse.json({
        success: true,
        count: videos.length,
        videos: videos.map(v => ({
          id: v.id,
          title: v.title,
          filename: v.filename,
          thumbnail_path: v.thumbnail_path,
          file_path: v.file_path,
          s3_key: v.s3_key,
          uploaded_at: v.uploaded_at
        }))
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: check-job-status, list-videos-without-thumbnails' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Thumbnail generation GET API error:', error);
    return NextResponse.json(
      { error: 'Request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
