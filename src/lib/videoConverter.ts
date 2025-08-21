import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { MediaConvertClient, CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert';

export interface ConversionJob {
  jobId: string;
  status: 'SUBMITTED' | 'PROGRESSING' | 'COMPLETE' | 'ERROR' | 'CANCELED';
  inputS3Key: string;
  outputS3Key: string;
  progress?: number;
  errorMessage?: string;
}

export interface ConversionOptions {
  inputFormat: string;
  outputFormat: 'mp4' | 'webm';
  quality: 'high' | 'medium' | 'low';
  resolution?: '1080p' | '720p' | '480p' | 'original';
  generateThumbnail?: boolean;
}

export class VideoConverter {
  private s3Client: S3Client;
  private mediaConvertClient: MediaConvertClient;
  private bucketName: string;
  private mediaConvertRole: string;
  private mediaConvertEndpoint: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.mediaConvertClient = new MediaConvertClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      endpoint: process.env.MEDIACONVERT_ENDPOINT,
    });

    this.bucketName = process.env.S3_BUCKET_NAME!;
    this.mediaConvertRole = process.env.MEDIACONVERT_ROLE_ARN!;
    this.mediaConvertEndpoint = process.env.MEDIACONVERT_ENDPOINT!;
  }

  /**
   * Check if a video format needs conversion for web compatibility
   */
  static needsConversion(filename: string, mimeType?: string): boolean {
    const incompatibleFormats = [
      '.wmv', '.asf', '.avi', '.mov', '.flv', '.f4v', 
      '.3gp', '.3g2', '.rm', '.rmvb', '.vob', '.ts'
    ];
    
    const incompatibleMimeTypes = [
      'video/x-ms-wmv', 'video/x-ms-asf', 'video/x-msvideo',
      'video/quicktime', 'video/x-flv', 'video/3gpp',
      'video/x-pn-realvideo', 'application/vnd.rn-realmedia'
    ];

    const fileExtension = filename.toLowerCase();
    const needsConversionByExtension = incompatibleFormats.some(format => 
      fileExtension.endsWith(format)
    );

    const needsConversionByMimeType = mimeType && 
      incompatibleMimeTypes.includes(mimeType.toLowerCase());

    return needsConversionByExtension || needsConversionByMimeType;
  }

  /**
   * Get conversion settings based on input format and desired quality
   */
  private getConversionSettings(options: ConversionOptions) {
    const settings: any = {
      OutputGroups: [
        {
          Name: 'File Group',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${this.bucketName}/converted/`
            }
          },
          Outputs: []
        }
      ],
      Inputs: []
    };

    // Main MP4 output
    const mp4Output = {
      NameModifier: '_converted',
      ContainerSettings: {
        Container: 'MP4',
        Mp4Settings: {
          CslgAtom: 'INCLUDE' as const,
          FreeSpaceBox: 'EXCLUDE' as const,
          MoovPlacement: 'PROGRESSIVE_DOWNLOAD' as const
        }
      },
      VideoDescription: {
        CodecSettings: {
          Codec: 'H_264',
          H264Settings: {
            RateControlMode: 'QVBR',
            QvbrSettings: {
              QvbrQualityLevel: options.quality === 'high' ? 8 : options.quality === 'medium' ? 7 : 6
            },
            MaxBitrate: options.quality === 'high' ? 8000000 : options.quality === 'medium' ? 5000000 : 2000000
          }
        }
      },
      AudioDescriptions: [
        {
          CodecSettings: {
            Codec: 'AAC',
            AacSettings: {
              Bitrate: 128000,
              CodingMode: 'CODING_MODE_2_0',
              SampleRate: 48000
            }
          }
        }
      ]
    };

    // Add resolution settings if specified
    if (options.resolution && options.resolution !== 'original') {
      const resolutionMap = {
        '1080p': { width: 1920, height: 1080 },
        '720p': { width: 1280, height: 720 },
        '480p': { width: 854, height: 480 }
      };
      
      const { width, height } = resolutionMap[options.resolution];
      (mp4Output.VideoDescription as any).Width = width;
      (mp4Output.VideoDescription as any).Height = height;
      (mp4Output.VideoDescription as any).ScalingBehavior = 'DEFAULT';
    }

    settings.OutputGroups[0].Outputs.push(mp4Output);

    // Add thumbnail output if requested
    if (options.generateThumbnail) {
      const thumbnailOutput = {
        NameModifier: '_thumbnail',
        ContainerSettings: {
          Container: 'RAW'
        },
        VideoDescription: {
          Width: 1280,
          Height: 720,
          ScalingBehavior: 'DEFAULT',
          CodecSettings: {
            Codec: 'FRAME_CAPTURE',
            FrameCaptureSettings: {
              FramerateNumerator: 1,
              FramerateDenominator: 60,
              MaxCaptures: 1,
              Quality: 80
            }
          }
        }
      };
      settings.OutputGroups[0].Outputs.push(thumbnailOutput);
    }

    return settings;
  }

  /**
   * Start video conversion job using AWS MediaConvert
   */
  async startConversion(
    inputS3Key: string, 
    outputS3Key: string, 
    options: ConversionOptions
  ): Promise<ConversionJob> {
    try {
      console.log('🎬 Starting video conversion:', {
        inputS3Key,
        outputS3Key,
        options
      });

      const inputS3Url = `s3://${this.bucketName}/${inputS3Key}`;
      const settings = this.getConversionSettings(options);
      
      // Configure input
      settings.Inputs = [
        {
          FileInput: inputS3Url,
          AudioSelectors: {
            'Audio Selector 1': {
              Offset: 0,
              DefaultSelection: 'DEFAULT',
              ProgramSelection: 1
            }
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW'
          }
        }
      ];

      const jobParams = {
        Role: this.mediaConvertRole,
        Settings: settings,
        UserMetadata: {
          'original-key': inputS3Key,
          'output-key': outputS3Key,
          'conversion-type': 'web-compatibility',
          'input-format': options.inputFormat,
          'output-format': options.outputFormat,
          'quality': options.quality
        }
      };

      console.log('🎬 Creating MediaConvert job...');
      const command = new CreateJobCommand(jobParams);
      const result = await this.mediaConvertClient.send(command);

      if (!result.Job?.Id) {
        throw new Error('MediaConvert job creation failed - no job ID returned');
      }

      console.log('🎬 ✅ MediaConvert job created:', result.Job.Id);

      return {
        jobId: result.Job.Id,
        status: result.Job.Status as ConversionJob['status'],
        inputS3Key,
        outputS3Key,
        progress: 0
      };

    } catch (error) {
      console.error('🎬 ❌ MediaConvert job creation failed:', error);
      throw new Error(`Video conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check the status of a conversion job
   */
  async getJobStatus(jobId: string): Promise<ConversionJob> {
    try {
      const command = new GetJobCommand({ Id: jobId });
      const result = await this.mediaConvertClient.send(command);

      if (!result.Job) {
        throw new Error('Job not found');
      }

      return {
        jobId,
        status: result.Job.Status as ConversionJob['status'],
        inputS3Key: result.Job.UserMetadata?.['original-key'] || '',
        outputS3Key: result.Job.UserMetadata?.['output-key'] || '',
        progress: result.Job.JobPercentComplete || 0,
        errorMessage: result.Job.ErrorMessage
      };

    } catch (error) {
      console.error('🎬 ❌ Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * Convert video format for web compatibility
   * This is a simplified version that works without MediaConvert for basic cases
   */
  async convertForWebCompatibility(
    inputS3Key: string,
    filename: string,
    options: Partial<ConversionOptions> = {}
  ): Promise<{ outputS3Key: string; thumbnailS3Key?: string }> {
    
    // For now, we'll implement a basic approach that works without MediaConvert
    // In production, you'd use the MediaConvert implementation above
    
    const fileExtension = filename.toLowerCase();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    
    // Generate output keys
    const baseFilename = filename.replace(/\.[^/.]+$/, '');
    const outputS3Key = `converted/${baseFilename}_${timestamp}_${randomString}.mp4`;
    const thumbnailS3Key = options.generateThumbnail 
      ? `thumbnails/${baseFilename}_${timestamp}_${randomString}.jpg`
      : undefined;

    console.log('🎬 Video conversion simulation:', {
      inputS3Key,
      outputS3Key,
      thumbnailS3Key,
      needsConversion: VideoConverter.needsConversion(filename)
    });

    // For WMV and other incompatible formats, we'll create a placeholder
    // In production, this would trigger actual MediaConvert processing
    if (VideoConverter.needsConversion(filename)) {
      console.log('🎬 ⚠️ Video needs conversion but MediaConvert not configured');
      console.log('🎬 📝 TODO: Set up MediaConvert for automatic conversion');
      
      // Return the original key for now, but mark it as needing conversion
      return {
        outputS3Key: inputS3Key, // Use original until conversion is set up
        thumbnailS3Key
      };
    }

    // For compatible formats, return as-is
    return {
      outputS3Key: inputS3Key,
      thumbnailS3Key
    };
  }

  /**
   * Generate web-compatible formats and thumbnails
   */
  async processVideoForWeb(
    inputS3Key: string,
    filename: string,
    generateMultipleQualities: boolean = false
  ): Promise<{
    mp4S3Key: string;
    webmS3Key?: string;
    thumbnailS3Key?: string;
    conversionJobs: ConversionJob[];
  }> {
    
    const jobs: ConversionJob[] = [];
    const baseFilename = filename.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();

    try {
      // Always generate MP4 for maximum compatibility
      const mp4Job = await this.startConversion(
        inputS3Key,
        `converted/${baseFilename}_${timestamp}.mp4`,
        {
          inputFormat: filename.split('.').pop() || 'unknown',
          outputFormat: 'mp4',
          quality: 'high',
          resolution: 'original',
          generateThumbnail: true
        }
      );
      jobs.push(mp4Job);

      // Optionally generate WebM for better compression
      let webmJob: ConversionJob | undefined;
      if (generateMultipleQualities) {
        webmJob = await this.startConversion(
          inputS3Key,
          `converted/${baseFilename}_${timestamp}.webm`,
          {
            inputFormat: filename.split('.').pop() || 'unknown',
            outputFormat: 'webm',
            quality: 'high',
            resolution: 'original'
          }
        );
        jobs.push(webmJob);
      }

      return {
        mp4S3Key: mp4Job.outputS3Key,
        webmS3Key: webmJob?.outputS3Key,
        thumbnailS3Key: `thumbnails/${baseFilename}_${timestamp}.jpg`,
        conversionJobs: jobs
      };

    } catch (error) {
      console.error('🎬 ❌ Video processing failed:', error);
      throw error;
    }
  }

  /**
   * Wait for conversion job to complete
   */
  async waitForConversion(
    jobId: string, 
    maxWaitTime: number = 30 * 60 * 1000, // 30 minutes
    pollInterval: number = 30 * 1000 // 30 seconds
  ): Promise<ConversionJob> {
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const job = await this.getJobStatus(jobId);
      
      console.log('🎬 Conversion progress:', {
        jobId,
        status: job.status,
        progress: job.progress
      });

      if (job.status === 'COMPLETE') {
        console.log('🎬 ✅ Conversion completed successfully');
        return job;
      }

      if (job.status === 'ERROR' || job.status === 'CANCELED') {
        throw new Error(`Conversion failed: ${job.errorMessage || job.status}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Conversion timeout - job did not complete within maximum wait time');
  }
}

export default VideoConverter;
