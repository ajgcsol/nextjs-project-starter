import MuxVideoProcessor from './mux-video-processor';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  bitrate: number;
  fileSize: number;
  thumbnailUrl: string;
  streamingUrl: string;
  mp4Url?: string;
  hasAudio: boolean;
  hasCaptions: boolean;
}

export interface MuxAssetMetadata {
  assetId: string;
  playbackId: string;
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  aspectRatio?: string;
  thumbnailUrl: string;
  streamingUrl: string;
  mp4Url?: string;
  createdAt: Date;
  readyAt?: Date;
}

export class VideoMetadataExtractor {
  /**
   * Extract complete metadata from Mux asset with retry logic
   */
  static async extractFromMuxAsset(
    assetId: string, 
    playbackId: string,
    maxRetries: number = 3
  ): Promise<VideoMetadata | null> {
    console.log('🔍 VideoMetadataExtractor: Extracting metadata from Mux asset:', assetId);
    
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        // Get asset status from Mux
        const assetStatus = await MuxVideoProcessor.getAssetStatus(assetId);
        
        if (!assetStatus.success) {
          console.log(`⚠️ Attempt ${attempt + 1}: Asset status failed:`, assetStatus.error);
          attempt++;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
            continue;
          }
          return null;
        }
        
        // If asset is still preparing, wait and retry
        if (assetStatus.processingStatus === 'preparing') {
          console.log(`⏳ Attempt ${attempt + 1}: Asset still preparing, waiting...`);
          attempt++;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            continue;
          }
          // Return partial metadata if still preparing after retries
          return this.createPartialMetadata(playbackId, assetStatus);
        }
        
        // Asset is ready, extract full metadata
        if (assetStatus.processingStatus === 'ready') {
          console.log('✅ VideoMetadataExtractor: Asset is ready, extracting full metadata');
          return this.createFullMetadata(playbackId, assetStatus);
        }
        
        // Asset errored
        if (assetStatus.processingStatus === 'errored') {
          console.error('❌ VideoMetadataExtractor: Asset processing failed:', assetStatus.error);
          return null;
        }
        
        break;
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1}: Error extracting metadata:`, error);
        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    
    console.log('❌ VideoMetadataExtractor: Failed to extract metadata after all retries');
    return null;
  }
  
  /**
   * Create full metadata from ready Mux asset
   */
  private static createFullMetadata(playbackId: string, assetStatus: any): VideoMetadata {
    const duration = assetStatus.duration || 0;
    const aspectRatio = assetStatus.aspectRatio || '16:9';
    
    // Parse aspect ratio to get dimensions
    const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
    const baseHeight = 1080; // Assume 1080p as base
    const width = Math.round((baseHeight * widthRatio) / heightRatio);
    const height = baseHeight;
    
    // Estimate bitrate (rough calculation)
    const estimatedBitrate = this.estimateBitrate(width, height, duration);
    const estimatedFileSize = this.estimateFileSize(estimatedBitrate, duration);
    
    return {
      duration,
      width,
      height,
      aspectRatio,
      bitrate: estimatedBitrate,
      fileSize: estimatedFileSize,
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`,
      streamingUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      mp4Url: `https://stream.mux.com/${playbackId}/high.mp4`,
      hasAudio: true, // Assume true for Mux assets
      hasCaptions: false // Will be updated when captions are generated
    };
  }
  
  /**
   * Create partial metadata for preparing assets
   */
  private static createPartialMetadata(playbackId: string, assetStatus: any): VideoMetadata {
    return {
      duration: assetStatus.duration || 0,
      width: 1920, // Default values
      height: 1080,
      aspectRatio: '16:9',
      bitrate: 2500000, // 2.5 Mbps default
      fileSize: 0, // Unknown while preparing
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg?time=10`,
      streamingUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      mp4Url: `https://stream.mux.com/${playbackId}/high.mp4`,
      hasAudio: true,
      hasCaptions: false
    };
  }
  
  /**
   * Estimate bitrate based on resolution and duration
   */
  private static estimateBitrate(width: number, height: number, duration: number): number {
    const pixels = width * height;
    
    // Bitrate estimation based on resolution
    if (pixels >= 3840 * 2160) return 15000000; // 4K: 15 Mbps
    if (pixels >= 1920 * 1080) return 5000000;  // 1080p: 5 Mbps
    if (pixels >= 1280 * 720) return 2500000;   // 720p: 2.5 Mbps
    if (pixels >= 854 * 480) return 1000000;    // 480p: 1 Mbps
    return 500000; // Lower res: 500 Kbps
  }
  
  /**
   * Estimate file size based on bitrate and duration
   */
  private static estimateFileSize(bitrate: number, duration: number): number {
    // File size = (bitrate in bits/sec * duration in seconds) / 8 bits per byte
    return Math.round((bitrate * duration) / 8);
  }
  
  /**
   * Extract metadata from file information (fallback)
   */
  static extractFromFileInfo(
    filename: string, 
    fileSize: number, 
    s3Key?: string
  ): VideoMetadata {
    console.log('📁 VideoMetadataExtractor: Extracting metadata from file info');
    
    // Estimate duration based on file size (very rough)
    const estimatedBitrate = 2500000; // 2.5 Mbps default
    const estimatedDuration = Math.round((fileSize * 8) / estimatedBitrate);
    
    return {
      duration: estimatedDuration,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      bitrate: estimatedBitrate,
      fileSize,
      thumbnailUrl: `/api/videos/thumbnail/placeholder`, // Placeholder
      streamingUrl: s3Key ? `https://law-school-repository-content.s3.us-east-1.amazonaws.com/${s3Key}` : '',
      hasAudio: true,
      hasCaptions: false
    };
  }
  
  /**
   * Wait for Mux asset to be ready with timeout
   */
  static async waitForMuxAssetReady(
    assetId: string, 
    timeoutMs: number = 30000
  ): Promise<{ ready: boolean; metadata?: VideoMetadata }> {
    console.log('⏳ VideoMetadataExtractor: Waiting for Mux asset to be ready:', assetId);
    
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const assetStatus = await MuxVideoProcessor.getAssetStatus(assetId);
        
        if (assetStatus.success && assetStatus.processingStatus === 'ready') {
          console.log('✅ VideoMetadataExtractor: Asset is ready!');
          const metadata = this.createFullMetadata(assetStatus.playbackId!, assetStatus);
          return { ready: true, metadata };
        }
        
        if (assetStatus.success && assetStatus.processingStatus === 'errored') {
          console.error('❌ VideoMetadataExtractor: Asset processing failed');
          return { ready: false };
        }
        
        // Still preparing, wait and retry
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('❌ VideoMetadataExtractor: Error checking asset status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log('⏰ VideoMetadataExtractor: Timeout waiting for asset to be ready');
    return { ready: false };
  }
  
  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds === 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  /**
   * Get video quality label based on resolution
   */
  static getQualityLabel(width: number, height: number): string {
    const pixels = width * height;
    
    if (pixels >= 3840 * 2160) return '4K';
    if (pixels >= 1920 * 1080) return '1080p';
    if (pixels >= 1280 * 720) return '720p';
    if (pixels >= 854 * 480) return '480p';
    return 'SD';
  }
}

export default VideoMetadataExtractor;
