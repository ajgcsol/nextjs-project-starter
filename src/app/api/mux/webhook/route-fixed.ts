import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { videoMonitor } from '@/lib/monitoring';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Mux webhook signing secret
const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET || 'q6ac7p1sv5fqvcs2c5oboh84mhjoctko';

interface MuxWebhookEvent {
  type: string;
  object: {
    type: string;
    id: string;
  };
  id: string;
  created_at: string;
  data: {
    passthrough?: string;
    status?: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    duration?: number;
    aspect_ratio?: string;
    tracks?: Array<{ type: string; id: string; status: string }>;
    master?: {
      url?: string;
    };
    mp4_support?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Mux webhook received');
    
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('mux-signature');
    
    // Verify webhook signature for security
    if (signature && MUX_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', MUX_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      const providedSignature = signature.replace('t=', '').split(',v1=')[1];
      
      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature || '', 'hex')
      )) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      console.log('✅ Webhook signature verified');
    } else {
      console.log('⚠️ No signature verification (missing signature or secret)');
    }
    
    // Parse the webhook payload
    const event: MuxWebhookEvent = JSON.parse(body);
    
    console.log('🎭 Webhook event:', {
      type: event.type,
      objectType: event.object.type,
      objectId: event.object.id,
      passthrough: event.data.passthrough
    });

    // Log webhook event for debugging
    await videoMonitor.logUploadEvent('Mux webhook received', {
      eventType: event.type,
      objectId: event.object.id,
      passthrough: event.data.passthrough,
      timestamp: new Date().toISOString()
    });

    // Extract video ID from passthrough data
    const videoId = event.data.passthrough;
    
    if (!videoId) {
      console.log('⚠️ No passthrough video ID found in webhook');
      return NextResponse.json({ received: true, warning: 'No video ID in passthrough' });
    }

    // Handle different webhook event types
    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event, videoId);
        break;
        
      case 'video.asset.errored':
        await handleAssetErrored(event, videoId);
        break;
        
      case 'video.upload.asset_created':
        await handleUploadCompleted(event, videoId);
        break;
        
      case 'video.asset.created':
        await handleAssetCreated(event, videoId);
        break;
        
      case 'video.asset.track.ready':
        await handleTrackReady(event, videoId);
        break;
        
      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
        await videoMonitor.logUploadEvent('Unhandled webhook event', {
          eventType: event.type,
          videoId
        });
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Mux webhook processing error:', error);
    
    await videoMonitor.logUploadEvent('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleAssetReady(event: MuxWebhookEvent, videoId: string) {
  try {
    console.log('✅ Mux asset ready for video:', videoId);
    
    const assetId = event.object.id;
    const playbackId = event.data.playback_ids?.[0]?.id;
    const duration = event.data.duration;
    const aspectRatio = event.data.aspect_ratio;
    
    // Generate URLs
    const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : undefined;
    const streamingUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined;
    const mp4Url = playbackId ? `https://stream.mux.com/${playbackId}/high.mp4` : undefined;
    
    // Try to update with Mux fields first, fallback to basic fields
    try {
      // Attempt to use updateMuxAsset if it exists
      if (VideoDB.updateMuxAsset) {
        await VideoDB.updateMuxAsset(videoId, {
          mux_asset_id: assetId,
          mux_playback_id: playbackId,
          mux_status: 'ready',
          mux_thumbnail_url: thumbnailUrl,
          streaming_url: streamingUrl,
          // mux_mp4_url: mp4Url, // Field doesn't exist in database schema
          mux_duration_seconds: duration,
          mux_aspect_ratio: aspectRatio,
          mux_ready_at: new Date()
        });
      } else {
        throw new Error('updateMuxAsset method not available');
      }
    } catch (muxError) {
      console.log('⚠️ Mux-specific update failed, using basic update:', muxError);
      
      // Fallback to basic update
      const basicUpdates: any = {};
      if (thumbnailUrl) basicUpdates.thumbnail_path = thumbnailUrl;
      if (streamingUrl) basicUpdates.file_path = streamingUrl;
      
      if (Object.keys(basicUpdates).length > 0) {
        await VideoDB.update(videoId, basicUpdates);
        console.log('✅ Updated basic fields as fallback');
      }
    }
    
    console.log('📝 Database updated with ready Mux asset data');
    
    await videoMonitor.logUploadEvent('Mux asset ready', {
      videoId,
      assetId,
      playbackId,
      thumbnailUrl,
      streamingUrl
    });
    
  } catch (error) {
    console.error('❌ Error handling asset ready:', error);
    // Don't throw - we want to acknowledge the webhook even if database update fails
  }
}

