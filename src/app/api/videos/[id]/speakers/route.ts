import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

interface Speaker {
  id: string;
  originalLabel: string;
  name: string;
  color: string;
  segments: number;
  screenshot?: string;
  confidence: number;
}

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = params;
    const { speakers }: { speakers: Speaker[] } = await request.json();

    console.log('💾 Saving speaker identifications for video:', videoId);
    console.log('👥 Speakers to save:', speakers.map(s => ({ id: s.id, name: s.name, originalLabel: s.originalLabel })));

    // Get video record
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Save speaker data as JSON in the database
    const speakerData = {
      speakers: speakers.map(speaker => ({
        id: speaker.id,
        originalLabel: speaker.originalLabel,
        name: speaker.name,
        color: speaker.color,
        segments: speaker.segments,
        screenshot: speaker.screenshot,
        confidence: speaker.confidence
      })),
      updatedAt: new Date().toISOString()
    };

    // Update video record with speaker identifications
    const updateResult = await VideoDB.update(videoId, {
      speaker_identifications: JSON.stringify(speakerData),
      speaker_count: speakers.length
    });

    if (!updateResult) {
      return NextResponse.json({ error: 'Failed to save speaker identifications' }, { status: 500 });
    }

    console.log('✅ Speaker identifications saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Speaker identifications saved successfully',
      speakerCount: speakers.length,
      speakers: speakers.map(s => ({ id: s.id, name: s.name }))
    });

  } catch (error) {
    console.error('❌ Failed to save speaker identifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: videoId } = params;

    console.log('🔍 Getting speaker identifications for video:', videoId);

    // Get video record
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    let speakerData = null;
    
    // Parse speaker identifications if they exist
    if (video.speaker_identifications) {
      try {
        speakerData = JSON.parse(video.speaker_identifications);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse speaker identifications JSON:', parseError);
      }
    }

    return NextResponse.json({
      success: true,
      videoId,
      speakerData,
      speakerCount: video.speaker_count || 0,
      hasIdentifications: !!speakerData
    });

  } catch (error) {
    console.error('❌ Failed to get speaker identifications:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}