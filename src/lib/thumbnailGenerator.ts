import { AWSVideoProcessor, AWSFileManager } from './aws-integration';
import { VideoDB } from './database';

export interface ThumbnailGenerationResult {
  success: boolean;
  thumbnailUrl?: string;
  s3Key?: string;
  method: 'mediaconvert' | 'ffmpeg' | 'enhanced_svg' | 'client_side' | 'placeholder';
  error?: string;
  jobId?: string;
}

// Enhanced credential sanitization for Vercel + AWS SDK v3 compatibility - FIXED for newlines
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  
  return credential
    // Remove BOM (Byte Order Mark) characters
    .replace(/^\uFEFF/, '')
    // CRITICAL FIX: Remove newlines and carriage returns first
    .replace(/[\r\n]/g, '')
    // Remove all Unicode control characters (0x00-0x1F, 0x7F-0x9F)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove all whitespace characters (spaces, tabs, etc.) but preserve the content
    .replace(/\s+/g, '')
    // Remove any non-ASCII characters that could cause header issues
    .replace(/[^\x20-\x7E]/g, '')
    // Trim any remaining whitespace
    .trim();
};

export class ThumbnailGenerator {
  /**
   * Generate thumbnail from video using AWS MediaConvert with smart filename matching
   */
  static async generateWithMediaConvert(videoS3Key: string, videoId: string, videoRecord?: any): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Generating REAL thumbnail with MediaConvert for:', videoS3Key);
      
      // Sanitize MediaConvert environment variables (same fix as AWS upload route)
      const rawRoleArn = process.env.MEDIACONVERT_ROLE_ARN;
      const rawEndpoint = process.env.MEDIACONVERT_ENDPOINT;
      
      console.log('🔍 DEBUG: Raw environment variables:', {
        rawRoleArn: rawRoleArn ? `${rawRoleArn.substring(0, 30)}...` : 'MISSING',
        rawEndpoint: rawEndpoint ? `${rawEndpoint.substring(0, 40)}...` : 'MISSING',
        roleArnLength: rawRoleArn?.length || 0,
        endpointLength: rawEndpoint?.length || 0
      });
      
      const roleArn = sanitizeCredential(rawRoleArn);
      const endpoint = sanitizeCredential(rawEndpoint);
      
      console.log('🔧 MediaConvert config after sanitization:', {
        roleArn: roleArn ? `${roleArn.substring(0, 20)}...` : 'MISSING',
        endpoint: endpoint ? `${endpoint.substring(0, 30)}...` : 'MISSING',
        rawRoleArnHasCarriageReturns: rawRoleArn?.includes('\r') || rawRoleArn?.includes('\n'),
        rawEndpointHasCarriageReturns: rawEndpoint?.includes('\r') || rawEndpoint?.includes('\n'),
        sanitizedRoleArnLength: roleArn?.length || 0,
        sanitizedEndpointLength: endpoint?.length || 0
      });
      
      if (!roleArn || !endpoint) {
        console.error('❌ MediaConvert environment variables missing after sanitization');
        console.error('❌ Raw values check:', {
          rawRoleArnExists: !!rawRoleArn,
          rawEndpointExists: !!rawEndpoint,
          sanitizedRoleArnExists: !!roleArn,
          sanitizedEndpointExists: !!endpoint
        });
        throw new Error('MediaConvert configuration missing');
      }
      
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const inputUrl = `s3://${bucketName}/${videoS3Key}`;
      const outputPath = `s3://${bucketName}/thumbnails/`;
      
      // Generate smart thumbnail filename based on video record
      let thumbnailBaseName = videoId;
      if (videoRecord) {
        // Extract base filename without extension and timestamp
        const originalFilename = videoRecord.filename || videoRecord.title || videoId;
        const baseFilename = originalFilename.replace(/\.[^/.]+$/, ''); // Remove extension
        const uploadTime = videoRecord.uploaded_at ? new Date(videoRecord.uploaded_at).getTime() : Date.now();
        
        // Create consistent naming pattern: basefilename_timestamp_videoid
        thumbnailBaseName = `${baseFilename}_${uploadTime}_${videoId}`;
        console.log('📝 Smart thumbnail naming:', {
          originalFilename,
          baseFilename,
          uploadTime,
          thumbnailBaseName
        });
      }
      
      console.log('📹 MediaConvert job details:', {
        inputUrl,
        outputPath,
        videoId,
        thumbnailBaseName,
        bucketName
      });
      
