import { NextRequest, NextResponse } from 'next/server';
import { MuxVideoProcessor } from '@/lib/mux-video-processor';
import { VideoDB, query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { videoId, enableSpeakerDiarization = true, generateCaptions = true, language = 'en' } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log('🎤 Initiating Mux transcription for video:', videoId);

    // Get video record to get Mux asset ID
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.mux_asset_id) {
      return NextResponse.json({ error: 'Video not processed by Mux yet' }, { status: 400 });
    }

    // Request transcription from Mux
    const transcriptionResult = await MuxVideoProcessor.requestTranscription(
      video.mux_asset_id,
      {
        enableSpeakerDiarization,
        generateCaptions,
        language
      }
    );

    if (!transcriptionResult.success) {
      return NextResponse.json({ 
        error: 'Failed to request transcription',
        details: transcriptionResult.error 
      }, { status: 500 });
    }

    // Update video record with transcription status using flexible update
    try {
      const updateData: any = {
        transcript_status: 'processing',
        transcription_job_id: transcriptionResult.jobId
      };
      
      // Try to update using the flexible update method
      const result = await query(
        `UPDATE videos SET transcript_status = $2, transcription_job_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [videoId, 'processing', transcriptionResult.jobId]
      ).catch(async (err) => {
        // If columns don't exist, try with basic fields
        console.log('⚠️ Transcript columns may not exist, storing in description field as fallback');
        await VideoDB.update(videoId, {
          description: `[Transcription Processing] Job ID: ${transcriptionResult.jobId}`
        });
      });
    } catch (updateError) {
      console.warn('⚠️ Could not update transcript status:', updateError);
    }

    console.log('✅ Transcription requested successfully for video:', videoId);

    return NextResponse.json({
      success: true,
      jobId: transcriptionResult.jobId,
      status: 'processing',
      message: 'Transcription initiated successfully'
    });

  } catch (error) {
    console.error('❌ Transcription request failed:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}