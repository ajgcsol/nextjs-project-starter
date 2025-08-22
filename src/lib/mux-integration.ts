import Mux from '@mux/mux-node';

export interface MuxThumbnailResult {
  success: boolean;
  thumbnailUrl?: string;
  assetId?: string;
  playbackId?: string;
  method: 'mux';
  error?: string;
}

export class MuxVideoProcessor {
  private static mux: Mux | null = null;

  /**
   * Get Mux client instance
   */
  private static getMuxClient(): Mux {
    if (!this.mux) {
      const tokenId = process.env.VIDEO_MUX_TOKEN_ID;
      const tokenSecret = process.env.VIDEO_MUX_TOKEN_SECRET;

      if (!tokenId || !tokenSecret) {
        throw new Error('Mux credentials not configured. Please set VIDEO_MUX_TOKEN_ID and VIDEO_MUX_TOKEN_SECRET environment variables.');
      }

      this.mux = new Mux({
        tokenId,
        tokenSecret
      });
    }

    return this.mux;
  }

  /**
   * Generate thumbnail using Mux
   */
  static async generateThumbnail(videoS3Key: string, videoId: string, videoRecord?: any): Promise<MuxThumbnailResult> {
    try {
      console.log('🎬 Generating REAL thumbnail with Mux for:', videoS3Key);
      
      const mux = this.getMuxClient();
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${videoS3Key}`;
      
      console.log('📹 Mux asset creation:', {
        videoUrl,
        videoId,
        videoTitle: videoRecord?.title || 'Unknown'
      });

      // Create Mux asset - Fixed for free plan compatibility
      const asset = await mux.video.assets.create({
        inputs: [{ url: videoUrl }],
        playback_policy: ['public'],
        master_access: 'temporary',
        // Removed mp4_support: 'standard' - deprecated for basic/free plan assets
        normalize_audio: true,
        test: process.env.NODE_ENV !== 'production' // Use test mode in development
      });

      console.log('✅ Mux asset created:', {
        assetId: asset.id,
        status: asset.status,
        playbackIds: asset.playback_ids?.length || 0
      });

      // Get playback ID for thumbnail
      const playbackId = asset.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        throw new Error('No playback ID generated for Mux asset');
      }

      // Generate thumbnail URL (Mux automatically generates thumbnails)
      const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`;
      
      console.log('📸 Mux thumbnail URL generated:', thumbnailUrl);

      return {
        success: true,
        thumbnailUrl,
        assetId: asset.id,
        playbackId,
        method: 'mux'
      };

    } catch (error) {
      console.error('❌ Mux thumbnail generation failed:', error);
      
      return {
        success: false,
        method: 'mux',
        error: error instanceof Error ? error.message : 'Unknown Mux error'
      };
    }
  }

  /**
   * Get asset status
   */
  static async getAssetStatus(assetId: string): Promise<any> {
    try {
      const mux = this.getMuxClient();
      const asset = await mux.video.assets.retrieve(assetId);
      return asset;
    } catch (error) {
      console.error('❌ Failed to get Mux asset status:', error);
      throw error;
    }
  }

  /**
   * Test Mux configuration
   */
  static async testConfiguration(): Promise<{
    status: 'success' | 'error';
    message: string;
  }> {
    try {
      const tokenId = process.env.VIDEO_MUX_TOKEN_ID;
      const tokenSecret = process.env.VIDEO_MUX_TOKEN_SECRET;

      if (!tokenId || !tokenSecret) {
        return {
          status: 'error',
          message: 'VIDEO_MUX_TOKEN_ID and VIDEO_MUX_TOKEN_SECRET environment variables are not set'
        };
      }

      // Test connection by listing assets
      const mux = this.getMuxClient();
      await mux.video.assets.list({ limit: 1 });

      return {
        status: 'success',
        message: 'Mux configuration is working'
      };

    } catch (error) {
      return {
        status: 'error',
        message: `Mux configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete Mux asset (cleanup)
   */
  static async deleteAsset(assetId: string): Promise<void> {
    try {
      const mux = this.getMuxClient();
      await mux.video.assets.delete(assetId);
      console.log('✅ Mux asset deleted:', assetId);
    } catch (error) {
      console.error('❌ Failed to delete Mux asset:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL for existing asset
   */
  static getThumbnailUrl(playbackId: string, timeSeconds: number = 10): string {
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timeSeconds}`;
  }

  /**
   * Get video streaming URL for existing asset
   */
  static getStreamingUrl(playbackId: string): string {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }
}

export default MuxVideoProcessor;
