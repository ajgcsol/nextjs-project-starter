import { VideoDB } from '@/lib/database';

export interface MuxWebhookEvent {
  type: string;
  object: {
    type: string;
    id: string;
  };
  id: string;
  created_at: string;
  data: any;
}

export interface WebhookProcessingResult {
  success: boolean;
  action: string;
  videoId?: string;
  assetId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export class MuxWebhookHandler {
  /**
   * Process incoming Mux webhook events
   */
  static async processWebhookEvent(event: MuxWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      console.log('🔔 Processing Mux webhook event:', event.type);
      console.log('📋 Event data:', {
        id: event.id,
        type: event.type,
        objectId: event.object.id,
        createdAt: event.created_at
      });

      const { type, object, data } = event;
      
      switch (type) {
        case 'video.asset.ready':
          return await this.handleAssetReady(object.id, data);
          
        case 'video.asset.errored':
          return await this.handleAssetErrored(object.id, data);
          
        case 'video.upload.asset_created':
          return await this.handleUploadCompleted(object.id, data);
          
        case 'video.asset.created':
          return await this.handleAssetCreated(object.id, data);
          
        case 'video.asset.updated':
          return await this.handleAssetUpdated(object.id, data);
          
        case 'video.asset.deleted':
          return await this.handleAssetDeleted(object.id, data);
          
        default:
          console.log('ℹ️ Unhandled Mux webhook event:', type);
          return {
            success: true,
            action: 'unhandled',
            message: `Unhandled event type: ${type}`
          };
      }
      
    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      
      return {
        success: false,
        action: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle asset ready event - update database with final URLs and metadata
   */
  private static async handleAssetReady(assetId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('✅ Mux asset is ready:', assetId);
      
      // Find video by Mux asset ID
      const video = await VideoDB.findByMuxAssetId(assetId);
      
      if (!video) {
        console.log('⚠️ No video found for Mux asset:', assetId);
        return {
          success: false,
          action: 'asset_ready',
          assetId,
          error: 'Video not found in database'
        };
      }

      console.log('📹 Found video for asset:', video.id);

      // Extract asset information
      const playbackId = data.playback_ids?.[0]?.id;
      const duration = data.duration;
      const aspectRatio = data.aspect_ratio;

      // Generate URLs
      const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : null;
      const streamingUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;
      const mp4Url = playbackId ? `https://stream.mux.com/${playbackId}/high.mp4` : null;

      // Update video record using the proper Mux update method
      const updateData: any = {
        mux_status: 'ready',
        mux_ready_at: new Date(),
        mux_duration_seconds: duration,
        mux_aspect_ratio: aspectRatio
      };

      if (playbackId) {
        updateData.mux_playback_id = playbackId;
      }

      if (thumbnailUrl) {
        updateData.mux_thumbnail_url = thumbnailUrl;
        updateData.thumbnail_url = thumbnailUrl; // For fallback
      }

      if (streamingUrl) {
        updateData.mux_streaming_url = streamingUrl;
      }

      if (mp4Url) {
        updateData.mux_mp4_url = mp4Url;
      }

      // Update the video record using the Mux-aware update method
      await VideoDB.updateMuxAsset(video.id, updateData);

      console.log('✅ Video updated with Mux asset ready data:', {
        videoId: video.id,
        assetId,
        playbackId,
        thumbnailUrl,
        streamingUrl
      });

      // Trigger transcription if enabled
      if (playbackId) {
        this.triggerTranscriptionGeneration(video.id, assetId, playbackId).catch(error => {
          console.error('⚠️ Transcription trigger failed:', error);
        });
      }

      return {
        success: true,
        action: 'asset_ready',
        videoId: video.id,
        assetId,
        status: 'ready',
        message: 'Video updated with Mux asset ready data'
      };

    } catch (error) {
      console.error('❌ Failed to handle asset ready:', error);
      return {
        success: false,
        action: 'asset_ready',
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle asset errored event
   */
  private static async handleAssetErrored(assetId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('❌ Mux asset errored:', assetId);
      
      // Find video by Mux asset ID
      const video = await VideoDB.findByMuxAssetId(assetId);
      
      if (!video) {
        console.log('⚠️ No video found for errored Mux asset:', assetId);
        return {
          success: false,
          action: 'asset_errored',
          assetId,
          error: 'Video not found in database'
        };
      }

      // Extract error information
      const errors = data.errors || [];
      const errorMessage = Array.isArray(errors) ? 
        errors.map((e: any) => e.messages?.join(', ')).join('; ') :
        'Asset processing failed';

      // Update video record using Mux-aware method
      await VideoDB.updateMuxAsset(video.id, {
        mux_status: 'errored'
      });

      console.log('❌ Video updated with error status:', {
        videoId: video.id,
        assetId,
        errorMessage
      });

      return {
        success: true,
        action: 'asset_errored',
        videoId: video.id,
        assetId,
        status: 'errored',
        message: `Asset processing failed: ${errorMessage}`
      };

    } catch (error) {
      console.error('❌ Failed to handle asset errored:', error);
      return {
        success: false,
        action: 'asset_errored',
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle upload completed event
   */
  private static async handleUploadCompleted(uploadId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('📤 Mux upload completed:', uploadId);
      
      const assetId = data.asset_id;
      const passthrough = data.passthrough;

      if (!assetId) {
        return {
          success: false,
          action: 'upload_completed',
          error: 'No asset ID in upload completed event'
        };
      }

      // Find video by passthrough (video ID) or upload ID
      let video = null;
      if (passthrough) {
        video = await VideoDB.findById(passthrough);
      }

      if (!video) {
        console.log('⚠️ No video found for upload:', uploadId);
        return {
          success: false,
          action: 'upload_completed',
          error: 'Video not found in database'
        };
      }

      // Update video with asset ID using Mux-aware method
      await VideoDB.updateMuxAsset(video.id, {
        mux_asset_id: assetId,
        mux_upload_id: uploadId,
        mux_status: 'preparing'
      });

      console.log('✅ Video updated with upload completion:', {
        videoId: video.id,
        uploadId,
        assetId
      });

      return {
        success: true,
        action: 'upload_completed',
        videoId: video.id,
        assetId,
        status: 'preparing',
        message: 'Upload completed, asset processing started'
      };

    } catch (error) {
      console.error('❌ Failed to handle upload completed:', error);
      return {
        success: false,
        action: 'upload_completed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle asset created event
   */
  private static async handleAssetCreated(assetId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('🎬 Mux asset created:', assetId);
      
      const passthrough = data.passthrough;
      
      if (!passthrough) {
        return {
          success: true,
          action: 'asset_created',
          assetId,
          message: 'Asset created but no passthrough data'
        };
      }

      // Find video by passthrough (video ID)
      const video = await VideoDB.findById(passthrough);
      
      if (!video) {
        console.log('⚠️ No video found for asset:', assetId);
        return {
          success: false,
          action: 'asset_created',
          assetId,
          error: 'Video not found in database'
        };
      }

      // Update video with asset creation info using Mux-aware method
      await VideoDB.updateMuxAsset(video.id, {
        mux_asset_id: assetId,
        mux_status: 'preparing',
        mux_created_at: new Date()
      });

      console.log('✅ Video updated with asset creation:', {
        videoId: video.id,
        assetId
      });

      return {
        success: true,
        action: 'asset_created',
        videoId: video.id,
        assetId,
        status: 'preparing',
        message: 'Asset created and linked to video'
      };

    } catch (error) {
      console.error('❌ Failed to handle asset created:', error);
      return {
        success: false,
        action: 'asset_created',
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle asset updated event
   */
  private static async handleAssetUpdated(assetId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('🔄 Mux asset updated:', assetId);
      
      // Find video by Mux asset ID
      const video = await VideoDB.findByMuxAssetId(assetId);
      
      if (!video) {
        return {
          success: true,
          action: 'asset_updated',
          assetId,
          message: 'Asset updated but no corresponding video found'
        };
      }

      // Update relevant fields if they've changed
      const updateData: any = {};
      
      if (data.duration && data.duration !== video.mux_duration_seconds) {
        updateData.mux_duration_seconds = data.duration;
      }
      
      if (data.aspect_ratio && data.aspect_ratio !== video.mux_aspect_ratio) {
        updateData.mux_aspect_ratio = data.aspect_ratio;
      }

      if (Object.keys(updateData).length > 0) {
        await VideoDB.updateMuxAsset(video.id, updateData);
        console.log('✅ Video updated with asset changes:', updateData);
      }

      return {
        success: true,
        action: 'asset_updated',
        videoId: video.id,
        assetId,
        message: 'Asset updated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to handle asset updated:', error);
      return {
        success: false,
        action: 'asset_updated',
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle asset deleted event
   */
  private static async handleAssetDeleted(assetId: string, data: any): Promise<WebhookProcessingResult> {
    try {
      console.log('🗑️ Mux asset deleted:', assetId);
      
      // Find video by Mux asset ID
      const video = await VideoDB.findByMuxAssetId(assetId);
      
      if (!video) {
        return {
          success: true,
          action: 'asset_deleted',
          assetId,
          message: 'Asset deleted but no corresponding video found'
        };
      }

      // Clear Mux-related fields using Mux-aware method
      await VideoDB.updateMuxAsset(video.id, {
        mux_asset_id: undefined,
        mux_playback_id: undefined,
        mux_status: undefined,
        mux_thumbnail_url: undefined,
        streaming_url: undefined,
        mp4_url: undefined
      });

      console.log('✅ Video cleared of Mux data after asset deletion:', video.id);

      return {
        success: true,
        action: 'asset_deleted',
        videoId: video.id,
        assetId,
        message: 'Video cleared of Mux data'
      };

    } catch (error) {
      console.error('❌ Failed to handle asset deleted:', error);
      return {
        success: false,
        action: 'asset_deleted',
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Trigger transcription generation for ready assets
   */
  private static async triggerTranscriptionGeneration(
    videoId: string, 
    assetId: string, 
    playbackId: string
  ): Promise<void> {
    try {
      console.log('📝 Triggering transcription generation for:', videoId);
      
      // This would integrate with your transcription service
      // For now, we'll just log that it would be triggered
      
      const transcriptionData = {
        videoId,
        assetId,
        playbackId,
        language: 'en',
        status: 'pending'
      };

      // In a real implementation, you would:
      // 1. Create a transcription job record
      // 2. Trigger the actual transcription service
      // 3. Update the video record when transcription completes

      console.log('📝 Transcription job would be created:', transcriptionData);
      
      // Update video to indicate transcription is in progress
      await VideoDB.update(videoId, {
        // transcription_job_id: `transcription_${videoId}_${Date.now()}` // Field doesn't exist in database schema
      });

    } catch (error) {
      console.error('❌ Failed to trigger transcription:', error);
    }
  }

  /**
   * Verify webhook signature (for security)
   */
  static verifyWebhookSignature(
    payload: string, 
    signature: string, 
    secret: string
  ): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Log webhook event for debugging
   */
  static async logWebhookEvent(event: MuxWebhookEvent, result: WebhookProcessingResult): Promise<void> {
    try {
      // In a real implementation, you might want to store webhook events in the database
      // for debugging and audit purposes
      
      console.log('📋 Webhook Event Log:', {
        eventId: event.id,
        eventType: event.type,
        objectId: event.object.id,
        processingResult: result,
        timestamp: new Date().toISOString()
      });

      // You could also store this in a webhook_events table:
      // await VideoDB.createWebhookEvent({
      //   event_id: event.id,
      //   event_type: event.type,
      //   object_id: event.object.id,
      //   event_data: event.data,
      //   processing_result: result,
      //   created_at: new Date()
      // });

    } catch (error) {
      console.error('❌ Failed to log webhook event:', error);
    }
  }
}

export default MuxWebhookHandler;
