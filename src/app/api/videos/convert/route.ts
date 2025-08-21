import { NextRequest, NextResponse } from 'next/server';
import { VideoConverter } from '@/lib/videoConverter';
import { VideoDB } from '@/lib/database';
import { videoMonitor } from '@/lib/monitoring';

export async function POST(request: NextRequest) {
  try {
    const { videoId, force = false } = await request.json();
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('🎬 🔄 Video conversion request:', { videoId, force });

    // Get video from database
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if conversion is needed
    const needsConversion = VideoConverter.needsConversion(video.filename);
    
    if (!needsConversion && !force) {
      return NextResponse.json({
        success: true,
        message: 'Video is already in web-compatible format',
        videoId,
        filename: video.filename,
        needsConversion: false
      });
    }

    console.log('🎬 ⚙️ Starting conversion for:', {
      videoId,
      filename: video.filename,
      s3Key: video.s3_key,
      needsConversion,
      force
    });

    await videoMonitor.logUploadEvent('Manual conversion started', {
      videoId,
      filename: video.filename,
      s3Key: video.s3_key,
      reason: force ? 'manual-force' : 'web-compatibility'
    });

    // Check if we have MediaConvert configured
    const hasMediaConvert = !!(
      process.env.MEDIACONVERT_ENDPOINT && 
      process.env.MEDIACONVERT_ROLE_ARN
    );

    if (!hasMediaConvert) {
      console.log('🎬 ⚠️ MediaConvert not configured - returning setup instructions');
      
      return NextResponse.json({
        success: false,
        error: 'Video conversion service not configured',
        videoId,
        filename: video.filename,
        needsConversion: true,
        setup: {
          required: [
            'MEDIACONVERT_ENDPOINT',
            'MEDIACONVERT_ROLE_ARN'
          ],
          instructions: 'Set up AWS MediaConvert service for automatic video conversion',
          documentation: 'https://docs.aws.amazon.com/mediaconvert/latest/ug/getting-started.html'
        },
        workaround: {
          message: 'For now, WMV files will be served directly. Some browsers may not support playback.',
          suggestion: 'Manually convert WMV files to MP4 before uploading for best compatibility.'
        }
      });
    }

    try {
      // Initialize converter
      const converter = new VideoConverter();
      
      // Start conversion job
      const conversionJob = await converter.startConversion(
        video.s3_key!,
        `converted/${video.filename.replace(/\.[^/.]+$/, '')}_${Date.now()}.mp4`,
        {
          inputFormat: video.filename.split('.').pop() || 'unknown',
          outputFormat: 'mp4',
          quality: 'high',
          resolution: 'original',
          generateThumbnail: true
        }
      );

      console.log('🎬 ✅ Conversion job started:', conversionJob.jobId);

      await videoMonitor.logUploadEvent('Conversion job created', {
        videoId,
        jobId: conversionJob.jobId,
        inputS3Key: conversionJob.inputS3Key,
        outputS3Key: conversionJob.outputS3Key
      });

      return NextResponse.json({
        success: true,
        message: 'Video conversion started',
        videoId,
        conversionJob: {
          jobId: conversionJob.jobId,
          status: conversionJob.status,
          inputS3Key: conversionJob.inputS3Key,
          outputS3Key: conversionJob.outputS3Key
        },
        estimatedTime: '5-15 minutes depending on video size'
      });

    } catch (conversionError) {
      console.error('🎬 ❌ Conversion failed:', conversionError);
      
      await videoMonitor.logUploadEvent('Conversion failed', {
        videoId,
        error: conversionError instanceof Error ? conversionError.message : 'Unknown error'
      });

      return NextResponse.json({
        success: false,
        error: 'Failed to start video conversion',
        videoId,
        details: conversionError instanceof Error ? conversionError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🎬 ❌ Conversion endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Conversion request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const videoId = url.searchParams.get('videoId');

    if (!jobId && !videoId) {
      return NextResponse.json(
        { error: 'Either jobId or videoId is required' },
        { status: 400 }
      );
    }

    if (jobId) {
      // Get job status
      try {
        const converter = new VideoConverter();
        const jobStatus = await converter.getJobStatus(jobId);
        
        return NextResponse.json({
          success: true,
          job: jobStatus
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get job status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    if (videoId) {
      // Check if video needs conversion
      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      const needsConversion = VideoConverter.needsConversion(video.filename);
      
      return NextResponse.json({
        success: true,
        videoId,
        filename: video.filename,
        needsConversion,
        supportedFormats: ['.mp4', '.webm', '.ogg'],
        incompatibleFormats: ['.wmv', '.avi', '.mov', '.flv', '.f4v', '.3gp', '.rm', '.vob']
      });
    }

  } catch (error) {
    console.error('🎬 ❌ Conversion status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get conversion status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
