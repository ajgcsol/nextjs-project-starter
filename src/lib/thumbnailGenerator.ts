import { AWSVideoProcessor } from './aws-integration';
import { VideoDB } from './database';

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  s3Key?: string;
  method: 'mediaconvert' | 'client_side' | 'placeholder';
  error?: string;
}

export class ThumbnailGenerator {
  /**
   * Generate thumbnail from video using AWS MediaConvert
   */
  static async generateWithMediaConvert(videoS3Key: string, videoId: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Generating thumbnail with MediaConvert for:', videoS3Key);
      
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const inputUrl = `s3://${bucketName}/${videoS3Key}`;
      const outputPath = `s3://${bucketName}/thumbnails/`;
      
      // Create MediaConvert job for thumbnail extraction
      const jobParams = {
        Role: process.env.MEDIACONVERT_ROLE_ARN!,
        Settings: {
          Inputs: [
            {
              FileInput: inputUrl,
              VideoSelector: {
                ColorSpace: 'FOLLOW' as const
              }
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
                        FramerateDenominator: 10, // Capture 1 frame every 10 seconds
                        MaxCaptures: 1, // Only capture 1 frame
                        Quality: 80
                      }
                    },
                    Width: 1280,
                    Height: 720
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
          'generated-at': new Date().toISOString()
        }
      };

      // Submit MediaConvert job
      const job = await AWSVideoProcessor.processVideo(inputUrl, outputPath, `Thumbnail for ${videoId}`);
      
      if (job.Id) {
        console.log('✅ MediaConvert thumbnail job created:', job.Id);
        
        // The thumbnail will be available after processing
        // Return the expected S3 key where the thumbnail will be stored
        const thumbnailS3Key = `thumbnails/${videoId}_thumbnail.jpg`;
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
        const thumbnailUrl = `https://${cloudFrontDomain}/${thumbnailS3Key}`;
        
        return {
          success: true,
          thumbnailUrl,
          s3Key: thumbnailS3Key,
          method: 'mediaconvert'
        };
      } else {
        throw new Error('MediaConvert job creation failed');
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

    // Method 2: Return client-side generation script
    if (videoUrl) {
      console.log('🌐 Providing client-side thumbnail generation script...');
      return {
        success: true,
        method: 'client_side',
        thumbnailUrl: videoUrl // The client will use this to generate thumbnail
      };
    }

    // Method 3: Fallback to placeholder
    console.log('🎨 Falling back to placeholder thumbnail...');
    return {
      success: false,
      method: 'placeholder',
      error: 'No thumbnail generation method available'
    };
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
  static async batchGenerateThumbnails(limit: number = 10): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: ThumbnailGenerationResult[];
  }> {
    console.log('🔄 Starting batch thumbnail generation...');
    
    try {
      // Find videos without thumbnails
      const videos = await VideoDB.findVideosWithoutThumbnails(limit);
      
      const results: ThumbnailGenerationResult[] = [];
      let successful = 0;
      let failed = 0;
      
      for (const video of videos) {
        console.log(`🎬 Processing video: ${video.id} - ${video.title}`);
        
        const result = await this.generateThumbnail(
          video.id,
          video.s3_key || undefined,
          video.file_path || undefined
        );
        
        results.push(result);
        
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
        
        // Add delay between requests to avoid overwhelming MediaConvert
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
