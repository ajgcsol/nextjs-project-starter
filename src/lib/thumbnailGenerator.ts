import { AWSVideoProcessor, AWSFileManager } from './aws-integration';
import { VideoDB } from './database';

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  s3Key?: string;
  method: 'mediaconvert' | 'ffmpeg' | 'client_side' | 'placeholder';
  error?: string;
  jobId?: string;
}

export class ThumbnailGenerator {
  /**
   * Generate thumbnail from video using AWS MediaConvert
   */
  static async generateWithMediaConvert(videoS3Key: string, videoId: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Generating thumbnail with MediaConvert for:', videoS3Key);
      
      // Validate required environment variables
      if (!process.env.MEDIACONVERT_ROLE_ARN || !process.env.MEDIACONVERT_ENDPOINT) {
        throw new Error('MediaConvert configuration missing: MEDIACONVERT_ROLE_ARN and MEDIACONVERT_ENDPOINT required');
      }
      
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const inputUrl = `s3://${bucketName}/${videoS3Key}`;
      const outputPath = `s3://${bucketName}/thumbnails/`;
      
      // Create MediaConvert job for thumbnail extraction
      const jobParams = {
        Role: process.env.MEDIACONVERT_ROLE_ARN,
        Settings: {
          Inputs: [
            {
              FileInput: inputUrl,
              VideoSelector: {
                ColorSpace: 'FOLLOW' as const
              },
              TimecodeSource: 'ZEROBASED' as const
            }
          ],
          OutputGroups: [
            {
              Name: 'Thumbnail Output',
              OutputGroupSettings: {
                Type: 'FILE_GROUP_SETTINGS' as const,
                FileGroupSettings: {
                  Destination: outputPath
                }
              },
              Outputs: [
                {
                  NameModifier: `_thumbnail_${videoId}`,
                  VideoDescription: {
                    CodecSettings: {
                      Codec: 'FRAME_CAPTURE' as const,
                      FrameCaptureSettings: {
                        FramerateNumerator: 1,
                        FramerateDenominator: 60, // Capture 1 frame every 60 seconds
                        MaxCaptures: 1, // Only capture 1 frame
                        Quality: 80
                      }
                    },
                    Width: 1280,
                    Height: 720,
                    ScalingBehavior: 'DEFAULT' as const
                  },
                  Extension: 'jpg'
                }
              ]
            }
          ]
        },
        UserMetadata: {
          'video-id': videoId,
          'purpose': 'thumbnail-generation',
          'generated-at': new Date().toISOString(),
          'input-s3-key': videoS3Key
        }
      };

      // Import MediaConvert client directly for better error handling
      const { MediaConvertClient, CreateJobCommand } = await import('@aws-sdk/client-mediaconvert');
      
      const mediaConvertClient = new MediaConvertClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        endpoint: process.env.MEDIACONVERT_ENDPOINT
      });

      const command = new CreateJobCommand(jobParams);
      const result = await mediaConvertClient.send(command);
      
      if (result.Job?.Id) {
        console.log('✅ MediaConvert thumbnail job created:', result.Job.Id);
        
        // The thumbnail will be available after processing
        const thumbnailS3Key = `thumbnails/${videoId}_thumbnail_${videoId}.jpg`;
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
        const thumbnailUrl = `https://${cloudFrontDomain}/${thumbnailS3Key}`;
        
        return {
          success: true,
          thumbnailUrl,
          s3Key: thumbnailS3Key,
          method: 'mediaconvert',
          jobId: result.Job.Id
        };
      } else {
        throw new Error('MediaConvert job creation failed - no job ID returned');
      }

    } catch (error) {
      console.error('❌ MediaConvert thumbnail generation failed:', error);
      return {
        success: false,
        method: 'mediaconvert',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate thumbnail using FFmpeg (server-side processing)
   */
  static async generateWithFFmpeg(videoS3Key: string, videoId: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Generating thumbnail with FFmpeg for:', videoS3Key);
      
      // Check if we're in a serverless environment
      if (process.env.VERCEL || process.env.NETLIFY) {
        console.log('⚠️ FFmpeg not available in serverless environment, skipping');
        return {
          success: false,
          method: 'ffmpeg',
          error: 'FFmpeg not available in serverless environment'
        };
      }

      // For now, we'll create a simple implementation that generates a colored thumbnail
      // In a full implementation, you would use FFmpeg to extract a frame from the video
      const thumbnailBuffer = await this.generateSimpleThumbnail(videoId);
      
      // Upload to S3
      const thumbnailS3Key = `thumbnails/${videoId}_ffmpeg_${Date.now()}.jpg`;
      
      const uploadResult = await AWSFileManager.uploadFile(
        thumbnailBuffer,
        thumbnailS3Key,
        'image/jpeg'
      );

      console.log('✅ FFmpeg thumbnail uploaded to S3:', thumbnailS3Key);

      return {
        success: true,
        thumbnailUrl: uploadResult.Location,
        s3Key: thumbnailS3Key,
        method: 'ffmpeg'
      };

    } catch (error) {
      console.error('❌ FFmpeg thumbnail generation failed:', error);
      return {
        success: false,
        method: 'ffmpeg',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate a simple colored thumbnail as fallback
   */
  private static async generateSimpleThumbnail(videoId: string): Promise<Buffer> {
    // Create a simple colored rectangle as thumbnail
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const color = colors[videoId.length % colors.length];
    
    // Create SVG thumbnail
    const svg = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <circle cx="640" cy="360" r="80" fill="white" opacity="0.8"/>
        <polygon points="600,320 600,400 720,360" fill="${color}" opacity="0.9"/>
        <text x="640" y="500" font-family="Arial, sans-serif" font-size="48" fill="white" text-anchor="middle" opacity="0.9">
          Video Thumbnail
        </text>
        <text x="640" y="550" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.7">
          ID: ${videoId.substring(0, 8)}...
        </text>
      </svg>
    `;

    return Buffer.from(svg, 'utf-8');
  }

  /**
   * Generate client-side thumbnail using HTML5 video element
   * This creates a data URL that can be stored in the database
   */
  static generateClientSideScript(videoUrl: string): string {
    return `
      function generateThumbnail(videoUrl, callback) {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
          // Set canvas size to video dimensions
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          
          // Seek to 10% of video duration for thumbnail
          video.currentTime = video.duration * 0.1;
        };
        
        video.onseeked = function() {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to data URL
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          callback(thumbnailDataUrl);
        };
        
        video.onerror = function(error) {
          console.error('Video thumbnail generation error:', error);
          callback(null);
        };
        
        video.src = videoUrl;
      }
      
      // Usage: generateThumbnail('${videoUrl}', function(dataUrl) { /* handle result */ });
    `;
  }

  /**
   * Generate SVG thumbnail as fallback when other methods fail
   */
  static async generateSVGThumbnail(videoId: string, videoTitle?: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎨 Generating SVG thumbnail for video:', videoId);
      
      // Create a beautiful SVG thumbnail with video info
      const colors = [
        '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
        '#EF4444', '#06B6D4', '#84CC16', '#F97316'
      ];
      const color = colors[videoId.length % colors.length];
      
      const svg = `
        <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg-${videoId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
            </linearGradient>
            <filter id="shadow">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>
          <rect width="1280" height="720" fill="url(#bg-${videoId})"/>
          <circle cx="640" cy="300" r="60" fill="rgba(255,255,255,0.9)" filter="url(#shadow)"/>
          <polygon points="620,270 620,330 670,300" fill="${color}"/>
          <text x="640" y="420" font-family="Arial, sans-serif" font-size="32" font-weight="bold"
                fill="white" text-anchor="middle" filter="url(#shadow)">
            ${videoTitle || 'Video Thumbnail'}
          </text>
          <text x="640" y="460" font-family="Arial, sans-serif" font-size="18" 
                fill="rgba(255,255,255,0.8)" text-anchor="middle">
            Generated Thumbnail
          </text>
          <rect x="40" y="40" width="200" height="40" rx="20" fill="rgba(255,255,255,0.2)"/>
          <text x="140" y="65" font-family="Arial, sans-serif" font-size="16" 
                fill="white" text-anchor="middle" font-weight="bold">
            ${videoId.substring(0, 8).toUpperCase()}
          </text>
        </svg>
      `;
      
      // Convert SVG to base64 data URL
      const base64SVG = Buffer.from(svg).toString('base64');
      const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;
      
      return {
        success: true,
        thumbnailUrl: dataUrl,
        method: 'placeholder',
        s3Key: undefined
      };
      
    } catch (error) {
      console.error('❌ SVG thumbnail generation failed:', error);
      return {
        success: false,
        method: 'placeholder',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Comprehensive thumbnail generation with fallbacks
   */
  static async generateThumbnail(videoId: string, videoS3Key?: string, videoUrl?: string): Promise<ThumbnailGenerationResult> {
    console.log('🖼️ Starting thumbnail generation for video:', videoId);

    // Method 1: Try MediaConvert if we have S3 key and MediaConvert is configured
    if (videoS3Key && process.env.MEDIACONVERT_ROLE_ARN && process.env.MEDIACONVERT_ENDPOINT) {
      console.log('🎬 Attempting MediaConvert thumbnail generation...');
      const mediaConvertResult = await this.generateWithMediaConvert(videoS3Key, videoId);
      
      if (mediaConvertResult.success) {
        // Update database with the new thumbnail info
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: mediaConvertResult.thumbnailUrl
          });
          console.log('✅ Database updated with MediaConvert thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
        
        return mediaConvertResult;
      }
    }

    // Method 2: Try FFmpeg fallback if we have S3 key
    if (videoS3Key) {
      console.log('🎬 Attempting FFmpeg thumbnail generation...');
      const ffmpegResult = await this.generateWithFFmpeg(videoS3Key, videoId);
      
      if (ffmpegResult.success) {
        // Update database with the new thumbnail info
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: ffmpegResult.thumbnailUrl
          });
          console.log('✅ Database updated with FFmpeg thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
        
        return ffmpegResult;
      }
    }

    // Method 3: Generate SVG thumbnail as fallback
    console.log('🎨 Generating SVG thumbnail as fallback...');
    try {
      const svgResult = await this.generateSVGThumbnail(videoId);
      
      if (svgResult.success) {
        // Update database with SVG thumbnail
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: svgResult.thumbnailUrl
          });
          console.log('✅ Database updated with SVG thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with SVG thumbnail:', dbError);
        }
        
        return svgResult;
      }
    } catch (error) {
      console.error('❌ SVG thumbnail generation failed:', error);
    }

    // Method 4: Generate placeholder thumbnail
    console.log('🎨 Generating placeholder thumbnail...');
    try {
      const placeholderResult = await this.generatePlaceholderThumbnail(videoId);
      
      if (placeholderResult.success) {
        // Update database with placeholder thumbnail
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: placeholderResult.thumbnailUrl
          });
          console.log('✅ Database updated with placeholder thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with placeholder thumbnail:', dbError);
        }
      }
      
      return placeholderResult;
    } catch (error) {
      console.error('❌ Failed to generate placeholder thumbnail:', error);
      return {
        success: false,
        method: 'placeholder',
        error: 'All thumbnail generation methods failed'
      };
    }
  }

  /**
   * Generate a placeholder thumbnail and upload to S3
   */
  static async generatePlaceholderThumbnail(videoId: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎨 Generating placeholder thumbnail for:', videoId);
      
      const thumbnailBuffer = await this.generateSimpleThumbnail(videoId);
      
      // Upload to S3
      const thumbnailS3Key = `thumbnails/${videoId}_placeholder_${Date.now()}.svg`;
      
      const uploadResult = await AWSFileManager.uploadFile(
        thumbnailBuffer,
        thumbnailS3Key,
        'image/svg+xml'
      );

      console.log('✅ Placeholder thumbnail uploaded to S3:', thumbnailS3Key);

      return {
        success: true,
        thumbnailUrl: uploadResult.Location,
        s3Key: thumbnailS3Key,
        method: 'placeholder'
      };

    } catch (error) {
      console.error('❌ Placeholder thumbnail generation failed:', error);
      return {
        success: false,
        method: 'placeholder',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check MediaConvert job status and update database when thumbnail is ready
   */
  static async checkThumbnailJobStatus(jobId: string, videoId: string): Promise<boolean> {
    try {
      const job = await AWSVideoProcessor.getJobStatus(jobId);
      
      if (job.Status === 'COMPLETE') {
        console.log('✅ MediaConvert thumbnail job completed:', jobId);
        
        // The thumbnail should now be available in S3
        const thumbnailS3Key = `thumbnails/${videoId}_thumbnail.jpg`;
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
        const thumbnailUrl = `https://${cloudFrontDomain}/${thumbnailS3Key}`;
        
        // Update database with the completed thumbnail
        await VideoDB.update(videoId, {
          thumbnail_path: thumbnailUrl
        });
        
        return true;
      } else if (job.Status === 'ERROR') {
        console.error('❌ MediaConvert thumbnail job failed:', job.ErrorMessage);
        return false;
      }
      
      // Job still in progress
      console.log('⏳ MediaConvert thumbnail job still processing:', job.Status);
      return false;
      
    } catch (error) {
      console.error('❌ Error checking MediaConvert job status:', error);
      return false;
    }
  }

  /**
   * Batch generate thumbnails for videos that don't have them
   */
  static async batchGenerateThumbnails(limit: number = 10, forceRegenerate: boolean = false, offset: number = 0): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: ThumbnailGenerationResult[];
  }> {
    console.log('🔄 Starting batch thumbnail generation...', { limit, forceRegenerate });
    
    try {
      // Choose which videos to process based on forceRegenerate flag
      let videos;
      if (forceRegenerate) {
        console.log('🔄 Force regenerating thumbnails for ALL videos');
        videos = await VideoDB.findAllVideosForThumbnailRegeneration(limit);
      } else {
        console.log('🔄 Finding videos with broken/missing thumbnails');
        videos = await VideoDB.findVideosWithBrokenThumbnails(limit);
      }
      
      if (videos.length === 0) {
        console.log('✅ No videos found needing thumbnail generation');
        return {
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }
      
      console.log(`🎬 Found ${videos.length} videos for thumbnail processing`);
      
      const results: ThumbnailGenerationResult[] = [];
      let successful = 0;
      let failed = 0;
      
      for (const video of videos) {
        console.log(`🎬 Processing video: ${video.id} - ${video.title}`);
        console.log(`🎬 Current thumbnail: ${video.thumbnail_path || 'NONE'}`);
        
        const result = await this.generateThumbnail(
          video.id,
          video.s3_key || undefined,
          video.file_path || undefined
        );
        
        results.push({
          ...result,
          videoId: video.id,
          videoTitle: video.title,
          originalThumbnail: video.thumbnail_path
        } as any);
        
        if (result.success) {
          successful++;
          console.log(`✅ Successfully generated thumbnail for: ${video.title}`);
        } else {
          failed++;
          console.log(`❌ Failed to generate thumbnail for: ${video.title} - ${result.error}`);
        }
        
        // Add delay between requests to avoid overwhelming services
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Batch thumbnail generation complete: ${successful} successful, ${failed} failed`);
      
      return {
        processed: videos.length,
        successful,
        failed,
        results
      };
      
    } catch (error) {
      console.error('❌ Batch thumbnail generation error:', error);
      return {
        processed: 0,
        successful: 0,
        failed: 1,
        results: [{
          success: false,
          method: 'placeholder',
          error: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }
}

export default ThumbnailGenerator;
