import { NextRequest, NextResponse } from 'next/server';
import { AudioProcessor, AudioProcessingOptions } from '@/lib/audioProcessor';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, options, batchMode = false, videoIds = [] } = body;

    const audioProcessor = new AudioProcessor();

    if (batchMode && videoIds.length > 0) {
      // Batch process multiple videos
      console.log(`🎵 Starting batch audio processing for ${videoIds.length} videos...`);
      
      const videos = [];
      for (const id of videoIds) {
        const video = await VideoDB.findById(id);
        if (video && video.s3_key) {
          videos.push({ id, s3Key: video.s3_key });
        }
      }

      if (videos.length === 0) {
        return NextResponse.json(
          { error: 'No valid videos found for batch processing' },
          { status: 400 }
        );
      }

      const processingOptions: AudioProcessingOptions = {
        noiseReduction: options?.noiseReduction ?? true,
        feedbackRemoval: options?.feedbackRemoval ?? true,
        audioEnhancement: options?.audioEnhancement ?? true,
        outputFormat: options?.outputFormat ?? 'mp3',
        quality: options?.quality ?? 'high',
        normalizeAudio: options?.normalizeAudio ?? true,
        compressDynamicRange: options?.compressDynamicRange ?? false
      };

      const result = await audioProcessor.batchProcessAudio(videos, processingOptions);
      
      return NextResponse.json({
        success: true,
        message: `Batch audio processing completed`,
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        results: result.results
      });

    } else if (videoId) {
      // Process single video
      console.log(`🎵 Processing audio for video: ${videoId}`);
      
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

      const processingOptions: AudioProcessingOptions = {
        noiseReduction: options?.noiseReduction ?? true,
        feedbackRemoval: options?.feedbackRemoval ?? true,
        audioEnhancement: options?.audioEnhancement ?? true,
        outputFormat: options?.outputFormat ?? 'mp3',
        quality: options?.quality ?? 'high',
        normalizeAudio: options?.normalizeAudio ?? true,
        compressDynamicRange: options?.compressDynamicRange ?? false
      };

      const result = await audioProcessor.processVideoAudio(
        video.s3_key,
        videoId,
        processingOptions
      );

      if (result.success) {
        // Update video record with processed audio info
        try {
          await VideoDB.update(videoId, {
            // Store processed audio info in metadata or separate field
            // For now, we'll just log it
          });
          console.log(`✅ Audio processing completed for video ${videoId}`);
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with processed audio info:', dbError);
        }

        return NextResponse.json({
          success: true,
          message: 'Audio processing completed',
          jobId: result.jobId,
          processedAudioUrl: result.processedAudioUrl,
          processingMethod: result.processingMethod,
          processingTime: result.processingTime
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Audio processing failed',
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
    console.error('❌ Audio processing API error:', error);
    return NextResponse.json(
      { error: 'Audio processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');

    if (action === 'check-job-status' && jobId) {
      // Check audio processing job status
      const audioProcessor = new AudioProcessor();
      const jobStatus = await audioProcessor.getJobStatus(jobId);
      
      return NextResponse.json({
        success: true,
        jobId,
        status: jobStatus.status,
        progress: jobStatus.progress,
        isComplete: jobStatus.status === 'COMPLETE',
        message: jobStatus.status === 'COMPLETE' ? 'Audio processing completed' : 'Audio processing in progress'
      });

    } else if (action === 'get-default-options') {
      // Get default audio processing options
      const defaultOptions = AudioProcessor.getDefaultOptions();
      const aggressiveOptions = AudioProcessor.getAggressiveNoiseReductionOptions();
      
      return NextResponse.json({
        success: true,
        defaultOptions,
        aggressiveOptions,
        availableFormats: ['mp3', 'aac', 'wav'],
        qualityLevels: ['high', 'medium', 'low']
      });

    } else if (action === 'list-videos-needing-audio-processing') {
      // List videos that could benefit from audio processing
      const limit = parseInt(searchParams.get('limit') || '20');
      const videos = await VideoDB.findAll(limit);
      
      // Filter videos that might need audio processing (e.g., WMV files, large files)
      const candidateVideos = videos.filter(video => {
        const filename = video.filename?.toLowerCase() || '';
        return filename.includes('.wmv') || 
               filename.includes('.avi') || 
               video.file_size > 100 * 1024 * 1024; // Files larger than 100MB
      });
      
      return NextResponse.json({
        success: true,
        count: candidateVideos.length,
        videos: candidateVideos.map(v => ({
          id: v.id,
          title: v.title,
          filename: v.filename,
          file_size: v.file_size,
          duration: v.duration,
          s3_key: v.s3_key,
          uploaded_at: v.uploaded_at
        }))
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: check-job-status, get-default-options, list-videos-needing-audio-processing' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Audio processing GET API error:', error);
    return NextResponse.json(
      { error: 'Request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
