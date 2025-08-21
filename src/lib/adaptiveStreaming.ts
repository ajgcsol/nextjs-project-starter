import { VideoDB } from './database';

export interface StreamingQuality {
  quality: string;
  resolution: string;
  bitrate: number;
  url: string;
  fileSize?: number;
}

export interface AdaptiveStreamingManifest {
  videoId: string;
  title: string;
  duration: number;
  qualities: StreamingQuality[];
  thumbnails: {
    spriteSheet?: string;
    webVtt?: string;
    interval: number;
  };
  defaultQuality: string;
}

export interface HLSManifest {
  version: number;
  targetDuration: number;
  mediaSequence: number;
  segments: Array<{
    duration: number;
    uri: string;
  }>;
}

export class AdaptiveStreamingService {
  private static cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';

  /**
   * Generate adaptive streaming manifest for a video
   */
  static async generateManifest(videoId: string): Promise<AdaptiveStreamingManifest | null> {
    try {
      const video = await VideoDB.findById(videoId);
      if (!video) {
        console.error('Video not found for manifest generation:', videoId);
        return null;
      }

      // Generate quality variants based on original video
      const qualities = this.generateQualityVariants(video);
      
      // Determine optimal default quality based on file size
      const defaultQuality = this.getOptimalDefaultQuality(video.size);

      const manifest: AdaptiveStreamingManifest = {
        videoId: video.id,
        title: video.title,
        duration: video.duration || 0,
        qualities,
        thumbnails: {
          spriteSheet: `https://${this.cloudFrontDomain}/previews/${videoId}-sprite.jpg`,
          webVtt: `https://${this.cloudFrontDomain}/previews/${videoId}-thumbnails.vtt`,
          interval: 10 // 10 second intervals
        },
        defaultQuality
      };

      return manifest;
    } catch (error) {
      console.error('Error generating streaming manifest:', error);
      return null;
    }
  }

  /**
   * Generate quality variants for adaptive streaming
   */
  private static generateQualityVariants(video: any): StreamingQuality[] {
    const baseUrl = `https://${this.cloudFrontDomain}`;
    const qualities: StreamingQuality[] = [];

    // Always include original quality
    qualities.push({
      quality: 'original',
      resolution: this.estimateResolution(video.size),
      bitrate: this.estimateBitrate(video.size, video.duration),
      url: `${baseUrl}/${video.s3_key}`,
      fileSize: video.size
    });

    // Add lower quality variants if original is large enough
    if (video.size > 500 * 1024 * 1024) { // > 500MB
      qualities.push({
        quality: '1080p',
        resolution: '1920x1080',
        bitrate: 5000000, // 5 Mbps
        url: `${baseUrl}/processed/${video.id}/1080p.mp4`
      });
    }

    if (video.size > 200 * 1024 * 1024) { // > 200MB
      qualities.push({
        quality: '720p',
        resolution: '1280x720',
        bitrate: 2500000, // 2.5 Mbps
        url: `${baseUrl}/processed/${video.id}/720p.mp4`
      });
    }

    if (video.size > 100 * 1024 * 1024) { // > 100MB
      qualities.push({
        quality: '480p',
        resolution: '854x480',
        bitrate: 1000000, // 1 Mbps
        url: `${baseUrl}/processed/${video.id}/480p.mp4`
      });
    }

    // Always include a low quality option for slow connections
    qualities.push({
      quality: '360p',
      resolution: '640x360',
      bitrate: 500000, // 500 Kbps
      url: `${baseUrl}/processed/${video.id}/360p.mp4`
    });

    return qualities;
  }

