import { NextRequest, NextResponse } from 'next/server';
import { AWSTranscribeService } from '@/lib/aws-transcribe-service';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { videoId, enableSpeakerDiarization = true, maxSpeakers = 4, language = 'en-US' } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    console.log('🎤 Starting AWS Transcribe with speaker diarization for video:', videoId);

    // Get video record to get S3 key
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.s3_key) {
      return NextResponse.json({ error: 'Video S3 key not found' }, { status: 400 });
    }

    // Initialize AWS Transcribe service
    const transcribeService = new AWSTranscribeService();
    
    // Start transcription job
    const result = await transcribeService.startTranscriptionJob({
      videoId,
      s3Key: video.s3_key,
      language: language as any,
      maxSpeakers,
      enableSpeakerDiarization
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to start AWS Transcribe job',
        details: result.error 
      }, { status: 500 });
    }

    // Update video record with transcription job ID
    await VideoDB.update(videoId, {
      transcription_job_id: result.jobId,
      transcript_status: 'processing'
    });

    console.log('✅ AWS Transcribe job started successfully for video:', videoId);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      message: 'AWS Transcribe job started with speaker diarization',
      estimatedTime: '2-10 minutes depending on video length'
    });

  } catch (error) {
    console.error('❌ AWS Transcribe request failed:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const jobId = searchParams.get('jobId');

    if (!videoId && !jobId) {
      return NextResponse.json({ error: 'Video ID or Job ID is required' }, { status: 400 });
    }

    console.log('🔍 Checking AWS Transcribe job status for:', videoId || jobId);

    let transcriptionJobId = jobId;
    
    // If videoId provided, get the job ID from database
    if (videoId && !jobId) {
      const video = await VideoDB.findById(videoId);
      if (!video || !video.transcription_job_id) {
        return NextResponse.json({ error: 'No transcription job found for video' }, { status: 404 });
      }
      transcriptionJobId = video.transcription_job_id;
    }

    // Initialize AWS Transcribe service
    const transcribeService = new AWSTranscribeService();
    
    // Get job status and results
    const result = await transcribeService.getTranscriptionJob(transcriptionJobId!);

    // Update database if job is completed
    if (videoId && result.status === 'COMPLETED' && result.transcriptText) {
      await VideoDB.update(videoId, {
        transcript_text: result.transcriptText,
        transcript_status: 'completed',
        transcript_confidence: result.confidence,
        speaker_count: result.speakers?.length || 0
      });
      
      console.log('✅ Transcription results saved to database for video:', videoId);
    } else if (videoId && result.status === 'FAILED') {
      await VideoDB.update(videoId, {
        transcript_status: 'failed'
      });
    }

    return NextResponse.json({
      success: true,
      videoId,
      jobId: transcriptionJobId,
      status: result.status,
      transcriptText: result.transcriptText,
      speakers: result.speakers,
      speakerCount: result.speakers?.length || 0,
      confidence: result.confidence,
      transcriptUrl: result.transcriptUrl,
      error: result.error
    });

  } catch (error) {
    console.error('❌ Failed to get AWS Transcribe job status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}