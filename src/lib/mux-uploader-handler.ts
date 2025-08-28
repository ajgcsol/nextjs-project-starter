import Mux from '@mux/mux-node';

export interface MuxUploaderConfig {
  corsOrigin: string;
  videoId: string;
  generateSubtitles?: boolean;
  subtitleLanguage?: string;
  playbackPolicy?: 'public' | 'signed';
  mp4Support?: 'none' | 'standard' | 'high';
  maxResolution?: '1080p' | '1440p' | '2160p';
  normalizeAudio?: boolean;
  passthrough?: string;
}

export interface MuxDirectUploadResult {
  success: boolean;
  uploadId?: string;
  uploadUrl?: string;
  assetId?: string;
  error?: string;
}

export interface MuxUploadStatus {
  success: boolean;
  status: 'waiting_for_upload' | 'asset_created' | 'preparing' | 'ready' | 'errored';
  assetId?: string;
  playbackId?: string;
  uploadProgress?: number;
  error?: string;
}

export class MuxUploaderHandler {
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
   * Create a direct upload for Mux Uploader with subtitle generation
   */
  static async createDirectUpload(config: MuxUploaderConfig): Promise<MuxDirectUploadResult> {
    try {
      console.log('📤 Creating Mux direct upload with subtitles for video:', config.videoId);
      
      const mux = this.getMuxClient();

      // Build asset settings with subtitle generation
      const assetSettings: any = {
        playback_policy: [config.playbackPolicy || 'public'],
        normalize_audio: config.normalizeAudio !== false,
        passthrough: config.passthrough || config.videoId,
        test: process.env.NODE_ENV !== 'production'
      };

      // Add MP4 support if specified
      if (config.mp4Support && config.mp4Support !== 'none') {
        assetSettings.mp4_support = config.mp4Support;
      }

      // Add max resolution if specified
      if (config.maxResolution) {
        assetSettings.max_resolution_tier = config.maxResolution;
      }

      const uploadParams: any = {
        new_asset_settings: assetSettings,
        cors_origin: config.corsOrigin,
        timeout: 3600 // 1 hour timeout
      };

      // Add subtitle generation to the input settings
      if (config.generateSubtitles !== false) {
        // For direct uploads, we need to add generated_subtitles to new_asset_settings
        // However, subtitles are actually configured on the input level
        // We'll add this as metadata that gets processed later
        uploadParams.new_asset_settings.generated_subtitles = [{
          name: `${config.subtitleLanguage || 'English'} (Auto-generated)`,
          language_code: config.subtitleLanguage || 'en',
          passthrough: `${config.videoId}_subtitles`
        }];
        
        console.log('📝 Configured automatic subtitle generation for:', config.subtitleLanguage || 'en');
      }

      console.log('📤 Creating Mux direct upload with params:', JSON.stringify(uploadParams, null, 2));

      const upload = await mux.video.uploads.create(uploadParams);
      
      console.log('✅ Mux direct upload created successfully:', {
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id,
        status: upload.status
      });
      
      return {
        success: true,
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id
      };
      
    } catch (error) {
      console.error('❌ Failed to create Mux direct upload:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating direct upload'
      };
    }
  }

  /**
   * Get upload status and asset information
   */
  static async getUploadStatus(uploadId: string): Promise<MuxUploadStatus> {
    try {
      console.log('🔍 Checking Mux upload status:', uploadId);
      
      const mux = this.getMuxClient();
      const upload = await mux.video.uploads.retrieve(uploadId);
      
      console.log('📊 Upload status details:', {
        uploadId,
        status: upload.status,
        assetId: upload.asset_id,
        error: upload.error
      });

      // Map Mux upload status to our status
      let mappedStatus: MuxUploadStatus['status'];
      switch (upload.status) {
        case 'waiting':
          mappedStatus = 'waiting_for_upload';
          break;
        case 'asset_created':
          mappedStatus = 'asset_created';
          break;
        case 'uploading':
          mappedStatus = 'asset_created'; // Still uploading
          break;
        case 'cancelled':
        case 'errored':
          mappedStatus = 'errored';
          break;
        default:
          mappedStatus = 'waiting_for_upload';
      }

      const result: MuxUploadStatus = {
        success: true,
        status: mappedStatus,
        assetId: upload.asset_id
      };

      // If upload errored, include error message
      if (upload.status === 'errored' && upload.error) {
        result.error = upload.error.message || 'Upload failed';
      }

      // If we have an asset ID, get asset status
      if (upload.asset_id) {
        try {
          const asset = await mux.video.assets.retrieve(upload.asset_id);
          result.playbackId = asset.playback_ids?.[0]?.id;
          
          // Update status based on asset status
          if (asset.status === 'preparing') {
            result.status = 'preparing';
          } else if (asset.status === 'ready') {
            result.status = 'ready';
          } else if (asset.status === 'errored') {
            result.status = 'errored';
            if (asset.errors && asset.errors.length > 0) {
              result.error = asset.errors.map((e: any) => e.messages?.join(', ')).join('; ');
            }
          }
          
          console.log('📹 Asset status:', {
            assetId: upload.asset_id,
            assetStatus: asset.status,
            playbackId: result.playbackId
          });
          
        } catch (assetError) {
          console.warn('⚠️ Could not fetch asset status:', assetError);
        }
      }

      return result;
      
    } catch (error) {
      console.error('❌ Failed to get upload status:', error);
      
      return {
        success: false,
        status: 'errored',
        error: error instanceof Error ? error.message : 'Unknown error getting upload status'
      };
    }
  }

