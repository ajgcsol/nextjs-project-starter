import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    console.log('📊 Fetching processing queue...');

    // Get videos that are currently processing or have failed processing
    const processingVideos = await sql`
      SELECT 
        id,
        title,
        status,
        processing_status,
        transcript_status,
        captions_status,
        created_at,
        updated_at,
        processing_error
      FROM videos 
      WHERE 
        status = 'processing' OR 
        processing_status IN ('processing', 'pending', 'failed') OR
        transcript_status IN ('processing', 'pending', 'failed') OR
        captions_status IN ('processing', 'pending', 'failed')
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Transform into processing queue items
    const items = [];

    for (const video of processingVideos) {
      // Add main video processing item if needed
      if (video.processing_status === 'processing' || video.processing_status === 'pending') {
        items.push({
          id: `video_${video.id}`,
          title: video.title,
          type: 'video',
          status: video.processing_status === 'processing' ? 'processing' : 'pending',
          startTime: video.created_at,
          videoId: video.id,
          details: video.processing_status === 'processing' ? 'Processing video...' : 'Waiting to process...',
          error: video.processing_error
        });
      }

      // Add transcript processing item if needed
      if (video.transcript_status === 'processing' || video.transcript_status === 'pending' || video.transcript_status === 'failed') {
        items.push({
          id: `transcript_${video.id}`,
          title: video.title,
          type: 'transcript',
          status: video.transcript_status === 'failed' ? 'failed' : 
                   video.transcript_status === 'processing' ? 'processing' : 'pending',
          startTime: video.created_at,
          videoId: video.id,
          details: video.transcript_status === 'processing' ? 'Generating transcript...' :
                   video.transcript_status === 'pending' ? 'Waiting for transcription...' :
                   'Transcript generation failed',
          error: video.transcript_status === 'failed' ? 'Transcription failed' : undefined
        });
      }

      // Add captions processing item if needed
      if (video.captions_status === 'processing' || video.captions_status === 'pending' || video.captions_status === 'failed') {
        items.push({
          id: `captions_${video.id}`,
          title: video.title,
          type: 'subtitles',
          status: video.captions_status === 'failed' ? 'failed' :
                   video.captions_status === 'processing' ? 'processing' : 'pending',
          startTime: video.created_at,
          videoId: video.id,
          details: video.captions_status === 'processing' ? 'Generating subtitles...' :
                   video.captions_status === 'pending' ? 'Waiting for subtitle generation...' :
                   'Subtitle generation failed',
          error: video.captions_status === 'failed' ? 'Caption generation failed' : undefined
        });
      }

      // Add speaker identification item if transcript is ready but speakers need identification
      // This would be determined by checking if transcript exists but no speaker data
      // For now, we'll simulate this check
      if (video.transcript_status === 'completed' && video.status === 'processing') {
        // Check if we need speaker identification
        try {
          const speakerCheck = await sql`
            SELECT COUNT(*) as speaker_count 
            FROM video_speakers 
            WHERE video_id = ${video.id}
          `;
          
          if (speakerCheck[0].speaker_count === 0) {
            items.push({
              id: `speakers_${video.id}`,
              title: video.title,
              type: 'speakers',
              status: 'pending',
              startTime: video.created_at,
              videoId: video.id,
              details: 'Waiting for speaker identification...'
            });
          }
        } catch (error) {
          console.warn('Could not check speaker status:', error);
        }
      }
    }

    // Sort by status priority (processing first, then pending, then failed)
    items.sort((a, b) => {
      const statusOrder = { processing: 0, pending: 1, failed: 2, completed: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    console.log(`📊 Found ${items.length} processing items`);

    return NextResponse.json({
      success: true,
      items,
      summary: {
        total: items.length,
        processing: items.filter(item => item.status === 'processing').length,
        pending: items.filter(item => item.status === 'pending').length,
        failed: items.filter(item => item.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch processing queue:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching processing queue'
    }, { status: 500 });
  }
}