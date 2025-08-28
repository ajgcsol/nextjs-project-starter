import { NextRequest, NextResponse } from 'next/server';
import { MuxVideoProcessor } from '@/lib/mux-video-processor';
import { VideoDB } from '@/lib/database';

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

    if (!video.muxAssetId) {
      return NextResponse.json({ error: 'Video not processed by Mux yet' }, { status: 400 });
    }

    // Request transcription from Mux
    const transcriptionResult = await MuxVideoProcessor.requestTranscription(
      video.muxAssetId,
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

    // Update video record with transcription status
    await VideoDB.update(videoId, {
      transcriptStatus: 'processing',
      transcriptionJobId: transcriptionResult.jobId
    });

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