import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { VideoDB } from './database';

export interface MediaDiscoveryResult {
  found: boolean;
  url?: string;
  s3Key?: string;
  method: string;
  responseTime?: number;
  mediaType: 'video' | 'thumbnail';
}

export interface VideoStreamResponse {
  success: boolean;
  videoUrl?: string;
  method?: 'database' | 'cloudfront_discovery' | 'presigned_fallback';
  error?: string;
  metadata?: {
    s3Key?: string;
    cloudFrontUrl?: string;
    directUrl?: string;
    discoveryAttempts?: string[];
  };
}

export interface ThumbnailResponse {
  success: boolean;
  thumbnailUrl?: string;
  method?: 'database' | 'cloudfront_discovery' | 'placeholder_fallback';
  error?: string;
  metadata?: {
    s3Key?: string;
    cloudFrontUrl?: string;
    discoveryAttempts?: string[];
  };
}

export class MediaDiscoveryService {
  private static cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
  private static s3BucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';

  /**
   * Discover video files by testing CloudFront URLs with common S3 key patterns
   */
  static async discoverVideoByCloudFront(videoId: string): Promise<MediaDiscoveryResult> {
    const startTime = Date.now();
    
    // Common video S3 key patterns based on observed uploads
    const possibleS3Keys = [
      `videos/${videoId}.mp4`,
      `videos/${videoId}`,
      `${videoId}.mp4`,
      `${videoId}`,
      `videos/${videoId}.mov`,
      `videos/${videoId}.avi`,
      `videos/${videoId}.webm`
    ];

    console.log(`🔍 Discovering video for ID: ${videoId}`);
    
    for (const s3Key of possibleS3Keys) {
      const testUrl = `https://${this.cloudFrontDomain}/${s3Key}`;
      console.log(`🧪 Testing video URL: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          const responseTime = Date.now() - startTime;
          console.log(`✅ Found video at: ${testUrl} (${responseTime}ms)`);
          
          return {
            found: true,
            url: testUrl,
            s3Key,
            method: 'cloudfront_discovery',
            responseTime,
            mediaType: 'video'
          };
        }
      } catch (error) {
        console.log(`❌ Video URL failed: ${testUrl} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`❌ No video found for ID: ${videoId} (${responseTime}ms)`);
    
    return {
      found: false,
      method: 'cloudfront_discovery',
      responseTime,
      mediaType: 'video'
    };
  }

  /**
   * Discover thumbnail files by testing CloudFront URLs with common S3 key patterns
   */
  static async discoverThumbnailByCloudFront(videoId: string): Promise<MediaDiscoveryResult> {
    const startTime = Date.now();
    
    // Common thumbnail S3 key patterns
    const possibleS3Keys = [
      `thumbnails/${videoId}.jpg`,
      `thumbnails/${videoId}.jpeg`,
      `thumbnails/${videoId}.png`,
      `thumbnails/${videoId}.webp`,
      `thumbnails/${videoId}-thumbnail.jpg`,
      `thumbnails/${videoId}-thumb.jpg`,
      `videos/${videoId}-thumbnail.jpg`,
      `videos/${videoId}.jpg`
    ];

    console.log(`🖼️ Discovering thumbnail for ID: ${videoId}`);
    
    for (const s3Key of possibleS3Keys) {
      const testUrl = `https://${this.cloudFrontDomain}/${s3Key}`;
      console.log(`🧪 Testing thumbnail URL: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000) // 3 second timeout for thumbnails
        });
        
        if (response.ok) {
          const responseTime = Date.now() - startTime;
          console.log(`✅ Found thumbnail at: ${testUrl} (${responseTime}ms)`);
          
          return {
            found: true,
            url: testUrl,
            s3Key,
            method: 'cloudfront_discovery',
            responseTime,
            mediaType: 'thumbnail'
          };
        }
      } catch (error) {
        console.log(`❌ Thumbnail URL failed: ${testUrl} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`❌ No thumbnail found for ID: ${videoId} (${responseTime}ms)`);
    
    return {
      found: false,
      method: 'cloudfront_discovery',
      responseTime,
      mediaType: 'thumbnail'
    };
  }

  /**
   * Search database by filename patterns (as suggested by user)
   */
  static async searchDatabaseByFilename(videoId: string): Promise<MediaDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Searching database by filename patterns for: ${videoId}`);
      
      // Extract timestamp and random parts from videoId (format: timestamp-randomstring)
      const parts = videoId.split('-');
      if (parts.length >= 2) {
        const timestamp = parts[0];
        const randomPart = parts.slice(1).join('-');
        
        // Search for videos with matching filename patterns
        const searchPatterns = [
          `%${videoId}%`,
          `%${timestamp}%${randomPart}%`,
          `%${randomPart}%`,
          `%${timestamp}%`
        ];
        
        for (const pattern of searchPatterns) {
          const videos = await VideoDB.searchByFilename(pattern);
          
          if (videos.length > 0) {
            const video = videos[0]; // Take the first match
            console.log(`✅ Found video in database by filename: ${video.filename}`);
            
            // If video has s3_key, construct CloudFront URL
            if (video.s3_key) {
              const url = `https://${this.cloudFrontDomain}/${video.s3_key}`;
              
              if (await this.validateMediaUrl(url)) {
                const responseTime = Date.now() - startTime;
                return {
                  found: true,
                  url,
                  s3Key: video.s3_key,
                  method: 'database_filename_search',
                  responseTime,
                  mediaType: 'video'
                };
              }
            }
            
            // If video has file_path, try that
            if (video.file_path && video.file_path.startsWith('http')) {
              if (await this.validateMediaUrl(video.file_path)) {
                const responseTime = Date.now() - startTime;
                return {
                  found: true,
                  url: video.file_path,
                  s3Key: video.s3_key || '',
                  method: 'database_filename_search',
                  responseTime,
                  mediaType: 'video'
                };
              }
            }
          }
        }
      }
      
      const responseTime = Date.now() - startTime;
      return { 
        found: false, 
        method: 'database_filename_search',
        responseTime,
        mediaType: 'video'
      };
    } catch (error) {
      console.error('❌ Database filename search error:', error);
      const responseTime = Date.now() - startTime;
      return { 
        found: false, 
        method: 'database_filename_search',
        responseTime,
        mediaType: 'video'
      };
    }
  }

  /**
   * Discover media files by querying S3 bucket directly
   */
  static async discoverMediaByS3Listing(videoId: string, mediaType: 'video' | 'thumbnail'): Promise<MediaDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      // Search in appropriate folder based on media type
      const prefix = mediaType === 'video' ? 'videos/' : 'thumbnails/';
      
      const command = new ListObjectsV2Command({
        Bucket: this.s3BucketName,
        Prefix: prefix,
        MaxKeys: 100
      });

      const response = await s3Client.send(command);
      
      if (response.Contents) {
        // Look for files that contain the video ID
        const matchingFile = response.Contents.find(obj => 
          obj.Key && obj.Key.includes(videoId)
        );

        if (matchingFile && matchingFile.Key) {
          const cloudFrontUrl = `https://${this.cloudFrontDomain}/${matchingFile.Key}`;
          const responseTime = Date.now() - startTime;
          
          console.log(`✅ Found ${mediaType} via S3 listing: ${cloudFrontUrl} (${responseTime}ms)`);
          
          return {
            found: true,
            url: cloudFrontUrl,
            s3Key: matchingFile.Key,
            method: 's3_listing',
            responseTime,
            mediaType
          };
        }
      }

      const responseTime = Date.now() - startTime;
      console.log(`❌ No ${mediaType} found via S3 listing for ID: ${videoId} (${responseTime}ms)`);
      
      return {
        found: false,
        method: 's3_listing',
        responseTime,
        mediaType
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ S3 listing error for ${mediaType}:`, error);
      
      return {
        found: false,
        method: 's3_listing',
        responseTime,
        mediaType
      };
    }
  }

  /**
   * Validate if a media URL is accessible
   */
  static async validateMediaUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.log(`❌ URL validation failed for: ${url}`);
      return false;
    }
  }

  /**
   * Generate a presigned URL as fallback for private S3 access
   */
  static async generatePresignedFallback(s3Key: string): Promise<string> {
    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const command = new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: s3Key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log(`✅ Generated presigned URL for: ${s3Key}`);
      
      return presignedUrl;
    } catch (error) {
      console.error(`❌ Failed to generate presigned URL for: ${s3Key}`, error);
      throw error;
    }
  }

  /**
   * Comprehensive video discovery with multiple fallback methods
   */
  static async discoverVideo(videoId: string): Promise<MediaDiscoveryResult> {
    console.log(`🎥 Starting comprehensive video discovery for: ${videoId}`);
    
    // Method 1: Database filename search (fastest, as suggested by user)
    const databaseResult = await this.searchDatabaseByFilename(videoId);
    if (databaseResult.found) {
      return databaseResult;
    }

    // Method 2: CloudFront discovery (pattern matching)
    const cloudFrontResult = await this.discoverVideoByCloudFront(videoId);
    if (cloudFrontResult.found) {
      return cloudFrontResult;
    }

    // Method 3: S3 listing (most thorough)
    const s3Result = await this.discoverMediaByS3Listing(videoId, 'video');
    if (s3Result.found) {
      return s3Result;
    }

    // No video found
    return {
      found: false,
      method: 'comprehensive_discovery',
      mediaType: 'video'
    };
  }

  /**
   * Comprehensive thumbnail discovery with multiple fallback methods
   */
  static async discoverThumbnail(videoId: string): Promise<MediaDiscoveryResult> {
    console.log(`🖼️ Starting comprehensive thumbnail discovery for: ${videoId}`);
    
    // Method 1: CloudFront discovery (fastest)
    const cloudFrontResult = await this.discoverThumbnailByCloudFront(videoId);
    if (cloudFrontResult.found) {
      return cloudFrontResult;
    }

    // Method 2: S3 listing (more thorough)
    const s3Result = await this.discoverMediaByS3Listing(videoId, 'thumbnail');
    if (s3Result.found) {
      return s3Result;
    }

    // No thumbnail found
    return {
      found: false,
      method: 'comprehensive_discovery',
      mediaType: 'thumbnail'
    };
  }
}

export default MediaDiscoveryService;
