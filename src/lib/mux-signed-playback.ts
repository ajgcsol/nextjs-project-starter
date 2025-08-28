import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface MuxSignedPlaybackConfig {
  signingKeyId: string;
  signingKeyPrivate: string;
  playbackRestrictions?: {
    referrerDomain?: string[];
    userAgent?: string[];
  };
}

export interface MuxSignedUrlOptions {
  playbackId: string;
  type?: 'video' | 'thumbnail' | 'storyboard' | 'subtitle';
  expirationTime?: number; // in seconds from now
  customData?: Record<string, any>;
}

export interface MuxSubtitleTrack {
  id: string;
  type: 'text';
  text_type: 'subtitles';
  text_source: 'generated_vod' | 'uploaded';
  language_code: string;
  name: string;
  closed_captions?: boolean;
  status: 'preparing' | 'ready' | 'errored';
  url?: string;
}

export class MuxSignedPlayback {
  private signingKeyId: string;
  private signingKeyPrivate: string;
  private playbackRestrictions?: {
    referrerDomain?: string[];
    userAgent?: string[];
  };

  constructor(config: MuxSignedPlaybackConfig) {
    this.signingKeyId = config.signingKeyId;
    
    // Decode base64 private key if needed
    if (config.signingKeyPrivate.includes('BEGIN RSA PRIVATE KEY')) {
      this.signingKeyPrivate = config.signingKeyPrivate;
    } else {
      // Assume it's base64 encoded
      this.signingKeyPrivate = Buffer.from(config.signingKeyPrivate, 'base64').toString('utf-8');
    }
    
    this.playbackRestrictions = config.playbackRestrictions;
    
    console.log('🔐 Mux Signed Playback initialized with key ID:', this.signingKeyId.substring(0, 8) + '...');
  }

  /**
   * Generate a signed JWT token for Mux playback
   */
  generatePlaybackToken(options: MuxSignedUrlOptions): string {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (options.expirationTime || 3600); // Default 1 hour expiration

    const payload: any = {
      sub: options.playbackId,
      aud: this.getAudienceType(options.type || 'video'),
      exp: exp,
      kid: this.signingKeyId
    };

    // Add playback restrictions if configured
    if (this.playbackRestrictions) {
      if (this.playbackRestrictions.referrerDomain) {
        payload.referrer_domain = this.playbackRestrictions.referrerDomain;
      }
      if (this.playbackRestrictions.userAgent) {
        payload.user_agent = this.playbackRestrictions.userAgent;
      }
    }

    // Add custom data if provided
    if (options.customData) {
      payload.custom = options.customData;
    }

    // Sign the token with RS256
    const token = jwt.sign(payload, this.signingKeyPrivate, {
      algorithm: 'RS256'
    });

    console.log('🎫 Generated Mux playback token for:', options.playbackId);
    return token;
  }

  /**
   * Get the audience type for different Mux resources
   */
  private getAudienceType(type: string): string {
    switch (type) {
      case 'video':
        return 'v';
      case 'thumbnail':
        return 't';
      case 'storyboard':
        return 's';
      case 'subtitle':
        return 'st';
      default:
        return 'v';
    }
  }

  /**
   * Generate signed URL for video streaming
   */
  getSignedStreamUrl(playbackId: string, expirationTime?: number): string {
    const token = this.generatePlaybackToken({
      playbackId,
      type: 'video',
      expirationTime
    });
    
    return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
  }

  /**
   * Generate signed URL for thumbnails
   */
  getSignedThumbnailUrl(playbackId: string, options?: {
    time?: number;
    width?: number;
    height?: number;
    expirationTime?: number;
  }): string {
    const token = this.generatePlaybackToken({
      playbackId,
      type: 'thumbnail',
      expirationTime: options?.expirationTime
    });
    
    const params = new URLSearchParams({ token });
    if (options?.time) params.append('time', options.time.toString());
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    
    return `https://image.mux.com/${playbackId}/thumbnail.jpg?${params.toString()}`;
  }

  /**
   * Generate signed URL for subtitles/captions
   */
  getSignedSubtitleUrl(playbackId: string, trackId: string, format: 'vtt' | 'srt' = 'vtt', expirationTime?: number): string {
    const token = this.generatePlaybackToken({
      playbackId,
      type: 'subtitle',
      expirationTime
    });
    
    return `https://stream.mux.com/${playbackId}/text/${trackId}.${format}?token=${token}`;
  }