  /**
   * Generate subtitles for an existing asset (retroactive)
   */
  static async generateSubtitlesForAsset(
    assetId: string, 
    options: {
      language?: string;
      name?: string;
    } = {}
  ): Promise<{ success: boolean; trackId?: string; error?: string }> {
    try {
      console.log('📝 Generating subtitles for existing asset:', assetId);
      
      const mux = this.getMuxClient();
      
      // First get the asset to find audio track
      const asset = await mux.video.assets.retrieve(assetId);
      
      if (!asset.tracks || asset.tracks.length === 0) {
        throw new Error('No tracks found for asset');
      }

      // Find the audio track
      const audioTrack = asset.tracks.find(track => track.type === 'audio');
      if (!audioTrack) {
        throw new Error('No audio track found for subtitle generation');
      }

      // Generate subtitles using the audio track
      const subtitleRequest = {
        generated_subtitles: [{
          name: options.name || `${options.language || 'English'} (Auto-generated)`,
          language_code: options.language || 'en'
        }]
      };

      console.log('🎤 Requesting subtitle generation for audio track:', audioTrack.id);
      
      const response = await mux.video.assets.tracks.generateSubtitles(assetId, audioTrack.id, subtitleRequest);
      
      console.log('✅ Subtitle generation initiated:', response);
      
      return {
        success: true,
        trackId: response.id
      };
      
    } catch (error) {
      console.error('❌ Failed to generate subtitles for asset:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error generating subtitles'
      };
    }
  }

  /**
   * Check if an asset was created with subtitle generation
   */
  static async hasSubtitleGeneration(assetId: string): Promise<{
    hasSubtitles: boolean;
    subtitleTracks: Array<{
      id: string;
      language: string;
      status: string;
      name: string;
    }>;
  }> {
    try {
      const mux = this.getMuxClient();
      const asset = await mux.video.assets.retrieve(assetId);
      
      const subtitleTracks = asset.tracks?.filter(track => 
        track.type === 'text' && 
        (track.text_source === 'generated_vod' || track.text_type === 'subtitles')
      ) || [];

      return {
        hasSubtitles: subtitleTracks.length > 0,
        subtitleTracks: subtitleTracks.map(track => ({
          id: track.id || '',
          language: track.language_code || 'en',
          status: track.status || 'unknown',
          name: track.name || 'Untitled'
        }))
      };
      
    } catch (error) {
      console.error('❌ Failed to check subtitle generation:', error);
      return {
        hasSubtitles: false,
        subtitleTracks: []
      };
    }
  }

  /**
   * Get comprehensive upload endpoint for frontend
   */
  static async createUploadEndpoint(config: MuxUploaderConfig): Promise<{
    success: boolean;
    endpoint?: string;
    uploadId?: string;
    error?: string;
  }> {
    try {
      const uploadResult = await this.createDirectUpload(config);
      
      if (!uploadResult.success || !uploadResult.uploadUrl) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to create upload URL'
        };
      }

      console.log('🔗 Generated Mux uploader endpoint for video:', config.videoId);

      return {
        success: true,
        endpoint: uploadResult.uploadUrl,
        uploadId: uploadResult.uploadId
      };
      
    } catch (error) {
      console.error('❌ Failed to create upload endpoint:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating upload endpoint'
      };
    }
  }

  /**
   * Get default uploader configuration
   */
  static getDefaultConfig(videoId: string, corsOrigin: string): MuxUploaderConfig {
    return {
      corsOrigin,
      videoId,
      generateSubtitles: true,
      subtitleLanguage: 'en',
      playbackPolicy: 'public',
      mp4Support: 'none',
      maxResolution: '1080p',
      normalizeAudio: true,
      passthrough: videoId
    };
  }

  /**
   * Get high quality configuration with signing
   */
  static getHighQualityConfig(videoId: string, corsOrigin: string): MuxUploaderConfig {
    return {
      corsOrigin,
      videoId,
      generateSubtitles: true,
      subtitleLanguage: 'en',
      playbackPolicy: 'signed',
      mp4Support: 'high',
      maxResolution: '2160p',
      normalizeAudio: true,
      passthrough: videoId
    };
  }
}

export default MuxUploaderHandler;