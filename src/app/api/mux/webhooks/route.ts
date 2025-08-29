import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { VideoDB } from '@/lib/database';
import { SimpleMuxProcessor } from '@/lib/simple-mux-processor';

// Simple webhook handler for Mux events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, object } = body;
    
    console.log('🎬 Mux webhook received:', {
      type,
      assetId: data?.id,
      status: data?.status
    });

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const signature = headersList.get('mux-signature');
      if (!signature) {
        console.warn('⚠️ Missing Mux signature in production');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
      }
      // TODO: Verify signature with MUX_WEBHOOK_SECRET
    }

    // Handle different webhook events
    switch (type) {
      case 'video.asset.ready':
        return await handleAssetReady(data);
      
      case 'video.asset.errored':
        return await handleAssetError(data);
        
      case 'video.asset.created':
        return await handleAssetCreated(data);
        
      default:
        console.log('🔄 Unhandled webhook type:', type);
        return NextResponse.json({ received: true });
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleAssetReady(data: any) {
  try {
    console.log('✅ Asset ready:', data.id);
    
    // Find video by passthrough (videoId)
    const videoId = data.passthrough;
    if (!videoId) {
      console.warn('⚠️ No passthrough videoId in webhook');
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    const video = await VideoDB.findById(videoId);
    if (!video) {
      console.warn('⚠️ Video not found for webhook:', videoId);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const playbackId = data.playback_ids?.[0]?.id;
    const duration = data.duration;
    const aspectRatio = data.aspect_ratio;

    // Generate subtitle URLs
    const subtitleUrls = playbackId ? SimpleMuxProcessor.getSubtitleUrls(playbackId, 'en') : null;
    const thumbnailUrls = playbackId ? SimpleMuxProcessor.getThumbnailUrls(playbackId, 10) : null;

    // Update video with Mux data and subtitle URLs
    await VideoDB.update(videoId, {
      mux_asset_id: data.id,
      mux_playback_id: playbackId,
      mux_status: 'ready',
      mux_duration_seconds: duration,
      mux_aspect_ratio: aspectRatio,
      mux_ready_at: new Date(),
      // Update subtitle URLs
      captions_webvtt_url: subtitleUrls?.vtt,
      captions_srt_url: subtitleUrls?.srt,
      // Update thumbnail URL
      mux_thumbnail_url: thumbnailUrls?.default,
      thumbnail_url: thumbnailUrls?.default,
      // Mark as processed
      is_processed: true
    });

    console.log('🎬 ✅ Video updated with Mux data and subtitles:', {
      videoId,
      assetId: data.id,
      playbackId,
      subtitles: {
        vtt: subtitleUrls?.vtt,
        srt: subtitleUrls?.srt
      },
      thumbnail: thumbnailUrls?.default
    });

    return NextResponse.json({ 
      success: true,
      message: 'Video updated with Mux data and subtitles',
      videoId,
      subtitlesReady: !!subtitleUrls
    });

  } catch (error) {
    console.error('❌ Asset ready handler error:', error);
    return NextResponse.json({ 
      error: 'Asset ready handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleAssetError(data: any) {
  try {
    console.log('❌ Asset errored:', data.id);
    
    const videoId = data.passthrough;
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    await VideoDB.update(videoId, {
      mux_asset_id: data.id,
      mux_status: 'errored',
      processing_status: 'failed'
    });

    return NextResponse.json({ success: true, message: 'Video marked as errored' });

  } catch (error) {
    console.error('❌ Asset error handler error:', error);
    return NextResponse.json({ 
      error: 'Asset error handler failed' 
    }, { status: 500 });
  }
}

async function handleAssetCreated(data: any) {
  try {
    console.log('🔄 Asset created:', data.id);
    
    const videoId = data.passthrough;
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    await VideoDB.update(videoId, {
      mux_asset_id: data.id,
      mux_status: 'processing',
      mux_created_at: new Date()
    });

    return NextResponse.json({ success: true, message: 'Video marked as processing' });

  } catch (error) {
    console.error('❌ Asset created handler error:', error);
    return NextResponse.json({ 
      error: 'Asset created handler failed' 
    }, { status: 500 });
  }
}

// Allow Mux to POST to this endpoint
export const runtime = 'nodejs';