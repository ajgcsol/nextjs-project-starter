import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import EnhancedTranscriptionService from '@/lib/enhanced-transcription-service';

export async function POST(request: NextRequest) {
  try {
    const { 
      videoId, 
      enableSpeakerDiarization = true, 
      maxSpeakers = 4, 
      language = 'en-US',
      enableEntityExtraction = true,
      enableAIEnhancement = true,
      forceRetranscribe = false
    } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log('🚀 Starting enhanced subtitle generation for video:', videoId);

    // Get video record to get S3 key
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.s3_key) {
      return NextResponse.json({ error: 'Video S3 key not found' }, { status: 400 });
    }

    // Check if we already have good transcription and don't need to retranscribe
    if (!forceRetranscribe && video.transcript_text && video.captions_status === 'ready') {
      console.log('✅ Video already has transcription, checking if AI enhancement is needed...');
      
      // If we have transcription but no entity extraction, do AI enhancement only
      if (enableEntityExtraction && enableAIEnhancement) {
        try {
          const enhancedService = new EnhancedTranscriptionService();
          // We'll add entity extraction to existing transcript later
          console.log('📄 Using existing transcript, enhanced processing available');
        } catch (error) {
          console.warn('⚠️ Enhanced service not available:', error);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Subtitles already available',
        status: 'ready',
        transcriptText: video.transcript_text,
        captionsUrl: video.captions_url,
        existingData: true
      });
    }

    // Initialize enhanced transcription service
    let enhancedService: EnhancedTranscriptionService;
    try {
      enhancedService = new EnhancedTranscriptionService();
    } catch (error) {
      console.error('❌ Failed to initialize enhanced transcription service:', error);
      return NextResponse.json({ 
        error: 'Enhanced transcription service not available',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // Update video status to processing
    await VideoDB.update(videoId, {
      captions_status: 'processing',
      transcript_status: 'processing'
    });

    console.log('🎤 Starting enhanced transcription workflow...');

    // Start enhanced transcription process
    const result = await enhancedService.processVideoTranscription({
      videoId,
      s3Key: video.s3_key,
      language: language.replace('-', '_'), // Convert en-US to en_US for AWS
      maxSpeakers,
      enableSpeakerDiarization,
      enableEntityExtraction,
      enableAIEnhancement
    });

    if (!result.success) {
      // Update database with failed status
      await VideoDB.update(videoId, {
        captions_status: 'failed',
        transcript_status: 'failed'
      });

      return NextResponse.json({ 
        error: 'Enhanced transcription failed',
        details: result.error,
        method: result.transcriptionMethod
      }, { status: 500 });
    }

    console.log('✅ Enhanced transcription completed successfully');

    // Save results to database
    const updateData: any = {
      transcript_text: result.transcriptText,
      transcript_status: 'completed',
      captions_status: 'ready',
      transcript_confidence: result.segments ? 
        result.segments.reduce((acc, seg) => acc + (seg.confidence || 0), 0) / result.segments.length : 
        undefined
    };

    // If we have speaker information
    if (result.segments && result.segments.some(seg => seg.speaker)) {
      updateData.speaker_count = new Set(
        result.segments
          .filter(seg => seg.speaker)
          .map(seg => seg.speaker)
      ).size;
    }

    // Save subtitle files if generated
    if (result.vttContent || result.srtContent) {
      // In production, you'd want to upload these to S3 or another storage service
      // For now, we'll store URLs pointing to API endpoints that can generate them on demand
      updateData.captions_webvtt_url = result.vttContent ? 
        `/api/videos/${videoId}/subtitles?format=vtt` : null;
      updateData.captions_srt_url = result.srtContent ? 
        `/api/videos/${videoId}/subtitles?format=srt` : null;
    }

    await VideoDB.update(videoId, updateData);

    // Prepare response
    const response: any = {
      success: true,
      message: 'Enhanced subtitles generated successfully',
      status: 'ready',
      transcriptionMethod: result.transcriptionMethod,
      transcriptText: result.transcriptText,
      processingTime: result.processingTime,
      segmentCount: result.segments?.length || 0,
      speakerCount: updateData.speaker_count || 0,
      confidence: updateData.transcript_confidence
    };

    // Add entity extraction results if available
    if (result.entities) {
      response.entities = {
        entityCount: result.entities.entities.length,
        keyTopics: result.entities.keyTopics,
        summary: result.entities.summary,
        sentiment: result.entities.sentiment,
        confidence: result.entities.confidence
      };
    }

    // Add subtitle URLs
    if (updateData.captions_webvtt_url || updateData.captions_srt_url) {
      response.subtitles = {
        vttUrl: updateData.captions_webvtt_url,
        srtUrl: updateData.captions_srt_url
      };
    }

    console.log('📄 Enhanced subtitle generation completed:', {
      method: result.transcriptionMethod,
      textLength: result.transcriptText?.length || 0,
      segments: result.segments?.length || 0,
      entities: result.entities?.entities.length || 0,
      processingTime: result.processingTime
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Enhanced subtitle generation failed:', error);
    
    // Try to update video status to failed
    const { videoId } = await request.json().catch(() => ({}));
    if (videoId) {
      try {
        await VideoDB.update(videoId, {
          captions_status: 'failed',
          transcript_status: 'failed'
        });
      } catch (updateError) {
        console.error('❌ Failed to update video status:', updateError);
      }
    }
    
    return NextResponse.json({ 
      error: 'Internal server error during enhanced subtitle generation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log('📊 Getting enhanced subtitle status for video:', videoId);

    // Get video record
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      videoId,
      transcriptStatus: video.transcript_status,
      captionsStatus: video.captions_status,
      transcriptText: video.transcript_text,
      captionsUrl: video.captions_url,
      confidence: video.transcript_confidence,
      speakerCount: video.speaker_count || 0,
      subtitles: {
        vttUrl: video.captions_webvtt_url,
        srtUrl: video.captions_srt_url
      },
      hasTranscript: !!video.transcript_text,
      hasSubtitles: video.captions_status === 'ready'
    });

  } catch (error) {
    console.error('❌ Failed to get enhanced subtitle status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}