  /**
   * Get optimal quality based on connection and device
   */
  static getOptimalQuality(
    availableQualities: StreamingQuality[],
    connectionSpeed?: number,
    deviceType?: 'mobile' | 'tablet' | 'desktop'
  ): string {
    // Default to original if no optimization criteria
    if (!connectionSpeed && !deviceType) {
      return 'original';
    }

    // Sort qualities by bitrate (highest first)
    const sortedQualities = [...availableQualities].sort((a, b) => b.bitrate - a.bitrate);

    // Device-based optimization
    if (deviceType === 'mobile') {
      // Prefer 720p or lower for mobile
      const mobileOptimal = sortedQualities.find(q => 
        q.quality === '720p' || q.quality === '480p' || q.quality === '360p'
      );
      if (mobileOptimal) return mobileOptimal.quality;
    }

    // Connection speed-based optimization
    if (connectionSpeed) {
      // Find the highest quality that fits the connection speed
      // Leave some headroom (use 80% of available bandwidth)
      const targetBitrate = connectionSpeed * 0.8;
      
      const optimal = sortedQualities.find(q => q.bitrate <= targetBitrate);
      if (optimal) return optimal.quality;
    }

    // Fallback to a reasonable default
    return sortedQualities.find(q => q.quality === '720p')?.quality || 'original';
  }

  /**
   * Generate HLS manifest for a specific quality
   */
  static generateHLSManifest(videoId: string, quality: string, duration: number): HLSManifest {
    const segmentDuration = 10; // 10 second segments
    const segmentCount = Math.ceil(duration / segmentDuration);
    
    const segments = Array.from({ length: segmentCount }, (_, i) => ({
      duration: i === segmentCount - 1 ? duration % segmentDuration || segmentDuration : segmentDuration,
      uri: `${videoId}-${quality}-${i.toString().padStart(3, '0')}.ts`
    }));

    return {
      version: 3,
      targetDuration: segmentDuration,
      mediaSequence: 0,
      segments
    };
  }

  /**
   * Generate master HLS playlist
   */
  static generateMasterPlaylist(manifest: AdaptiveStreamingManifest): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    manifest.qualities.forEach(quality => {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bitrate},RESOLUTION=${quality.resolution}\n`;
      playlist += `${quality.quality}.m3u8\n`;
    });

    return playlist;
  }

  /**
   * Estimate video resolution based on file size
   */
  private static estimateResolution(fileSize: number): string {
    if (fileSize > 2 * 1024 * 1024 * 1024) return '1920x1080'; // > 2GB
    if (fileSize > 1 * 1024 * 1024 * 1024) return '1280x720';  // > 1GB
    if (fileSize > 500 * 1024 * 1024) return '854x480';        // > 500MB
    return '640x360'; // Default
  }

  /**
   * Estimate bitrate based on file size and duration
   */
  private static estimateBitrate(fileSize: number, duration: number): number {
    if (!duration || duration === 0) return 2000000; // Default 2 Mbps
    
    // Calculate bits per second
    const bitsPerSecond = (fileSize * 8) / duration;
    return Math.round(bitsPerSecond);
  }

  /**
   * Get optimal default quality based on file size
   */
  private static getOptimalDefaultQuality(fileSize: number): string {
    if (fileSize > 2 * 1024 * 1024 * 1024) return '720p'; // > 2GB, start with 720p
    if (fileSize > 1 * 1024 * 1024 * 1024) return '720p'; // > 1GB, start with 720p
    if (fileSize > 500 * 1024 * 1024) return '480p';      // > 500MB, start with 480p
    return 'original'; // Smaller files can start with original
  }

  /**
   * Check if adaptive streaming is available for a video
   */
  static async isAdaptiveStreamingAvailable(videoId: string): Promise<boolean> {
    try {
      const video = await VideoDB.findById(videoId);
      if (!video) return false;

      // Check if processed variants exist
      // For now, return true if video is large enough to benefit from adaptive streaming
      return video.size > 100 * 1024 * 1024; // 100MB threshold
    } catch (error) {
      console.error('Error checking adaptive streaming availability:', error);
      return false;
    }
  }

  /**
   * Get streaming analytics data
   */
  static async getStreamingAnalytics(videoId: string): Promise<{
    totalViews: number;
    qualityDistribution: Record<string, number>;
    averageWatchTime: number;
    bufferingEvents: number;
  }> {
    // Placeholder for analytics - would integrate with actual analytics service
    return {
      totalViews: 0,
      qualityDistribution: {
        'original': 0,
        '1080p': 0,
        '720p': 0,
        '480p': 0,
        '360p': 0
      },
      averageWatchTime: 0,
      bufferingEvents: 0
    };
  }
}

export default AdaptiveStreamingService;