  /**
   * Generate signed URLs for all available subtitle tracks
   */
  getSignedSubtitleUrls(playbackId: string, tracks: MuxSubtitleTrack[], expirationTime?: number): Array<{
    track: MuxSubtitleTrack;
    vttUrl: string;
    srtUrl: string;
  }> {
    return tracks
      .filter(track => track.type === 'text' && track.status === 'ready')
      .map(track => ({
        track,
        vttUrl: this.getSignedSubtitleUrl(playbackId, track.id, 'vtt', expirationTime),
        srtUrl: this.getSignedSubtitleUrl(playbackId, track.id, 'srt', expirationTime)
      }));
  }

  /**
   * Generate signed MP4 download URL
   */
  getSignedMp4Url(playbackId: string, quality: 'high' | 'medium' | 'low' = 'high', expirationTime?: number): string {
    const token = this.generatePlaybackToken({
      playbackId,
      type: 'video',
      expirationTime
    });
    
    return `https://stream.mux.com/${playbackId}/${quality}.mp4?token=${token}`;
  }

  /**
   * Generate all signed URLs for a video asset
   */
  getAllSignedUrls(playbackId: string, options?: {
    includeSubtitles?: boolean;
    subtitleTracks?: MuxSubtitleTrack[];
    expirationTime?: number;
  }): {
    streaming: string;
    thumbnail: string;
    mp4: {
      high: string;
      medium: string;
      low: string;
    };
    subtitles?: Array<{
      track: MuxSubtitleTrack;
      vttUrl: string;
      srtUrl: string;
    }>;
  } {
    const result: any = {
      streaming: this.getSignedStreamUrl(playbackId, options?.expirationTime),
      thumbnail: this.getSignedThumbnailUrl(playbackId, { time: 10, expirationTime: options?.expirationTime }),
      mp4: {
        high: this.getSignedMp4Url(playbackId, 'high', options?.expirationTime),
        medium: this.getSignedMp4Url(playbackId, 'medium', options?.expirationTime),
        low: this.getSignedMp4Url(playbackId, 'low', options?.expirationTime)
      }
    };

    if (options?.includeSubtitles && options.subtitleTracks) {
      result.subtitles = this.getSignedSubtitleUrls(playbackId, options.subtitleTracks, options.expirationTime);
    }

    console.log('📦 Generated all signed URLs for playback ID:', playbackId);
    return result;
  }

  /**
   * Validate a JWT token (for testing purposes)
   */
  validateToken(token: string): boolean {
    try {
      // Convert private key to public key for verification
      const publicKey = this.extractPublicKey(this.signingKeyPrivate);
      
      jwt.verify(token, publicKey, {
        algorithms: ['RS256']
      });
      
      return true;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return false;
    }
  }

  /**
   * Extract public key from private key
   */
  private extractPublicKey(privateKey: string): string {
    const keyObject = crypto.createPrivateKey(privateKey);
    const publicKey = crypto.createPublicKey(keyObject);
    return publicKey.export({ type: 'spki', format: 'pem' }) as string;
  }
}

/**
 * Factory function to create MuxSignedPlayback from environment variables
 */
export function createMuxSignedPlaybackFromEnv(): MuxSignedPlayback | null {
  const signingKeyId = process.env.MUX_SIGNING_KEY_ID;
  const signingKeyPrivate = process.env.MUX_SIGNING_KEY_PRIVATE;

  if (!signingKeyId || !signingKeyPrivate) {
    console.warn('⚠️ Mux signing key not configured. Signed playback will not be available.');
    return null;
  }

  // Parse playback restrictions from environment if available
  const playbackRestrictions: any = {};
  
  if (process.env.MUX_PLAYBACK_RESTRICTION_DOMAINS) {
    playbackRestrictions.referrerDomain = process.env.MUX_PLAYBACK_RESTRICTION_DOMAINS.split(',').map(d => d.trim());
  }
  
  if (process.env.MUX_PLAYBACK_RESTRICTION_USER_AGENTS) {
    playbackRestrictions.userAgent = process.env.MUX_PLAYBACK_RESTRICTION_USER_AGENTS.split(',').map(ua => ua.trim());
  }

  return new MuxSignedPlayback({
    signingKeyId,
    signingKeyPrivate,
    playbackRestrictions: Object.keys(playbackRestrictions).length > 0 ? playbackRestrictions : undefined
  });
}

export default MuxSignedPlayback;