import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert';

export interface VideoOptimizationJob {
  jobId: string;
  videoId: string;
  status: 'SUBMITTED' | 'PROGRESSING' | 'COMPLETE' | 'ERROR';
  progress?: number;
  qualities: string[];
  outputPaths: Record<string, string>;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface OptimizationSettings {
  qualities: Array<{
    name: string;
    width: number;
    height: number;
    bitrate: number;
    framerate?: number;
  }>;
  generateThumbnails: boolean;
  generatePreviewSprites: boolean;
  outputFormat: 'mp4' | 'webm' | 'both';
}

export class VideoOptimizationService {
  private static s3Client: S3Client;
  private static mediaConvertClient: MediaConvertClient;
  private static bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
  private static mediaConvertRole = process.env.MEDIACONVERT_ROLE_ARN;
  private static mediaConvertEndpoint = process.env.MEDIACONVERT_ENDPOINT;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.s3Client;
  }

  private static getMediaConvertClient(): MediaConvertClient {
    if (!this.mediaConvertClient) {
      this.mediaConvertClient = new MediaConvertClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        endpoint: this.mediaConvertEndpoint,
      });
    }
    return this.mediaConvertClient;
  }

  /**
   * Get default optimization settings based on video characteristics
   */
  static getDefaultSettings(fileSize: number, duration: number): OptimizationSettings {
    const settings: OptimizationSettings = {
      qualities: [],
      generateThumbnails: true,
      generatePreviewSprites: true,
      outputFormat: 'mp4'
    };

    // Add quality variants based on file size
    if (fileSize > 2 * 1024 * 1024 * 1024) { // > 2GB
      settings.qualities.push(
        { name: '1080p', width: 1920, height: 1080, bitrate: 5000000 },
        { name: '720p', width: 1280, height: 720, bitrate: 2500000 },
        { name: '480p', width: 854, height: 480, bitrate: 1000000 },
        { name: '360p', width: 640, height: 360, bitrate: 500000 }
      );
    } else if (fileSize > 1 * 1024 * 1024 * 1024) { // > 1GB
      settings.qualities.push(
        { name: '720p', width: 1280, height: 720, bitrate: 2500000 },
        { name: '480p', width: 854, height: 480, bitrate: 1000000 },
        { name: '360p', width: 640, height: 360, bitrate: 500000 }
      );
    } else if (fileSize > 500 * 1024 * 1024) { // > 500MB
      settings.qualities.push(
        { name: '480p', width: 854, height: 480, bitrate: 1000000 },
        { name: '360p', width: 640, height: 360, bitrate: 500000 }
      );
    } else if (fileSize > 100 * 1024 * 1024) { // > 100MB
      settings.qualities.push(
        { name: '360p', width: 640, height: 360, bitrate: 500000 }
      );
    }

    return settings;
  }

  /**
   * Start video optimization job
   */
  static async startOptimization(
    videoId: string,
    inputS3Key: string,
    settings?: OptimizationSettings
  ): Promise<VideoOptimizationJob | null> {
    try {
      if (!this.mediaConvertRole || !this.mediaConvertEndpoint) {
        console.warn('MediaConvert not configured, skipping optimization');
        return null;
      }

      // Use default settings if none provided
      const optimizationSettings = settings || this.getDefaultSettings(0, 0);
      
      const inputUri = `s3://${this.bucketName}/${inputS3Key}`;
      const outputPath = `processed/${videoId}/`;

      // Create MediaConvert job
      const jobSettings = this.createMediaConvertJobSettings(
        inputUri,
        outputPath,
        optimizationSettings
      );

      const createJobCommand = new CreateJobCommand({
        Role: this.mediaConvertRole,
        Settings: jobSettings,
        UserMetadata: {
          videoId,
          createdBy: 'video-optimization-service'
        }
      });

      const mediaConvertClient = this.getMediaConvertClient();
      const result = await mediaConvertClient.send(createJobCommand);

      if (!result.Job?.Id) {
        throw new Error('Failed to create MediaConvert job');
      }

      // Create optimization job record
      const job: VideoOptimizationJob = {
        jobId: result.Job.Id,
        videoId,
        status: 'SUBMITTED',
        qualities: optimizationSettings.qualities.map(q => q.name),
        outputPaths: this.generateOutputPaths(outputPath, optimizationSettings),
        createdAt: new Date()
      };

      console.log(`✅ Started optimization job ${job.jobId} for video ${videoId}`);
      return job;

    } catch (error) {
      console.error('❌ Failed to start video optimization:', error);
      return null;
    }
  }

  /**
   * Check optimization job status
   */
  static async checkJobStatus(jobId: string): Promise<VideoOptimizationJob | null> {
    try {
      const mediaConvertClient = this.getMediaConvertClient();
      const getJobCommand = new GetJobCommand({ Id: jobId });
      const result = await mediaConvertClient.send(getJobCommand);

      if (!result.Job) {
        return null;
      }

      const job = result.Job;
      const status = job.Status as VideoOptimizationJob['status'];
      
      return {
        jobId,
        videoId: job.UserMetadata?.videoId || '',
        status,
        progress: job.JobPercentComplete,
        qualities: [], // Would need to parse from job settings
        outputPaths: {}, // Would need to parse from job settings
        createdAt: job.CreatedAt || new Date(),
        completedAt: job.Timing?.FinishTime,
        error: job.ErrorMessage
      };

    } catch (error) {
      console.error('❌ Failed to check job status:', error);
      return null;
    }
  }

  /**
   * Create MediaConvert job settings
   */
  private static createMediaConvertJobSettings(
    inputUri: string,
    outputPath: string,
    settings: OptimizationSettings
  ): any {
    const outputs = settings.qualities.map(quality => ({
      NameModifier: `_${quality.name}`,
      ContainerSettings: {
        Container: 'MP4',
        Mp4Settings: {
          CslgAtom: 'INCLUDE',
          FreeSpaceBox: 'EXCLUDE',
          MoovPlacement: 'PROGRESSIVE_DOWNLOAD'
        }
      },
      VideoDescription: {
        Width: quality.width,
        Height: quality.height,
        CodecSettings: {
          Codec: 'H_264',
          H264Settings: {
            MaxBitrate: quality.bitrate,
            RateControlMode: 'QVBR',
            QvbrSettings: {
              QvbrQualityLevel: 7
            },
            FramerateControl: 'INITIALIZE_FROM_SOURCE',
            GopClosedCadence: 1,
            GopSize: 90,
            GopSizeUnits: 'FRAMES',
            SlowPal: 'DISABLED',
            SpatialAdaptiveQuantization: 'ENABLED',
            TemporalAdaptiveQuantization: 'ENABLED',
            FlickerAdaptiveQuantization: 'DISABLED',
            EntropyEncoding: 'CABAC',
            Bitrate: quality.bitrate,
            FramerateConversionAlgorithm: 'DUPLICATE_DROP',
            CodecProfile: 'MAIN',
            CodecLevel: 'AUTO'
          }
        }
      },
      AudioDescriptions: [{
        AudioTypeControl: 'FOLLOW_INPUT',
        CodecSettings: {
          Codec: 'AAC',
          AacSettings: {
            AudioDescriptionBroadcasterMix: 'NORMAL',
            Bitrate: 96000,
            RateControlMode: 'CBR',
            CodecProfile: 'LC',
            CodingMode: 'CODING_MODE_2_0',
            RawFormat: 'NONE',
            SampleRate: 48000,
            Specification: 'MPEG4'
          }
        }
      }]
    }));

    // Add thumbnail output if requested
    if (settings.generateThumbnails) {
      outputs.push({
        NameModifier: '_thumbnail',
        ContainerSettings: {
          Container: 'RAW'
        },
        VideoDescription: {
          Width: 320,
          Height: 180,
          CodecSettings: {
            Codec: 'FRAME_CAPTURE',
            FrameCaptureSettings: {
              FramerateNumerator: 1,
              FramerateDenominator: 10,
              MaxCaptures: 1,
              Quality: 80
            }
          }
        }
      } as any);
    }

    return {
      Inputs: [{
        AudioSelectors: {
          'Audio Selector 1': {
            Offset: 0,
            DefaultSelection: 'DEFAULT',
            ProgramSelection: 1
          }
        },
        VideoSelector: {
          ColorSpace: 'FOLLOW'
        },
        FilterEnable: 'AUTO',
        PsiControl: 'USE_PSI',
        FilterStrength: 0,
        DeblockFilter: 'DISABLED',
        DenoiseFilter: 'DISABLED',
        TimecodeSource: 'EMBEDDED',
        FileInput: inputUri
      }],
      OutputGroups: [{
        Name: 'File Group',
        OutputGroupSettings: {
          Type: 'FILE_GROUP_SETTINGS',
          FileGroupSettings: {
            Destination: `s3://${this.bucketName}/${outputPath}`
          }
        },
        Outputs: outputs
      }]
    };
  }

  /**
   * Generate output paths for different qualities
   */
  private static generateOutputPaths(
    basePath: string,
    settings: OptimizationSettings
  ): Record<string, string> {
    const paths: Record<string, string> = {};
    
    settings.qualities.forEach(quality => {
      paths[quality.name] = `${basePath}${quality.name}.mp4`;
    });

    if (settings.generateThumbnails) {
      paths.thumbnail = `${basePath}thumbnail.jpg`;
    }

    return paths;
  }

  /**
   * Generate preview sprites for hover functionality
   */
  static async generatePreviewSprites(
    videoId: string,
    inputS3Key: string,
    duration: number
  ): Promise<{
    spriteSheetUrl: string;
    webVttUrl: string;
  } | null> {
    try {
      // This would typically use FFmpeg or similar to generate sprite sheets
      // For now, return placeholder URLs
      const spriteSheetUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/previews/${videoId}-sprite.jpg`;
      const webVttUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/previews/${videoId}-thumbnails.vtt`;

      // Generate WebVTT file for thumbnail navigation
      const webVttContent = this.generateWebVTT(videoId, duration);
      
      // Upload WebVTT to S3
      const s3Client = this.getS3Client();
      await s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `previews/${videoId}-thumbnails.vtt`,
        Body: webVttContent,
        ContentType: 'text/vtt',
        CacheControl: 'public, max-age=31536000'
      }));

      return {
        spriteSheetUrl,
        webVttUrl
      };

    } catch (error) {
      console.error('❌ Failed to generate preview sprites:', error);
      return null;
    }
  }

  /**
   * Generate WebVTT file for thumbnail navigation
   */
  private static generateWebVTT(videoId: string, duration: number): string {
    const interval = 10; // 10 second intervals
    const thumbnailCount = Math.ceil(duration / interval);
    const spriteUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/previews/${videoId}-sprite.jpg`;
    
    let webvtt = 'WEBVTT\n\n';
    
    for (let i = 0; i < thumbnailCount; i++) {
      const startTime = i * interval;
      const endTime = Math.min((i + 1) * interval, duration);
      
      // Calculate sprite position (assuming 10x10 grid)
      const col = i % 10;
      const row = Math.floor(i / 10);
      const x = col * 160; // 160px width per thumbnail
      const y = row * 90;  // 90px height per thumbnail
      
      webvtt += `${this.formatTime(startTime)} --> ${this.formatTime(endTime)}\n`;
      webvtt += `${spriteUrl}#xywh=${x},${y},160,90\n\n`;
    }
    
    return webvtt;
  }

  /**
   * Format time for WebVTT
   */
  private static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Check if video needs optimization
   */
  static shouldOptimize(fileSize: number, format: string): boolean {
    // Optimize if file is large or not in optimal format
    return fileSize > 100 * 1024 * 1024 || !['mp4', 'webm'].includes(format.toLowerCase());
  }

  /**
   * Get optimization progress for a video
   */
  static async getOptimizationProgress(videoId: string): Promise<{
    status: string;
    progress: number;
    availableQualities: string[];
    error?: string;
  }> {
    // This would typically query a database or job queue
    // For now, return a placeholder
    return {
      status: 'complete',
      progress: 100,
      availableQualities: ['original', '720p', '480p', '360p']
    };
  }
}

export default VideoOptimizationService;