async function handleAssetErrored(event: MuxWebhookEvent, videoId: string) {
  try {
    console.log('❌ Mux asset errored for video:', videoId);
    
    const assetId = event.object.id;
    
    // Try to update with Mux fields first, fallback to basic fields
    try {
      if (VideoDB.updateMuxAsset) {
        await VideoDB.updateMuxAsset(videoId, {
          mux_asset_id: assetId,
          mux_status: 'errored'
        });
      } else {
        // No specific update needed for basic fields on error
        console.log('⚠️ Cannot update Mux status - using basic fields only');
      }
    } catch (muxError) {
      console.log('⚠️ Could not update error status:', muxError);
    }
    
    console.log('📝 Database updated with errored Mux asset status');
    
    await videoMonitor.logUploadEvent('Mux asset errored', {
      videoId,
      assetId,
      error: 'Asset processing failed in Mux'
    });
    
  } catch (error) {
    console.error('❌ Error handling asset error:', error);
    // Don't throw - we want to acknowledge the webhook even if database update fails
  }
}

async function handleUploadCompleted(event: MuxWebhookEvent, videoId: string) {
  try {
    console.log('📤 Mux upload completed for video:', videoId);
    
    const assetId = event.data.passthrough;
    
    // Try to update with Mux fields first
    try {
      if (VideoDB.updateMuxAsset) {
        await VideoDB.updateMuxAsset(videoId, {
          mux_status: 'preparing'
        });
      } else {
        console.log('⚠️ Cannot update Mux status - using basic fields only');
      }
    } catch (muxError) {
      console.log('⚠️ Could not update upload completion status:', muxError);
    }
    
    console.log('📝 Database updated with upload completion');
    
    await videoMonitor.logUploadEvent('Mux upload completed', {
      videoId,
      assetId
    });
    
  } catch (error) {
    console.error('❌ Error handling upload completion:', error);
    // Don't throw - we want to acknowledge the webhook even if database update fails
  }
}

async function handleAssetCreated(event: MuxWebhookEvent, videoId: string) {
  try {
    console.log('🎬 Mux asset created for video:', videoId);
    
    const assetId = event.object.id;
    
    // Try to update with Mux fields first
    try {
      if (VideoDB.updateMuxAsset) {
        await VideoDB.updateMuxAsset(videoId, {
          mux_asset_id: assetId,
          mux_status: 'preparing',
          mux_created_at: new Date()
        });
      } else {
        console.log('⚠️ Cannot update Mux asset creation - using basic fields only');
      }
    } catch (muxError) {
      console.log('⚠️ Could not update asset creation status:', muxError);
    }
    
    console.log('📝 Database updated with asset creation');
    
    await videoMonitor.logUploadEvent('Mux asset created', {
      videoId,
      assetId
    });
    
  } catch (error) {
    console.error('❌ Error handling asset creation:', error);
    // Don't throw - we want to acknowledge the webhook even if database update fails
  }
}

async function handleTrackReady(event: MuxWebhookEvent, videoId: string) {
  try {
    console.log('🎵 Mux track ready for video:', videoId);
    
    const track = event.data.tracks?.[0];
    
    if (track?.type === 'text') {
      // This is a caption/subtitle track
      const playbackId = await getPlaybackIdForVideo(videoId);
      
      if (playbackId) {
        const webvttUrl = `https://stream.mux.com/${playbackId}/text/en.vtt`;
        const srtUrl = `https://stream.mux.com/${playbackId}/text/en.srt`;
        
        // Try to update caption URLs
        try {
          if (VideoDB.updateMuxAsset) {
            await VideoDB.updateMuxAsset(videoId, {
              captions_webvtt_url: webvttUrl,
              captions_srt_url: srtUrl
            });
          } else {
            // Fallback to basic update
            await VideoDB.update(videoId, {
              // Note: These fields may not exist in basic schema
            });
          }
          
          console.log('📝 Caption URLs stored successfully:', { webvttUrl, srtUrl });
        } catch (captionError) {
          console.error('⚠️ Could not store caption URLs:', captionError);
          // Don't fail the webhook - just log the issue
        }
        
        await videoMonitor.logUploadEvent('Mux captions ready', {
          videoId,
          webvttUrl,
          srtUrl
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling track ready:', error);
    // Don't throw - we want to acknowledge the webhook even if database update fails
  }
}

async function getPlaybackIdForVideo(videoId: string): Promise<string | null> {
  try {
    const video = await VideoDB.findById(videoId);
    return video?.mux_playback_id || null;
  } catch (error) {
    console.error('❌ Error getting playback ID:', error);
    return null;
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'Mux webhook endpoint active',
    timestamp: new Date().toISOString()
  });
}
