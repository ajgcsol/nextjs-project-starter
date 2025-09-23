import Mux from '@mux/mux-node';

// Simple, clean Mux processor without AWS/OpenAI bullshit
export class SimpleMuxProcessor {
  private static muxClient: Mux | null = null;

  private static getMuxClient() {
    if (this.muxClient) {
      return this.muxClient;
    }

    const tokenId = process.env.MUX_TOKEN_ID || process.env.VIDEO_MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET || process.env.VIDEO_MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      throw new Error('Mux credentials not configured. Set MUX_TOKEN_ID/MUX_TOKEN_SECRET or VIDEO_MUX_TOKEN_ID/VIDEO_MUX_TOKEN_SECRET environment variables.');
    }

    this.muxClient = new Mux({
      tokenId,
      tokenSecret,
    });

    return this.muxClient;
  }
  /**
   * Create Mux asset with automatic subtitle generation
   */
  static async createAssetWithSubtitles(
    videoUrl: string,
    videoId: string,
    options: {
      playbackPolicy?: 'public' | 'signed';
      mp4Support?: boolean;
      generateSubtitles?: boolean;
      subtitleLanguage?: string;
    } = {}
  ) {
    const mux = this.getMuxClient();
    
    console.log('🎬 Creating Mux asset with subtitles for:', videoId);
    
    const assetParams: any = {
      input: [
        {
          url: videoUrl,
          // Enable automatic subtitle generation
          ...(options.generateSubtitles !== false && {
            generated_subtitles: [
              {
                name: 'Auto-generated English',
                language_code: options.subtitleLanguage || 'en'
              }
            ]
          })
        }
      ],
      playback_policy: [options.playbackPolicy || 'public'],
      master_access: 'temporary',
      test: false, // Always false for subtitle generation to work
      passthrough: videoId
    };

    // Add MP4 support if requested
    if (options.mp4Support) {
      assetParams.mp4_support = 'standard';
    }

    console.log('📤 Mux asset creation parameters:', JSON.stringify(assetParams, null, 2));

    try {
      const asset = await mux.video.assets.create(assetParams);
      
      const playbackId = asset.playback_ids?.[0]?.id;
      
      console.log('✅ Mux asset created successfully:', {
        assetId: asset.id,
        playbackId,
        status: asset.status
      });

      return {
        success: true,
        assetId: asset.id,
        playbackId,
        status: asset.status,
        thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10` : undefined,
        streamingUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
        mp4Url: options.mp4Support && playbackId ? `https://stream.mux.com/${playbackId}/high.mp4` : undefined,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio
      };
      
    } catch (error) {
      console.error('❌ Mux asset creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get asset status and subtitle information
   */
  static async getAssetStatus(assetId: string) {
    try {
      const mux = this.getMuxClient();
      const asset = await mux.video.assets.retrieve(assetId);
      
      // Check for subtitle tracks
      const hasSubtitles = asset.tracks?.some(track => track.type === 'text') || false;
      const subtitleTracks = asset.tracks?.filter(track => track.type === 'text') || [];
      
      console.log('📊 Asset status:', {
        id: assetId,
        status: asset.status,
        hasSubtitles,
        subtitleCount: subtitleTracks.length,
        playbackId: asset.playback_ids?.[0]?.id
      });

      return {
        success: true,
        status: asset.status,
        playbackId: asset.playback_ids?.[0]?.id,
        hasSubtitles,
        subtitleTracks,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        thumbnailUrl: asset.playback_ids?.[0]?.id 
          ? `https://image.mux.com/${asset.playback_ids[0].id}/thumbnail.jpg?time=10` 
          : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get asset status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get subtitle URLs for a playback ID
   */
  static getSubtitleUrls(playbackId: string, language: string = 'en') {
    return {
      vtt: `https://stream.mux.com/${playbackId}/text/${language}.vtt`,
      srt: `https://stream.mux.com/${playbackId}/text/${language}.srt`
    };
  }

  /**
   * Generate different thumbnail sizes
   */
  static getThumbnailUrls(playbackId: string, timestamp: number = 10) {
    const base = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timestamp}`;
    return {
      default: base,
      small: `${base}&width=320`,
      medium: `${base}&width=640`, 
      large: `${base}&width=1280`,
      animated: `https://image.mux.com/${playbackId}/animated.gif?start=${timestamp}&end=${timestamp + 3}`
    };
  }
}

export default SimpleMuxProcessor;