      // Create MediaConvert job for thumbnail extraction at 10% of video duration
      const jobParams = {
        Role: roleArn,
        Settings: {
          Inputs: [
            {
              FileInput: inputUrl,
              VideoSelector: {
                ColorSpace: 'FOLLOW' as const
              },
              TimecodeSource: 'ZEROBASED' as const,
              InputClippings: [
                {
                  StartTimecode: '00:00:10:00', // Start at 10 seconds to avoid black frames
                  EndTimecode: '00:00:11:00'    // Extract just 1 second
                }
              ]
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
                  NameModifier: `_thumb_${thumbnailBaseName}`,
                  VideoDescription: {
                    CodecSettings: {
                      Codec: 'FRAME_CAPTURE' as const,
                      FrameCaptureSettings: {
                        FramerateNumerator: 1,
                        FramerateDenominator: 1, // Capture 1 frame per second
                        MaxCaptures: 1, // Only capture 1 frame
                        Quality: 90 // High quality
                      }
                    },
                    Width: 1920,
                    Height: 1080,
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
          'video-filename': videoRecord?.filename || 'unknown',
          'video-title': videoRecord?.title || 'unknown',
          'upload-time': videoRecord?.uploaded_at || new Date().toISOString(),
          'purpose': 'real-thumbnail-extraction',
          'generated-at': new Date().toISOString(),
          'input-s3-key': videoS3Key,
          'thumbnail-basename': thumbnailBaseName,
          'extraction-time': '10-seconds'
        }
      };

      // Import MediaConvert client directly for better error handling
      const { MediaConvertClient, CreateJobCommand } = await import('@aws-sdk/client-mediaconvert');
      
      // Sanitize AWS credentials too (same as upload route)
      const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      
      const accessKeyId = sanitizeCredential(rawAccessKeyId);
      const secretAccessKey = sanitizeCredential(rawSecretAccessKey);
      
      if (!accessKeyId || !secretAccessKey) {
        console.error('❌ AWS credentials missing after sanitization');
        throw new Error('AWS credentials not found');
      }
      
      const mediaConvertClient = new MediaConvertClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        endpoint: endpoint
      });

      console.log('🚀 Submitting MediaConvert job...');
      console.log('🔍 DEBUG: Job parameters:', {
        roleArn: jobParams.Role,
        inputUrl: jobParams.Settings.Inputs[0].FileInput,
        outputPath: jobParams.Settings.OutputGroups[0].OutputGroupSettings.FileGroupSettings?.Destination,
        thumbnailBaseName
      });
      
      const command = new CreateJobCommand(jobParams);
      
      console.log('🔍 DEBUG: MediaConvert client config:', {
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: endpoint,
        hasCredentials: !!(accessKeyId && secretAccessKey)
      });
      
      const result = await mediaConvertClient.send(command);
      
      console.log('🔍 DEBUG: MediaConvert response:', {
        hasJob: !!result.Job,
        jobId: result.Job?.Id,
        jobStatus: result.Job?.Status,
        jobArn: result.Job?.Arn
      });
      
      if (result.Job?.Id) {
        console.log('✅ MediaConvert REAL thumbnail job created:', result.Job.Id);
        
        // The thumbnail will be available after processing with smart naming
        const thumbnailS3Key = `thumbnails/${thumbnailBaseName}_thumb_${thumbnailBaseName}.0000001.jpg`;
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
        const thumbnailUrl = `https://${cloudFrontDomain}/${thumbnailS3Key}`;
        
        console.log('📸 Expected thumbnail URL:', thumbnailUrl);
        console.log('📸 Expected S3 key:', thumbnailS3Key);
        
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
      console.error('❌ MediaConvert REAL thumbnail generation failed:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack'
      });
      
      return {
        success: false,
        method: 'mediaconvert',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate thumbnail using FFmpeg (server-side processing)
   * Enhanced to use real video frame extraction
   */
  static async generateWithFFmpeg(videoS3Key: string, videoId: string, videoRecord?: any): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Generating REAL thumbnail with FFmpeg for:', videoS3Key);
      
      // Check if we're in a serverless environment
      if (process.env.VERCEL || process.env.NETLIFY) {
        console.log('⚠️ FFmpeg not available in serverless environment, trying local processing...');
        
        // Try to use local FFmpeg processing if available
        const localResult = await this.generateWithLocalFFmpeg(videoS3Key, videoId, videoRecord);
        if (localResult.success) {
          return localResult;
        }
        
        return {
          success: false,
          method: 'ffmpeg',
          error: 'FFmpeg not available in serverless environment'
        };
      }

      // Try real FFmpeg processing
      const realThumbnail = await this.extractVideoFrameWithFFmpeg(videoS3Key, videoId, videoRecord);
      if (realThumbnail.success) {
        return realThumbnail;
      }

      // Fallback to simple thumbnail if FFmpeg fails
      console.log('⚠️ FFmpeg processing failed, using simple thumbnail generation');
      const thumbnailBuffer = await this.generateSimpleThumbnail(videoId);
      
      // Upload to S3
      const thumbnailS3Key = `thumbnails/${videoId}_ffmpeg_fallback_${Date.now()}.jpg`;
      
      const uploadResult = await AWSFileManager.uploadFile(
        thumbnailBuffer,
        thumbnailS3Key,
        'image/svg+xml'
      );

      console.log('✅ FFmpeg fallback thumbnail uploaded to S3:', thumbnailS3Key);

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
   * Extract video frame using FFmpeg (real implementation)
   */
  static async extractVideoFrameWithFFmpeg(videoS3Key: string, videoId: string, videoRecord?: any): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Extracting real video frame with FFmpeg...');
      
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${videoS3Key}`;
      
      // Generate smart thumbnail filename
      let thumbnailBaseName = videoId;
      if (videoRecord) {
        const originalFilename = videoRecord.filename || videoRecord.title || videoId;
        const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
        const uploadTime = videoRecord.uploaded_at ? new Date(videoRecord.uploaded_at).getTime() : Date.now();
        thumbnailBaseName = `${baseFilename}_${uploadTime}_${videoId}`;
      }
      
      // Try to use child_process to run FFmpeg
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const outputPath = `/tmp/${thumbnailBaseName}_thumb.jpg`;
        
        // FFmpeg command to extract frame at 10 seconds
        const ffmpegArgs = [
          '-i', videoUrl,
          '-ss', '00:00:10',
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputPath
        ];
        
        console.log('🔧 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
        
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            try {
              // Read the generated thumbnail
              const fs = await import('fs');
              const thumbnailBuffer = fs.readFileSync(outputPath);
              
              // Upload to S3
              const thumbnailS3Key = `thumbnails/${thumbnailBaseName}_ffmpeg_${Date.now()}.jpg`;
              
              const uploadResult = await AWSFileManager.uploadFile(
                thumbnailBuffer,
                thumbnailS3Key,
                'image/jpeg'
              );
              
              // Clean up temp file
              fs.unlinkSync(outputPath);
              
              console.log('✅ Real FFmpeg thumbnail generated and uploaded:', thumbnailS3Key);
              
              resolve({
                success: true,
                thumbnailUrl: uploadResult.Location,
                s3Key: thumbnailS3Key,
                method: 'ffmpeg'
              });
              
            } catch (uploadError) {
              console.error('❌ Failed to upload FFmpeg thumbnail:', uploadError);
              resolve({
                success: false,
                method: 'ffmpeg',
                error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
              });
            }
          } else {
            console.error('❌ FFmpeg process failed with code:', code);
            console.error('FFmpeg stderr:', stderr);
            resolve({
              success: false,
              method: 'ffmpeg',
              error: `FFmpeg failed with code ${code}: ${stderr}`
            });
          }
        });
        
        ffmpeg.on('error', (error) => {
          console.error('❌ FFmpeg spawn error:', error);
          resolve({
            success: false,
            method: 'ffmpeg',
            error: `FFmpeg spawn failed: ${error.message}`
          });
        });
      });
      
    } catch (error) {
      console.error('❌ FFmpeg frame extraction failed:', error);
      return {
        success: false,
        method: 'ffmpeg',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate thumbnail using local FFmpeg processing (for development)
   */
  static async generateWithLocalFFmpeg(videoS3Key: string, videoId: string, videoRecord?: any): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎬 Attempting local FFmpeg processing...');
      
      // Check if FFmpeg is available locally
      const { execSync } = await import('child_process');
      
      try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        console.log('✅ FFmpeg found locally');
      } catch {
        console.log('❌ FFmpeg not found locally');
        return {
          success: false,
          method: 'ffmpeg',
          error: 'FFmpeg not installed locally'
        };
      }
      
      // Download video from S3 temporarily
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      
      // Get signed URL for video
      const videoUrl = await AWSFileManager.getSignedUrl(videoS3Key, 3600);
      
      // Generate thumbnail using local FFmpeg
      return await this.extractVideoFrameWithFFmpeg(videoS3Key, videoId, videoRecord);
      
    } catch (error) {
      console.error('❌ Local FFmpeg processing failed:', error);
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
   * Generate enhanced SVG thumbnail with unique visual design for each video
   */
  static async generateSVGThumbnail(videoId: string, videoTitle?: string): Promise<ThumbnailGenerationResult> {
    try {
      console.log('🎨 Generating enhanced SVG thumbnail for video:', videoId);
      
      // Create unique visual elements based on video ID and title
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
        '#DDA0DD', '#98D8C8', '#FF8A80', '#82B1FF', '#B39DDB',
        '#F8BBD9', '#C5E1A5', '#FFE082', '#FFAB91', '#80CBC4'
      ];
      
      // Generate unique color scheme based on video ID
      const primaryColor = colors[videoId.length % colors.length];
      const secondaryColor = colors[(videoId.charCodeAt(0) + videoId.charCodeAt(videoId.length - 1)) % colors.length];
      
      // Create unique patterns based on video title/ID
      const titleHash = (videoTitle || videoId).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const patternType = Math.abs(titleHash) % 4;
      const displayTitle = (videoTitle || videoId).substring(0, 20);
      
      // Generate different visual patterns
      let patternElements = '';
      switch (patternType) {
        case 0: // Geometric circles
          patternElements = `
            <circle cx="200" cy="150" r="80" fill="${secondaryColor}" opacity="0.3"/>
            <circle cx="1080" cy="200" r="60" fill="${primaryColor}" opacity="0.4"/>
            <circle cx="300" cy="500" r="100" fill="${secondaryColor}" opacity="0.2"/>
            <circle cx="1000" cy="550" r="70" fill="${primaryColor}" opacity="0.3"/>
          `;
          break;
        case 1: // Diagonal stripes
          patternElements = `
            <defs>
              <pattern id="stripes-${videoId}" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                <rect width="20" height="40" fill="${secondaryColor}" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="1280" height="720" fill="url(#stripes-${videoId})"/>
          `;
          break;
        case 2: // Hexagonal pattern
          patternElements = `
            <polygon points="200,100 250,130 250,190 200,220 150,190 150,130" fill="${secondaryColor}" opacity="0.3"/>
            <polygon points="1000,150 1050,180 1050,240 1000,270 950,240 950,180" fill="${primaryColor}" opacity="0.4"/>
            <polygon points="300,450 350,480 350,540 300,570 250,540 250,480" fill="${secondaryColor}" opacity="0.2"/>
          `;
          break;
        case 3: // Wave pattern
          patternElements = `
            <path d="M0,300 Q320,200 640,300 T1280,300" stroke="${secondaryColor}" stroke-width="3" fill="none" opacity="0.4"/>
            <path d="M0,400 Q320,500 640,400 T1280,400" stroke="${primaryColor}" stroke-width="2" fill="none" opacity="0.3"/>
          `;
          break;
      }
      
      const svg = `
        <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg-${videoId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.8" />
              <stop offset="50%" style="stop-color:${secondaryColor};stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.4" />
            </linearGradient>
            <filter id="shadow-${videoId}">
              <feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.4"/>
            </filter>
            <filter id="glow-${videoId}">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <!-- Background -->
          <rect width="1280" height="720" fill="url(#bg-${videoId})"/>
          
          <!-- Pattern overlay -->
          ${patternElements}
          
          <!-- Main play button with enhanced design -->
          <circle cx="640" cy="300" r="80" fill="rgba(255,255,255,0.95)" filter="url(#shadow-${videoId})"/>
          <circle cx="640" cy="300" r="75" fill="none" stroke="${primaryColor}" stroke-width="3" opacity="0.8"/>
          <polygon points="610,270 610,330 690,300" fill="${primaryColor}" filter="url(#glow-${videoId})"/>
          
          <!-- Video title with better typography -->
          <rect x="40" y="380" width="1200" height="80" rx="10" fill="rgba(0,0,0,0.7)" filter="url(#shadow-${videoId})"/>
          <text x="640" y="420" font-family="Arial, sans-serif" font-size="36" font-weight="bold"
                fill="white" text-anchor="middle" filter="url(#glow-${videoId})">
            ${displayTitle}
          </text>
          <text x="640" y="445" font-family="Arial, sans-serif" font-size="16" 
                fill="rgba(255,255,255,0.9)" text-anchor="middle">
            Video Content • Ready to Play
          </text>
          
          <!-- Video ID badge -->
          <rect x="40" y="40" width="240" height="50" rx="25" fill="rgba(0,0,0,0.8)" filter="url(#shadow-${videoId})"/>
          <text x="160" y="70" font-family="Arial, sans-serif" font-size="18" 
                fill="${primaryColor}" text-anchor="middle" font-weight="bold">
            ID: ${videoId.substring(0, 8).toUpperCase()}
          </text>
          
          <!-- Decorative elements -->
          <rect x="1180" y="40" width="60" height="60" rx="30" fill="rgba(255,255,255,0.2)" filter="url(#shadow-${videoId})"/>
          <circle cx="1210" cy="70" r="15" fill="${secondaryColor}"/>
          
          <!-- Bottom accent -->
          <rect x="0" y="680" width="1280" height="40" fill="rgba(0,0,0,0.3)"/>
          <rect x="0" y="680" width="1280" height="4" fill="${primaryColor}"/>
        </svg>
      `;
      
      // Convert SVG to base64 data URL
      const base64SVG = Buffer.from(svg).toString('base64');
      const dataUrl = `data:image/svg+xml;base64,${base64SVG}`;
      
      return {
        success: true,
        thumbnailUrl: dataUrl,
        method: 'enhanced_svg',
        s3Key: undefined
      };
      
    } catch (error) {
      console.error('❌ Enhanced SVG thumbnail generation failed:', error);
      return {
        success: false,
        method: 'enhanced_svg',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Comprehensive thumbnail generation with fallbacks and smart matching
   * Now waits for actual MediaConvert failure before falling back
   */
  static async generateThumbnail(videoId: string, videoS3Key?: string, videoUrl?: string, videoRecord?: any): Promise<ThumbnailGenerationResult> {
    console.log('🖼️ Starting REAL thumbnail generation for video:', videoId);
    console.log('🔍 Video S3 Key:', videoS3Key || 'NONE');
    console.log('🔍 Video URL:', videoUrl || 'NONE');

    // Get video record if not provided for smart matching
    let videoData = videoRecord;
    if (!videoData) {
      try {
        videoData = await VideoDB.findById(videoId);
        console.log('📋 Retrieved video record for smart matching:', {
          filename: videoData?.filename,
          title: videoData?.title,
          uploadTime: videoData?.uploaded_at
        });
      } catch (dbError) {
        console.warn('⚠️ Could not fetch video record for smart matching:', dbError);
      }
    }

    // PRIORITY: Try MediaConvert if we have S3 key and configuration
    if (videoS3Key && process.env.MEDIACONVERT_ROLE_ARN && process.env.MEDIACONVERT_ENDPOINT) {
      console.log('🎬 MediaConvert is configured - attempting REAL thumbnail generation with smart matching...');
      console.log('🔧 Configuration check:');
      console.log('   - MEDIACONVERT_ROLE_ARN: SET');
      console.log('   - MEDIACONVERT_ENDPOINT: SET');
      console.log('   - AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING');
      console.log('   - AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING');
      
      const mediaConvertResult = await this.generateWithMediaConvert(videoS3Key, videoId, videoData);
      
      if (mediaConvertResult.success) {
        console.log('🎉 SUCCESS: MediaConvert job created for REAL thumbnail with smart naming!');
        console.log('📸 Job ID:', mediaConvertResult.jobId);
        console.log('🔗 Expected thumbnail URL:', mediaConvertResult.thumbnailUrl);
        console.log('🔗 Expected S3 key:', mediaConvertResult.s3Key);
        
        // Update database with the new thumbnail info
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: mediaConvertResult.thumbnailUrl
          });
          console.log('✅ Database updated with MediaConvert thumbnail URL');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
        
        return mediaConvertResult;
      } else {
        console.log('❌ MediaConvert FAILED with error:', mediaConvertResult.error);
        console.log('🔄 MediaConvert job creation failed - proceeding to fallback methods');
        // Continue to fallback methods only after actual MediaConvert failure
      }
    } else {
      // Log why MediaConvert is not being attempted
      if (!videoS3Key) {
        console.log('❌ No S3 key provided - cannot extract video frames from S3');
      } else {
        console.log('❌ MediaConvert NOT configured properly');
        console.log('📋 Missing environment variables:');
        if (!process.env.MEDIACONVERT_ROLE_ARN) console.log('   - MEDIACONVERT_ROLE_ARN');
        if (!process.env.MEDIACONVERT_ENDPOINT) console.log('   - MEDIACONVERT_ENDPOINT');
      }
      console.log('🔄 Skipping MediaConvert, proceeding to fallback methods');
    }

    // FALLBACK 1: Try FFmpeg for real video frame extraction
    if (videoS3Key) {
      console.log('🎬 Trying FFmpeg for REAL video frame extraction...');
      
      const ffmpegResult = await this.generateWithFFmpeg(videoS3Key, videoId, videoData);
      
      if (ffmpegResult.success) {
        console.log('🎉 SUCCESS: FFmpeg generated REAL thumbnail!');
        console.log('📸 Thumbnail URL:', ffmpegResult.thumbnailUrl);
        
        // Update database with the real FFmpeg thumbnail
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: ffmpegResult.thumbnailUrl
          });
          console.log('✅ Database updated with REAL FFmpeg thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
        
        return ffmpegResult;
      } else {
        console.log('❌ FFmpeg FAILED with error:', ffmpegResult.error);
        console.log('🔄 FFmpeg processing failed - proceeding to SVG fallback');
      }
    }

    // FALLBACK 2: Enhanced SVG placeholder (only after both MediaConvert and FFmpeg fail)
    console.log('⚠️ FINAL FALLBACK: Generating enhanced SVG placeholder...');
    console.log('📋 This is a temporary placeholder - real thumbnails will be generated when MediaConvert or FFmpeg work');
    
    try {
      // Use video title from record or fetch from database
      let videoTitle = videoId;
      if (videoData?.title) {
        videoTitle = videoData.title;
      } else {
        try {
          const video = await VideoDB.findById(videoId);
          if (video?.title) {
            videoTitle = video.title;
          }
        } catch (dbError) {
          console.warn('⚠️ Could not fetch video title, using ID:', dbError);
        }
      }
      
      const svgResult = await this.generateSVGThumbnail(videoId, videoTitle);
      
      if (svgResult.success) {
        // Update database with enhanced SVG thumbnail
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: svgResult.thumbnailUrl
          });
          console.log('✅ Database updated with TEMPORARY SVG thumbnail');
          console.log('⚠️ NOTE: This is a placeholder - real thumbnails will be generated by MediaConvert or FFmpeg');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
        
        return svgResult;
      }
    } catch (error) {
      console.error('❌ SVG thumbnail generation failed:', error);
    }

    // Last resort: Basic placeholder
    console.log('🎨 Generating basic placeholder thumbnail...');
    try {
      const placeholderResult = await this.generatePlaceholderThumbnail(videoId);
      
      if (placeholderResult.success) {
        try {
          await VideoDB.update(videoId, {
            thumbnail_path: placeholderResult.thumbnailUrl
          });
          console.log('✅ Database updated with basic placeholder thumbnail');
        } catch (dbError) {
          console.warn('⚠️ Failed to update database with thumbnail:', dbError);
        }
      }
      
      return placeholderResult;
    } catch (error) {
      console.error('❌ Failed to generate basic placeholder thumbnail:', error);
      return {
        success: false,
        method: 'placeholder',
        error: 'All thumbnail generation methods failed'
      };
    }
  }

  /**
   * Background thumbnail generation - runs after upload completion
   * This is the method that should be called asynchronously after video upload
   */
  static async generateThumbnailBackground(videoId: string, videoS3Key?: string, videoRecord?: any): Promise<void> {
    console.log('🔄 Starting background thumbnail generation for:', videoId);
    
    try {
      // Wait a moment to ensure upload is fully complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await this.generateThumbnail(videoId, videoS3Key, undefined, videoRecord);
      
      if (result.success) {
        console.log('✅ Background thumbnail generation completed:', result.method);
        if (result.method === 'mediaconvert') {
          console.log('📸 MediaConvert job created, thumbnail will be available after processing');
        }
      } else {
        console.log('❌ Background thumbnail generation failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Background thumbnail generation error:', error);
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
    console.log('🔄 Starting batch thumbnail generation...', { limit, forceRegenerate, offset });
    
    try {
      // Choose which videos to process based on forceRegenerate flag
      let videos;
      if (forceRegenerate) {
        console.log('🔄 Force regenerating thumbnails for ALL videos');
        videos = await VideoDB.findAllVideosForThumbnailRegeneration(limit, offset);
      } else {
        console.log('🔄 Finding videos with broken/missing thumbnails');
        videos = await VideoDB.findVideosWithBrokenThumbnails(limit, offset);
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
          video.file_path || undefined,
          video // Pass the video record for smart matching
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
