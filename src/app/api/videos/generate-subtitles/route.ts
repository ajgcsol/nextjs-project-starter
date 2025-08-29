import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('🎤 Starting subtitle generation for video ID:', videoId);

    // Get the video from database
    const video = await VideoDB.findById(videoId);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if subtitles are already generated
    if (video.captions_status === 'ready') {
      console.log('✅ Subtitles already available');
      return NextResponse.json({
        success: true,
        message: 'Subtitles already available',
        status: 'ready',
        captionsUrl: video.captions_url
      });
    }

    // Use enhanced transcription service for better results
    console.log('🚀 Using enhanced transcription service...');
    
    try {
      const enhancedResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/videos/enhanced-subtitles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          enableSpeakerDiarization: true,
          maxSpeakers: 4,
          language: 'en-US',
          enableEntityExtraction: true,
          enableAIEnhancement: true
        })
      });

      if (enhancedResponse.ok) {
        const result = await enhancedResponse.json();
        console.log('✅ Enhanced subtitle generation initiated:', result);
        
        return NextResponse.json({
          success: true,
          message: 'Enhanced subtitle generation initiated',
          status: result.status || 'processing',
          method: result.transcriptionMethod,
          processingTime: result.processingTime,
          enhancedFeatures: {
            speakerDiarization: true,
            entityExtraction: true,
            aiEnhancement: true
          }
        });
      } else {
        const errorResult = await enhancedResponse.json();
        console.log('⚠️ Enhanced subtitle generation failed:', errorResult);
      }
    } catch (error) {
      console.log('⚠️ Enhanced subtitle service failed:', error);
    }

    // Fallback to Mux if available
    if (video.mux_asset_id) {
      console.log('📹 Falling back to Mux subtitle generation');
      
      // Update status to indicate subtitles are being generated
      await VideoDB.update(videoId, {
        captions_status: 'processing',
        transcript_status: 'processing'
      });

      return NextResponse.json({
        success: true,
        message: 'Mux subtitle generation initiated',
        status: 'processing',
        note: 'Using Mux automatic subtitle generation'
      });
    }

    // Fallback to AWS Transcribe only
    console.log('🎤 Falling back to AWS Transcribe only');
    
    try {
      const transcribeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/videos/aws-transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          enableSpeakerDiarization: true,
          maxSpeakers: 4,
          language: 'en-US'
        })
      });

      if (transcribeResponse.ok) {
        const result = await transcribeResponse.json();
        console.log('✅ AWS Transcribe initiated:', result);
        
        return NextResponse.json({
          success: true,
          message: 'AWS Transcribe initiated',
          status: 'processing',
          method: 'aws-transcribe',
          jobName: result.jobName
        });
      } else {
        console.log('⚠️ AWS Transcribe failed');
      }
    } catch (error) {
      console.log('⚠️ AWS Transcribe error:', error);
    }

    // If all transcription methods fail
    return NextResponse.json({
      success: false,
      message: 'No transcription service available',
      status: 'unavailable',
      recommendations: [
        'Configure OpenAI API key for Whisper AI',
        'Verify AWS Transcribe credentials',
        'Check Mux configuration'
      ]
    });

  } catch (error) {
    console.error('❌ Generate subtitles error:', error);
    return NextResponse.json(
      { error: 'Failed to generate subtitles' },
      { status: 500 }
    );
  }
}