import crypto from 'crypto';
import { VideoDB } from '@/lib/database';

export interface MuxWebhookPayload {
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
    tracks?: Array<{ type: string; id: string }>;
    master_access?: string;
    mp4_support?: string;
    test?: boolean;
  };
}

export interface WebhookProcessingResult {
  success: boolean;
  action: string;
  videoId?: string;
  assetId?: string;
  playbackId?: string;
  status?: string;
  error?: string;
  processingTime: number;
}

export class MuxWebhookHandler {
  private static readonly WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

  /**
   * Verify Mux webhook signature
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string
  ): boolean {
    if (!this.WEBHOOK_SECRET) {
      console.error('❌ MUX_WEBHOOK_SECRET not configured');
      return false;
    }

    try {
      // Mux webhook signature format: t=timestamp,v1=signature
      const elements = signature.split(',');
      const timestampElement = elements.find(el => el.startsWith('t='));
      const signatureElement = elements.find(el => el.startsWith('v1='));

      if (!timestampElement || !signatureElement) {
        console.error('❌ Invalid webhook signature format');
        return false;
      }

      const webhookTimestamp = timestampElement.split('=')[1];
      const webhookSignature = signatureElement.split('=')[1];

      // Check timestamp (prevent replay attacks)
      const currentTime = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(webhookTimestamp);
      const timeDifference = Math.abs(currentTime - webhookTime);

      if (timeDifference > 300) { // 5 minutes tolerance
        console.error('❌ Webhook timestamp too old:', timeDifference, 'seconds');
        return false;
      }

      // Verify signature
      const payload = `${webhookTimestamp}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(webhookSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        console.error('❌ Webhook signature verification failed');
        return false;
      }

      console.log('✅ Webhook signature verified successfully');
      return true;

    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process Mux webhook event
   */
  static async processWebhookEvent(payload: MuxWebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    console.log('🔔 Processing Mux webhook event:', payload.type);

    try {
      const { type, object, data } = payload;
      const assetId = object.id;
      const videoId = data.passthrough;

      console.log('📋 Webhook details:', {
        type,
        assetId,
        videoId,
        status: data.status
      });

      switch (type) {
        case 'video.asset.created':
          return await this.handleAssetCreated(assetId, videoId, data, startTime);

        case 'video.asset.ready':
          return await this.handleAssetReady(assetId, videoId, data, startTime);

        case 'video.asset.errored':
          return await this.handleAssetErrored(assetId, videoId, data, startTime);

        case 'video.upload.asset_created':
          return await this.handleUploadCompleted(assetId, videoId, data, startTime);

        case 'video.asset.updated':
          return await this.handleAssetUpdated(assetId, videoId, data, startTime);

        default:
          console.log('ℹ️ Unhandled webhook event type:', type);
          return {
            success: true,
            action: 'unhandled',
            processingTime: Date.now() - startTime
          };
      }

    } catch (error) {
      console.error('❌ Error processing webhook event:', error);
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Handle asset created event
   */
  private static async handleAssetCreated(
    assetId: string,
    videoId: string | undefined,
    data: any,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    console.log('🎬 Handling asset created event:', assetId);

    if (!videoId) {
      console.log('⚠️ No video ID in passthrough, skipping database update');
      return {
        success: true,
        action: 'asset_created_no_video_id',
        assetId,
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Update video record with initial Mux data
      const updateData = {
        mux_asset_id: assetId,
        mux_status: 'preparing',
        mux_created_at: new Date()
      };

      const updatedVideo = await VideoDB.updateMuxAsset(videoId, updateData);

      if (updatedVideo) {
        console.log('✅ Video updated with Mux asset creation');
        return {
          success: true,
          action: 'asset_created',
          videoId,
          assetId,
          status: 'preparing',
          processingTime: Date.now() - startTime
        };
      } else {
        console.log('⚠️ Video not found for asset creation update');
        return {
          success: false,
          action: 'asset_created_video_not_found',
          videoId,
          assetId,
          error: 'Video not found in database',
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      console.error('❌ Error handling asset created:', error);
      return {
        success: false,
        action: 'asset_created_error',
        videoId,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Handle asset ready event
   */
  private static async handleAssetReady(
    assetId: string,
    videoId: string | undefined,
    data: any,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    console.log('✅ Handling asset ready event:', assetId);

    if (!videoId) {
      console.log('⚠️ No video ID in passthrough, skipping database update');
      return {
        success: true,
        action: 'asset_ready_no_video_id',
        assetId,
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Extract playback ID and other data
      const playbackId = data.playback_ids?.[0]?.id;
      const duration = data.duration;
      const aspectRatio = data.aspect_ratio;

      console.log('📊 Asset ready data:', {
        playbackId,
        duration,
        aspectRatio
      });

      // Generate URLs
      const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : undefined;
      const streamingUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined;
      const mp4Url = data.mp4_support !== 'none' && playbackId ? 
        `https://stream.mux.com/${playbackId}/high.mp4` : undefined;

      // Update video record with complete Mux data
      const updateData = {
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        mux_status: 'ready',
        mux_thumbnail_url: thumbnailUrl,
        streaming_url: streamingUrl,
        mp4_url: mp4Url,
        mux_duration_seconds: duration,
        mux_aspect_ratio: aspectRatio,
        mux_ready_at: new Date(),
        thumbnail_url: thumbnailUrl // Also update the main thumbnail field
      };

      const updatedVideo = await VideoDB.updateMuxAsset(videoId, updateData);

      if (updatedVideo) {
        console.log('🎉 Video updated with complete Mux asset data');
        
        // Log successful thumbnail generation
        if (thumbnailUrl) {
          console.log('🖼️ Thumbnail URL generated:', thumbnailUrl);
        }

        // Trigger AWS Transcribe for speaker diarization after Mux processing completes
        this.triggerAWSTranscribe(videoId).catch(error => {
          console.error('❌ Failed to trigger AWS Transcribe:', error);
        });

        return {
          success: true,
          action: 'asset_ready',
          videoId,
          assetId,
          playbackId,
          status: 'ready',
          processingTime: Date.now() - startTime
        };
      } else {
        console.log('⚠️ Video not found for asset ready update');
        return {
          success: false,
          action: 'asset_ready_video_not_found',
          videoId,
          assetId,
          error: 'Video not found in database',
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      console.error('❌ Error handling asset ready:', error);
      return {
        success: false,
        action: 'asset_ready_error',
        videoId,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Handle asset errored event
   */
  private static async handleAssetErrored(
    assetId: string,
    videoId: string | undefined,
    data: any,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    console.log('❌ Handling asset errored event:', assetId);

    if (!videoId) {
      console.log('⚠️ No video ID in passthrough, skipping database update');
      return {
        success: true,
        action: 'asset_errored_no_video_id',
        assetId,
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Update video record with error status
      const updateData = {
        mux_asset_id: assetId,
        mux_status: 'errored'
      };

      const updatedVideo = await VideoDB.updateMuxAsset(videoId, updateData);

      if (updatedVideo) {
        console.log('⚠️ Video updated with Mux error status');
        return {
          success: true,
          action: 'asset_errored',
          videoId,
          assetId,
          status: 'errored',
          processingTime: Date.now() - startTime
        };
      } else {
        console.log('⚠️ Video not found for asset error update');
        return {
          success: false,
          action: 'asset_errored_video_not_found',
          videoId,
          assetId,
          error: 'Video not found in database',
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      console.error('❌ Error handling asset errored:', error);
      return {
        success: false,
        action: 'asset_errored_error',
        videoId,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Handle upload completed event
   */
  private static async handleUploadCompleted(
    uploadId: string,
    videoId: string | undefined,
    data: any,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    console.log('📤 Handling upload completed event:', uploadId);

    const assetId = data.asset_id;

    if (!videoId || !assetId) {
      console.log('⚠️ Missing video ID or asset ID, skipping database update');
      return {
        success: true,
        action: 'upload_completed_missing_ids',
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Update video record with upload completion
      const updateData = {
        mux_asset_id: assetId,
        mux_upload_id: uploadId,
        mux_status: 'preparing'
      };

      const updatedVideo = await VideoDB.updateMuxAsset(videoId, updateData);

      if (updatedVideo) {
        console.log('✅ Video updated with upload completion');
        return {
          success: true,
          action: 'upload_completed',
          videoId,
          assetId,
          status: 'preparing',
          processingTime: Date.now() - startTime
        };
      } else {
        console.log('⚠️ Video not found for upload completion update');
        return {
          success: false,
          action: 'upload_completed_video_not_found',
          videoId,
          assetId,
          error: 'Video not found in database',
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      console.error('❌ Error handling upload completed:', error);
      return {
        success: false,
        action: 'upload_completed_error',
        videoId,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Handle asset updated event
   */
  private static async handleAssetUpdated(
    assetId: string,
    videoId: string | undefined,
    data: any,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    console.log('🔄 Handling asset updated event:', assetId);

    if (!videoId) {
      console.log('⚠️ No video ID in passthrough, skipping database update');
      return {
        success: true,
        action: 'asset_updated_no_video_id',
        assetId,
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Update video record with latest data
      const playbackId = data.playback_ids?.[0]?.id;
      const duration = data.duration;
      const aspectRatio = data.aspect_ratio;
      const status = data.status || 'preparing';

      const updateData: any = {
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        mux_status: status,
        mux_duration_seconds: duration,
        mux_aspect_ratio: aspectRatio
      };

      // Add URLs if playback ID is available
      if (playbackId) {
        updateData.mux_thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`;
        updateData.streaming_url = `https://stream.mux.com/${playbackId}.m3u8`;
        updateData.thumbnail_url = updateData.mux_thumbnail_url;
      }

      const updatedVideo = await VideoDB.updateMuxAsset(videoId, updateData);

      if (updatedVideo) {
        console.log('✅ Video updated with asset changes');
        return {
          success: true,
          action: 'asset_updated',
          videoId,
          assetId,
          playbackId,
          status,
          processingTime: Date.now() - startTime
        };
      } else {
        console.log('⚠️ Video not found for asset update');
        return {
          success: false,
          action: 'asset_updated_video_not_found',
          videoId,
          assetId,
          error: 'Video not found in database',
          processingTime: Date.now() - startTime
        };
      }

    } catch (error) {
      console.error('❌ Error handling asset updated:', error);
      return {
        success: false,
        action: 'asset_updated_error',
        videoId,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Trigger AWS Transcribe for speaker diarization after Mux processing completes
   */
  private static async triggerAWSTranscribe(videoId: string): Promise<void> {
    try {
      console.log('🎤 Triggering AWS Transcribe for video:', videoId);
      
      // Determine the base URL for the API call
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const response = await fetch(`${baseUrl}/api/videos/enhanced-subtitles`, {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`AWS Transcribe API failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ AWS Transcribe job started successfully:', result.jobId);
      
    } catch (error) {
      console.error('❌ Failed to trigger AWS Transcribe for video:', videoId, error);
      
      // Update video record to indicate transcription failed to start
      try {
        await VideoDB.update(videoId, {
          transcript_status: 'failed'
        });
      } catch (dbError) {
        console.error('❌ Failed to update transcript status after AWS Transcribe trigger failure:', dbError);
      }
      
      throw error;
    }
  }

  /**
   * Log webhook event for debugging
   */
  static logWebhookEvent(payload: MuxWebhookPayload, result: WebhookProcessingResult) {
    console.log('📊 Webhook processing summary:', {
      eventType: payload.type,
      assetId: payload.object.id,
      videoId: payload.data.passthrough,
      action: result.action,
      success: result.success,
      processingTime: `${result.processingTime}ms`,
      error: result.error
    });
  }
}

export default MuxWebhookHandler;
