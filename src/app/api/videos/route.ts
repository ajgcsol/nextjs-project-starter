import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    console.log('📹 Fetching videos with filters:', { limit, offset, search });

    let videos;
    if (search) {
      videos = await VideoDB.search(search, limit);
    } else {
      videos = await VideoDB.findAll(limit, offset);
    }

    console.log(`✅ Found ${videos.length} videos`);

    return NextResponse.json({
      success: true,
      videos: videos.map((video: any) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        duration: video.duration || 0,
        views: video.view_count || 0,
        uploadDate: video.uploaded_at || video.created_at,
        thumbnailUrl: (video.mux_playback_id && video.thumbnail_timestamp && video.thumbnail_method === 'timestamp') 
          ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=${video.thumbnail_timestamp}`
          : video.thumbnail_path || `/api/videos/thumbnail/${video.id}`,
        category: video.category || 'General',
        status: video.is_processed ? 'ready' : 'processing',
        size: video.file_size?.toString() || '0'
      })),
      total: videos.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('❌ Failed to fetch videos:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch videos',
      videos: [],
      total: 0
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category = 'General' } = body;

    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'Title is required'
      }, { status: 400 });
    }

    console.log('📹 Creating new video record:', { title, category });

    // Create a basic video record - the upload endpoint will update it with file details
    const video = await VideoDB.create({
      title,
      description: description || '',
      filename: `${title}.tmp`,
      file_path: '',
      file_size: 0,
      uploaded_by: 'system', // TODO: Get from auth
      is_processed: false,
      is_public: false
    });

    console.log('✅ Video record created:', video.id);

    return NextResponse.json({
      success: true,
      id: video.id,
      message: 'Video record created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create video:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create video'
    }, { status: 500 });
  }
}
