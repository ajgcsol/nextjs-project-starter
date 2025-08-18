// Video Service - Handles video processing without requiring local ffmpeg
// In production, this would integrate with AWS Elemental Media Services or similar

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec?: string;
  fps?: number;
}

interface ProcessingOptions {
  generateThumbnail?: boolean;
  generateQualities?: boolean;
  qualities?: string[];
}

export class VideoService {
  // Get basic video metadata using the HTML5 Video API
  static async getVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.src = url;
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          duration: video.duration || 0,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          bitrate: 5000000, // Default estimate
          fps: 30 // Default FPS
        };
        
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        // Return default metadata on error
        resolve({
          duration: 0,
          width: 1920,
          height: 1080,
          bitrate: 5000000,
          fps: 30
        });
      };
    });
  }

  // Generate a thumbnail from video using Canvas API
  static async generateThumbnail(
    file: File, 
    timestamp: number = 0
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(file);
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      video.src = url;
      video.currentTime = timestamp;
      
      video.onseeked = () => {
        canvas.width = 1280;
        canvas.height = 720;
        
        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(
          canvas.width / video.videoWidth,
          canvas.height / video.videoHeight
        );
        
        const scaledWidth = video.videoWidth * scale;
        const scaledHeight = video.videoHeight * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(video, x, y, scaledWidth, scaledHeight);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
    });
  }

  // Validate video file
  static validateVideo(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-m4v'
    ];
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size exceeds 5GB limit (current: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)` 
      };
    }
    
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('video/')) {
      return { 
        valid: false, 
        error: 'Invalid file type. Please upload a video file.' 
      };
    }
    
    return { valid: true };
  }

  // Process video for streaming (placeholder for cloud processing)
  static async processForStreaming(
    file: File,
    options: ProcessingOptions = {}
  ): Promise<{
    streamUrl: string;
    thumbnailUrl?: string;
    qualities?: string[];
  }> {
    // In production, this would:
    // 1. Upload to AWS S3
    // 2. Trigger AWS Elemental MediaConvert for transcoding
    // 3. Generate HLS/DASH streams for adaptive bitrate
    // 4. Return CloudFront URLs for streaming
    
    // For now, return local URLs
    const fileId = crypto.randomUUID();
    const streamUrl = `/uploads/videos/${fileId}_original.mp4`;
    
    let thumbnailUrl: string | undefined;
    if (options.generateThumbnail) {
      thumbnailUrl = `/uploads/thumbnails/${fileId}_thumb.jpg`;
    }
    
    const qualities = options.generateQualities 
      ? ['1080p', '720p', '480p', '360p']
      : undefined;
    
    return {
      streamUrl,
      thumbnailUrl,
      qualities
    };
  }

  // Check if browser can play video
  static canPlayVideo(mimeType: string): boolean {
    const video = document.createElement('video');
    return video.canPlayType(mimeType) !== '';
  }

  // Get video codec info from mime type
  static getCodecInfo(mimeType: string): { codec: string; container: string } {
    const parts = mimeType.split('/');
    const container = parts[1] || 'unknown';
    
    const codecMap: { [key: string]: string } = {
      'mp4': 'H.264',
      'webm': 'VP8/VP9',
      'ogg': 'Theora',
      'quicktime': 'H.264',
      'x-matroska': 'H.264/VP9'
    };
    
    return {
      container: container.toUpperCase(),
      codec: codecMap[container] || 'Unknown'
    };
  }

  // Estimate bitrate based on file size and duration
  static estimateBitrate(fileSize: number, duration: number): number {
    if (duration === 0) return 5000000; // Default 5 Mbps
    return Math.round((fileSize * 8) / duration); // Convert to bits per second
  }
}

// Export for server-side use
export default VideoService;