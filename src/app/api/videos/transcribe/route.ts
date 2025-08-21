import { NextRequest, NextResponse } from 'next/server';
import { TranscriptionService, TranscriptionOptions } from '@/lib/transcriptionService';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, options, batchMode = false, videoIds = [] } = body;

    const transcriptionService = new TranscriptionService();

    if (batchMode && videoIds.length > 0) {
      // Batch transcribe multiple videos
      console.log(`🎤 Starting batch transcription for ${videoIds.length} videos...`);
      
      const videos = [];
      for (const id of videoIds) {
        const video = await VideoDB.findById(id);
        if (video && video.s3_key) {
          videos.push({ id, s3Key: video.s3_key });
        }
      }

      if (videos.length === 0) {
        return NextResponse.json(
          { error: 'No valid videos found for batch transcription' },
          { status: 400 }
        );
      }

      const transcriptionOptions: TranscriptionOptions = {
        language: options?.language ?? 'en-US',
        enableSpeakerLabels: options?.enableSpeakerLabels ?? true,
        maxSpeakers: options?.maxSpeakers ?? 4,
        enableAutomaticPunctuation: options?.enableAutomaticPunctuation ?? true,
        enableWordTimestamps: options?.enableWordTimestamps ?? true,
        confidenceThreshold: options?.confidenceThreshold ?? 0.8,
        customVocabulary: options?.customVocabulary ?? []
      };

      const result = await transcriptionService.batchTranscribe(videos, transcriptionOptions);
      
      return NextResponse.json({
        success: true,
        message: `Batch transcription completed`,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      });

    } else if (videoId) {
      // Transcribe single video
      console.log(`🎤 Transcribing video: ${videoId}`);
      
      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      if (!video.s3_key) {
        return NextResponse.json(
          { error: 'Video S3 key not found' },
          { status: 400 }
        );
      }

      const transcriptionOptions: TranscriptionOptions = {
        language: options?.language ?? 'en-US',
        enableSpeakerLabels: options?.enableSpeakerLabels ?? true,
        maxSpeakers: options?.maxSpeakers ?? 4,
        enableAutomaticPunctuation: options?.enableAutomaticPunctuation ?? true,
        enableWordTimestamps: options?.enableWordTimestamps ?? true,
        confidenceThreshold: options?.confidenceThreshold ?? 0.8,
        customVocabulary: options?.customVocabulary ?? []
      };

      const result = await transcriptionService.transcribeVideo(
        video.s3_key,
        videoId,
        transcriptionOptions
      );

      if (result.success) {
        // Update video record with transcription info
        try {
          await VideoDB.update(videoId, {
            // Store transcription info in metadata or separate field
            // For now, we'll just log it
          });
          console.log(`✅ Transcription completed for video ${videoId}`);
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with transcription info:', dbError);
        }

        return NextResponse.json({
          success: true,
          message: 'Transcription completed',
          jobId: result.jobId,
          transcriptText: result.transcriptText,
          transcriptUrl: result.transcriptUrl,
          webVttUrl: result.webVttUrl,
          srtUrl: result.srtUrl,
          confidence: result.confidence,
          processingMethod: result.processingMethod,
          processingTime: result.processingTime,
          wordCount: result.wordCount,
          speakerLabels: result.speakerLabels
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Transcription failed',
          error: result.error,
          processingMethod: result.processingMethod
        }, { status: 500 });
      }

    } else {
      return NextResponse.json(
        { error: 'Either videoId or batchMode with videoIds must be specified' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Transcription API error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const videoId = searchParams.get('videoId');

    if (action === 'check-job-status' && jobId) {
      // Check transcription job status
      const transcriptionService = new TranscriptionService();
      const jobStatus = await transcriptionService.getJobStatus(jobId);
      
      return NextResponse.json({
        success: true,
        jobId,
        status: jobStatus.status,
        progress: jobStatus.progress,
        isComplete: jobStatus.status === 'COMPLETED',
        message: jobStatus.status === 'COMPLETED' ? 'Transcription completed' : 'Transcription in progress'
      });

    } else if (action === 'get-default-options') {
      // Get default transcription options
      const defaultOptions = TranscriptionService.getDefaultOptions();
      const highAccuracyOptions = TranscriptionService.getHighAccuracyOptions();
      const supportedLanguages = TranscriptionService.getSupportedLanguages();
      
      return NextResponse.json({
        success: true,
        defaultOptions,
        highAccuracyOptions,
        supportedLanguages,
        availableFormats: ['webvtt', 'srt', 'txt']
      });

    } else if (action === 'get-transcript' && videoId) {
      // Get existing transcript for a video
      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      // For now, return a placeholder since we don't have transcript storage yet
      return NextResponse.json({
        success: true,
        videoId,
        hasTranscript: false,
        message: 'Transcript storage not implemented yet'
      });

    } else if (action === 'get-captions' && videoId) {
      // Get caption files for a video
      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      // Generate sample caption URLs
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
      const webVttUrl = `https://${cloudFrontDomain}/captions/${videoId}_captions.vtt`;
      const srtUrl = `https://${cloudFrontDomain}/captions/${videoId}_captions.srt`;

      return NextResponse.json({
        success: true,
        videoId,
        captions: {
          webvtt: webVttUrl,
          srt: srtUrl
        }
      });

    } else if (action === 'list-videos-needing-transcription') {
      // List videos that need transcription
      const limit = parseInt(searchParams.get('limit') || '20');
      const videos = await VideoDB.findAll(limit);
      
      // Filter videos that might need transcription (e.g., lecture videos, long videos)
      const candidateVideos = videos.filter(video => {
        const title = video.title?.toLowerCase() || '';
        const filename = video.filename?.toLowerCase() || '';
        return title.includes('lecture') || 
               title.includes('seminar') || 
               title.includes('presentation') ||
               filename.includes('lecture') ||
               video.duration > 300; // Videos longer than 5 minutes
      });
      
      return NextResponse.json({
        success: true,
        count: candidateVideos.length,
        videos: candidateVideos.map(v => ({
          id: v.id,
          title: v.title,
          filename: v.filename,
          duration: v.duration,
          file_size: v.file_size,
          s3_key: v.s3_key,
          uploaded_at: v.uploaded_at
        }))
      });

    } else if (action === 'extract-audio' && videoId) {
      // Extract audio from video for transcription
      const video = await VideoDB.findById(videoId);
      if (!video || !video.s3_key) {
        return NextResponse.json(
          { error: 'Video not found or missing S3 key' },
          { status: 404 }
        );
      }

      const transcriptionService = new TranscriptionService();
      const result = await transcriptionService.extractAudioForTranscription(
        video.s3_key,
        videoId
      );

      return NextResponse.json({
        success: result.success,
        audioS3Key: result.audioS3Key,
        error: result.error
      });

    } else {
      return NextResponse.json(
        { 
          error: 'Invalid action. Supported actions: check-job-status, get-default-options, get-transcript, get-captions, list-videos-needing-transcription, extract-audio' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Transcription GET API error:', error);
    return NextResponse.json(
      { error: 'Request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
