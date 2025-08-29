import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing video status updates...');

    // Get all videos that are not processed yet
    const allVideos = await VideoDB.findAll(100, 0); // Get up to 100 videos
    const processingVideos = allVideos.filter(video => !video.is_processed);

    console.log(`📊 Found ${processingVideos.length} videos in processing state`);

    let updatedCount = 0;

    for (const video of processingVideos) {
      try {
        // Check if video has been uploaded to S3 and should be marked as ready
        if (video.s3_key && video.file_path) {
          // For now, mark S3-uploaded videos as ready
          // In production, this would check Mux processing status
          
          console.log(`✅ Marking video ${video.id} as ready`);
          
          await VideoDB.update(video.id, {
            is_processed: true,
            mux_status: 'ready'
          });
          
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Failed to update video ${video.id}:`, error);
      }
    }

    console.log(`🎉 Updated ${updatedCount} videos to ready status`);

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} videos`,
      processed: updatedCount,
      total: processingVideos.length
    });

  } catch (error) {
    console.error('❌ Process status error:', error);
    return NextResponse.json(
      { error: 'Failed to process video status updates' },
      { status: 500 }
    );
  }
}

// Allow GET requests too for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}