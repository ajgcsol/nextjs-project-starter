import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      tags,
      visibility,
      status,
      uploadId,
      assetId,
      playbackId,
      thumbnails,
      subtitles,
      uploadMethod
    } = body;

    console.log('🎬 Creating Mux video record:', {
      title,
      uploadId,
      assetId,
      playbackId,
      hasThumbnails: !!thumbnails,
      hasSubtitles: !!subtitles
    });

    // Generate unique ID
    const videoId = uuidv4();
    const now = new Date().toISOString();

    // Prepare video data
    const videoData = {
      id: videoId,
      title: title || 'Untitled Video',
      description: description || '',
      category: category || 'general',
      tags: tags || '',
      visibility: visibility || 'private',
      status: status || 'published', // Default to published for completed uploads
      upload_method: uploadMethod || 'mux_direct',
      created_at: now,
      updated_at: now,
      // Mux-specific fields
      mux_upload_id: uploadId,
      mux_asset_id: assetId,
      mux_playback_id: playbackId,
      // URLs from Mux
      streaming_url: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
      thumbnail_url: thumbnails?.large || thumbnails?.medium || thumbnails?.small || null,
      // Subtitle information
      captions_url: subtitles?.vttUrl || null,
      captions_status: subtitles ? 'ready' : 'pending',
      transcript_status: subtitles ? 'completed' : 'pending',
      // Thumbnail information
      thumbnail_method: 'auto', // Mux generates thumbnails automatically
      thumbnail_timestamp: 10, // Default thumbnail time
      // Processing status
      processing_status: 'completed',
      processing_error: null
    };

    console.log('💾 Inserting video record into database...');

    // Insert video record
    const insertResult = await sql`
      INSERT INTO videos (
        id, title, description, category, tags, visibility, status,
        upload_method, created_at, updated_at,
        mux_upload_id, mux_asset_id, mux_playback_id,
        streaming_url, thumbnail_url,
        captions_url, captions_status, transcript_status,
        thumbnail_method, thumbnail_timestamp,
        processing_status, processing_error
      ) VALUES (
        ${videoData.id}, ${videoData.title}, ${videoData.description}, 
        ${videoData.category}, ${videoData.tags}, ${videoData.visibility}, 
        ${videoData.status}, ${videoData.upload_method}, 
        ${videoData.created_at}, ${videoData.updated_at},
        ${videoData.mux_upload_id}, ${videoData.mux_asset_id}, ${videoData.mux_playback_id},
        ${videoData.streaming_url}, ${videoData.thumbnail_url},
        ${videoData.captions_url}, ${videoData.captions_status}, ${videoData.transcript_status},
        ${videoData.thumbnail_method}, ${videoData.thumbnail_timestamp},
        ${videoData.processing_status}, ${videoData.processing_error}
      )
      RETURNING *
    `;

    const video = insertResult[0];

    // Store thumbnail variants if available
    if (thumbnails && thumbnails.variants) {
      console.log('🖼️ Storing thumbnail variants...');
      
      for (let i = 0; i < thumbnails.variants.length; i++) {
        const variant = thumbnails.variants[i];
        await sql`
          INSERT INTO video_thumbnails (
            id, video_id, url, timestamp, size, width, height, created_at
          ) VALUES (
            ${uuidv4()}, ${videoData.id}, ${variant.url}, ${variant.time}, 
            'large', 1280, 720, ${now}
          )
        `;
      }
    }

    // Store different thumbnail sizes
    if (thumbnails) {
      const thumbnailSizes = [
        { key: 'small', url: thumbnails.small, width: 320, height: 180 },
        { key: 'medium', url: thumbnails.medium, width: 640, height: 360 },
        { key: 'large', url: thumbnails.large, width: 1280, height: 720 }
      ];

      for (const thumb of thumbnailSizes) {
        if (thumb.url) {
          await sql`
            INSERT INTO video_thumbnails (
              id, video_id, url, timestamp, size, width, height, created_at
            ) VALUES (
              ${uuidv4()}, ${videoData.id}, ${thumb.url}, 10, 
              ${thumb.key}, ${thumb.width}, ${thumb.height}, ${now}
            )
          `;
        }
      }
    }

    console.log('✅ Mux video record created successfully:', video.id);

    return NextResponse.json({
      success: true,
      video: video,
      message: 'Mux video record created successfully',
      thumbnailsStored: thumbnails ? (thumbnails.variants?.length || 0) + 3 : 0,
      subtitlesAvailable: !!subtitles
    });

  } catch (error) {
    console.error('❌ Failed to create Mux video record:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating video record'
    }, { status: 500 });
  }
}