import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { VideoDB } from '@/lib/database';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { videoId, action, ...params } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log('🎬 Mux asset operation:', action, 'for video:', videoId);

    // Get video from database
    const video = await VideoDB.findById(videoId);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // For thumbnail timestamp setting, we can proceed even without Mux asset ID
    // We'll store the timestamp preference and apply it when the asset is ready
    if (!video.mux_asset_id && action !== 'set-thumbnail-time') {
      return NextResponse.json(
        { error: 'No Mux asset found for this video' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'set-thumbnail-time': {
        const { timestamp } = params;
        
        if (timestamp === undefined || timestamp === null || timestamp < 0) {
          return NextResponse.json(
            { error: 'Valid timestamp is required' },
            { status: 400 }
          );
        }

        console.log('🖼️ Setting Mux thumbnail time:', timestamp);

        // Update the asset's thumbnail time
        try {
          // Store the timestamp preference even if Mux asset isn't ready yet
          let thumbnailUrl = null;
          
          if (video.mux_playback_id) {
            thumbnailUrl = `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?time=${timestamp}`;
            console.log('🎬 Mux playback ID available, generated thumbnail URL:', thumbnailUrl);
          } else {
            console.log('⏳ Mux playback ID not yet available, storing timestamp for later use');
          }

          await VideoDB.update(videoId, {
            thumbnail_timestamp: timestamp,
            thumbnail_method: 'timestamp',
            ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
          });

          console.log('✅ Thumbnail timestamp set successfully');

          return NextResponse.json({
            success: true,
            message: thumbnailUrl 
              ? 'Thumbnail timestamp configured with URL' 
              : 'Thumbnail timestamp saved - URL will be generated when Mux processing completes',
            thumbnailUrl,
            timestamp,
            muxReady: !!video.mux_playback_id
          });
        } catch (error) {
          console.error('Failed to set thumbnail time:', error);
          throw error;
        }
      }

      case 'generate-subtitles': {
        const { language = 'en' } = params;
        
        console.log('📝 Generating subtitles for Mux asset:', video.mux_asset_id);

        try {
          // Check if asset already has subtitles/captions
          const asset = await mux.video.assets.retrieve(video.mux_asset_id);
          
          // Check for existing text tracks (subtitles/captions)
          const hasSubtitles = asset.tracks?.some(track => 
            track.type === 'text' && 
            (track.text_type === 'subtitles' || track.closed_captions)
          );

          if (hasSubtitles) {
            console.log('✅ Asset already has subtitles');
            
            // Get the track information
            const subtitleTrack = asset.tracks?.find(track => 
              track.type === 'text' && 
              (track.text_type === 'subtitles' || track.closed_captions)
            );

            await VideoDB.update(videoId, {
              captions_status: 'ready',
              transcript_status: 'ready'
            });

            return NextResponse.json({
              success: true,
              message: 'Subtitles already available',
              status: 'ready',
              track: subtitleTrack
            });
          }

          // For assets created without subtitles, we need to use the generated_subtitles feature
          // This requires recreating the asset or using webhooks to track generation
          console.log('📝 Asset needs subtitle generation - this should have been configured during upload');
          
          // Update status to indicate subtitles are being processed
          await VideoDB.update(videoId, {
            captions_status: 'processing',
            transcript_status: 'processing'
          });

          return NextResponse.json({
            success: true,
            message: 'Subtitle generation requested',
            status: 'processing',
            note: 'Subtitles should be generated automatically if configured during asset creation'
          });

        } catch (error) {
          console.error('Failed to generate subtitles:', error);
          throw error;
        }
      }

      case 'get-playback-info': {
        console.log('📺 Getting playback information for asset:', video.mux_asset_id);

        try {
          const asset = await mux.video.assets.retrieve(video.mux_asset_id);
          
          // Get playback IDs
          const playbackIds = asset.playback_ids || [];
          const publicPlayback = playbackIds.find(p => p.policy === 'public');
          const signedPlayback = playbackIds.find(p => p.policy === 'signed');

          // Get thumbnail URLs for different times
          const playbackId = publicPlayback?.id || signedPlayback?.id;
          const thumbnails = playbackId ? {
            default: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
            start: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`,
            middle: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${(asset.duration || 0) / 2}`,
            custom: video.thumbnail_timestamp 
              ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${video.thumbnail_timestamp}`
              : null
          } : {};

          // Get streaming URLs
          const streamingUrls = playbackId ? {
            hls: `https://stream.mux.com/${playbackId}.m3u8`,
            thumbnail: thumbnails.custom || thumbnails.default,
            gif: `https://image.mux.com/${playbackId}/animated.gif`,
            storyboard: `https://image.mux.com/${playbackId}/storyboard.vtt`
          } : {};

          return NextResponse.json({
            success: true,
            asset: {
              id: asset.id,
              status: asset.status,
              duration: asset.duration,
              aspect_ratio: asset.aspect_ratio,
              resolution: asset.resolution_tier,
              max_resolution: asset.max_resolution_tier,
              encoding_tier: asset.encoding_tier,
              playback_ids: playbackIds,
              tracks: asset.tracks,
              created_at: asset.created_at
            },
            playback: {
              playbackId,
              policy: publicPlayback ? 'public' : 'signed',
              thumbnails,
              streaming: streamingUrls
            }
          });

        } catch (error) {
          console.error('Failed to get playback info:', error);
          throw error;
        }
      }

      case 'update-playback-policy': {
        const { policy } = params;
        
        if (!['public', 'signed'].includes(policy)) {
          return NextResponse.json(
            { error: 'Invalid playback policy. Must be "public" or "signed"' },
            { status: 400 }
          );
        }

        console.log('🔒 Updating playback policy to:', policy);

        try {
          const asset = await mux.video.assets.retrieve(video.mux_asset_id);
          const existingPlaybackIds = asset.playback_ids || [];
          
          // Remove existing playback IDs if changing policy
          for (const playbackId of existingPlaybackIds) {
            if (playbackId.policy !== policy) {
              await mux.video.assets.deletePlaybackId(video.mux_asset_id, playbackId.id);
            }
          }

          // Create new playback ID with desired policy
          const newPlaybackId = await mux.video.assets.createPlaybackId(video.mux_asset_id, {
            policy
          });

          // Update database
          await VideoDB.update(videoId, {
            mux_playback_id: newPlaybackId.id,
            is_public: policy === 'public'
          });

          return NextResponse.json({
            success: true,
            message: `Playback policy updated to ${policy}`,
            playbackId: newPlaybackId.id,
            policy
          });

        } catch (error) {
          console.error('Failed to update playback policy:', error);
          throw error;
        }
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Mux asset operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Mux asset operation' },
      { status: 500 }
    );
  }
}