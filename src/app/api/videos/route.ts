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
        thumbnailUrl: (() => {
          console.log('🖼️ Thumbnail URL decision for video:', video.id, {
            mux_playback_id: video.mux_playback_id,
            mux_thumbnail_url: video.mux_thumbnail_url,
            thumbnail_path: video.thumbnail_path,
            thumbnail_timestamp: video.thumbnail_timestamp,
            thumbnail_method: video.thumbnail_method
          });

          // Priority 1: If we have user timestamp preference and a valid Mux playback ID, use that
          if (video.mux_playback_id && video.thumbnail_timestamp && video.thumbnail_method === 'timestamp') {
            const customUrl = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=${video.thumbnail_timestamp}`;
            console.log('🎯 Using custom timestamp thumbnail:', customUrl);
            return customUrl;
          }
          
          // Priority 2: Use mux_thumbnail_url if available
          if (video.mux_thumbnail_url) {
            console.log('🎬 Using mux_thumbnail_url:', video.mux_thumbnail_url);
            return video.mux_thumbnail_url;
          }
          
          // Priority 3: If we have mux_playback_id, generate default Mux thumbnail
          if (video.mux_playback_id) {
            const muxUrl = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=10`;
            console.log('🎬 Generated Mux thumbnail from playback_id:', muxUrl);
            return muxUrl;
          }
          
          // Priority 4: If thumbnail_path looks like a valid Mux URL, use it
          if (video.thumbnail_path && video.thumbnail_path.startsWith('https://image.mux.com/')) {
            console.log('🔗 Using stored thumbnail_path:', video.thumbnail_path);
            return video.thumbnail_path;
          }
          
          // Priority 5: Fallback to API endpoint (will generate placeholder)
          console.log('🆘 Falling back to thumbnail API endpoint');
          return `/api/videos/thumbnail/${video.id}`;
        })(),
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
