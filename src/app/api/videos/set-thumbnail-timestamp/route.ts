import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { videoId, timestamp } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    if (timestamp === undefined || timestamp === null || timestamp < 0) {
      return NextResponse.json(
        { error: 'Valid timestamp is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Setting thumbnail timestamp:', timestamp, 'for video:', videoId);

    // Get the video from database
    const video = await VideoDB.findById(videoId);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Update the video with the thumbnail timestamp
    const updateData: any = {
      thumbnail_timestamp: timestamp,
      thumbnail_method: 'timestamp'
    };

    // If we have a Mux playback ID, construct the thumbnail URL with the timestamp
    if (video.mux_playback_id) {
      updateData.thumbnail_url = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=${timestamp}`;
      console.log('✅ Mux thumbnail URL generated:', updateData.thumbnail_url);
    }

    // Update the database
    await VideoDB.update(videoId, updateData);

    console.log('✅ Thumbnail timestamp updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Thumbnail timestamp set successfully',
      thumbnailUrl: updateData.thumbnail_url || `/api/videos/thumbnail/${videoId}`,
      timestamp
    });

  } catch (error) {
    console.error('❌ Set thumbnail timestamp error:', error);
    return NextResponse.json(
      { error: 'Failed to set thumbnail timestamp' },
      { status: 500 }
    );
  }
}