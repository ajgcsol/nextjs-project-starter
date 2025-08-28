import { NextRequest, NextResponse } from 'next/server';
import { MuxVideoProcessor } from '@/lib/mux-video-processor';
import { VideoDB } from '@/lib/database';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = params;

    console.log('🔍 Checking transcription status for video:', videoId);

    // Get video record
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.muxAssetId) {
      return NextResponse.json({ 
        status: 'not_available',
        message: 'Video not processed by Mux yet'
      });
    }

    // Check Mux asset for transcription status
    const transcriptionStatus = await MuxVideoProcessor.getTranscriptionStatus(video.muxAssetId);

    // Update local database with latest status
    if (transcriptionStatus.status === 'ready' && transcriptionStatus.transcript) {
      await VideoDB.update(videoId, {
        transcriptText: transcriptionStatus.transcript,
        transcriptStatus: 'completed',
        captionUrl: transcriptionStatus.captionUrl,
        speakerCount: transcriptionStatus.speakerCount
      });
    } else if (transcriptionStatus.status === 'failed') {
      await VideoDB.update(videoId, {
        transcriptStatus: 'failed'
      });
    }

    console.log('📊 Transcription status:', transcriptionStatus.status);

    return NextResponse.json({
      success: true,
      videoId,
      status: transcriptionStatus.status,
      transcript: transcriptionStatus.transcript,
      captionUrl: transcriptionStatus.captionUrl,
      speakerCount: transcriptionStatus.speakerCount,
      confidence: transcriptionStatus.confidence,
      error: transcriptionStatus.error
    });

  } catch (error) {
    console.error('❌ Failed to get transcription status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}