import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { MediaConvertClient, CreateJobCommand, GetJobCommand, ListJobsCommand, ListJobTemplatesCommand } from '@aws-sdk/client-mediaconvert';
import { CloudFrontClient, CreateInvalidationCommand, GetDistributionCommand } from '@aws-sdk/client-cloudfront';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure AWS SDK with explicit credential handling and sanitization
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  // Remove all whitespace, newlines, carriage returns, and non-printable characters
  return credential.replace(/[\s\r\n\t\u0000-\u001f\u007f-\u009f]/g, '').trim();
};

const getAWSConfig = () => {
  // Get credentials from environment variables
  const accessKeyId = sanitizeCredential(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = sanitizeCredential(process.env.AWS_SECRET_ACCESS_KEY);
  const region = process.env.AWS_REGION || 'us-east-1';
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  const config = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };
  
  console.log('AWS Config Debug:', {
    region: config.region,
    accessKeyId: `${config.credentials.accessKeyId.substring(0, 4)}...`,
    secretAccessKey: `${config.credentials.secretAccessKey.substring(0, 4)}...`,
    accessKeyLength: config.credentials.accessKeyId.length,
    secretKeyLength: config.credentials.secretAccessKey.length
  });
  
  return config;
};

// Lazy-loaded AWS services
let _s3: S3Client | null = null;
let _mediaconvert: MediaConvertClient | null = null;
let _cloudfront: CloudFrontClient | null = null;
let _rds: RDSClient | null = null;

export const s3 = new Proxy({} as S3Client, {
  get(target, prop) {
    if (!_s3) {
      const config = getAWSConfig();
      _s3 = new S3Client(config);
    }
    return (_s3 as any)[prop];
  }
});

export const mediaconvert = new Proxy({} as MediaConvertClient, {
  get(target, prop) {
    if (!_mediaconvert) {
      const config = getAWSConfig();
      _mediaconvert = new MediaConvertClient({
        ...config,
        endpoint: process.env.MEDIACONVERT_ENDPOINT
      });
    }
    return (_mediaconvert as any)[prop];
  }
});

export const cloudfront = new Proxy({} as CloudFrontClient, {
  get(target, prop) {
    if (!_cloudfront) {
      const config = getAWSConfig();
      _cloudfront = new CloudFrontClient(config);
    }
    return (_cloudfront as any)[prop];
  }
});

export const rds = new Proxy({} as RDSClient, {
  get(target, prop) {
    if (!_rds) {
      const config = getAWSConfig();
      _rds = new RDSClient(config);
    }
    return (_rds as any)[prop];
  }
});

// S3 File Upload Functions
export class AWSFileManager {
  static async uploadFile(file: Buffer | Uint8Array, key: string, contentType: string, bucket?: string): Promise<{ Location: string; ETag: string; Bucket: string; Key: string }> {
    const bucketName = bucket || process.env.S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
      Metadata: {
        'upload-date': new Date().toISOString(),
        'uploaded-by': 'law-school-system'
      }
    };

    try {
      const command = new PutObjectCommand(uploadParams);
      const result = await s3.send(command);
      return {
        Location: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
        ETag: result.ETag || '',
        Bucket: bucketName,
        Key: key
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  static async deleteFile(key: string, bucket?: string): Promise<void> {
    const bucketName = bucket || process.env.S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      await s3.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600, bucket?: string): Promise<string> {
    const bucketName = bucket || process.env.S3_BUCKET_NAME;
    
    if (!bucketName) {
      throw new Error('S3 bucket name not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      });
      const url = await getSignedUrl(s3, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw error;
    }
  }

  static getPublicUrl(key: string, bucket?: string): string {
    const bucketName = bucket || process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    
    if (process.env.CLOUDFRONT_DOMAIN) {
      return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
    }
    
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
}

// MediaConvert Video Processing
export class AWSVideoProcessor {
  static async processVideo(inputUrl: string, outputPath: string, title: string): Promise<any> {
    if (!process.env.MEDIACONVERT_ROLE_ARN || !process.env.MEDIACONVERT_TEMPLATE) {
      throw new Error('MediaConvert configuration missing');
    }

    const jobParams: any = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      JobTemplate: process.env.MEDIACONVERT_TEMPLATE,
      Settings: {
        Inputs: [
          {
            FileInput: inputUrl,
            AudioSelectors: {
              'Audio Selector 1': {
                Offset: 0,
                DefaultSelection: 'DEFAULT' as const,
                ProgramSelection: 1
              }
            },
            VideoSelector: {
              ColorSpace: 'FOLLOW' as const
            }
          }
        ]
      },
      UserMetadata: {
        title: title,
        'processed-by': 'law-school-system',
        'processed-at': new Date().toISOString()
      }
    };

    try {
      const command = new CreateJobCommand(jobParams);
      const result = await mediaconvert.send(command);
      return result.Job!;
    } catch (error) {
      console.error('MediaConvert job creation error:', error);
      throw error;
    }
  }

  static async getJobStatus(jobId: string): Promise<any> {
    try {
      const command = new GetJobCommand({ Id: jobId });
      const result = await mediaconvert.send(command);
      return result.Job!;
    } catch (error) {
      console.error('MediaConvert job status error:', error);
      throw error;
    }
  }

  static async listJobs(status?: string): Promise<any[]> {
    const params: any = {
      MaxResults: 20,
      Order: 'DESCENDING'
    };

    if (status) {
      params.Status = status;
    }

    try {
      const command = new ListJobsCommand(params);
      const result = await mediaconvert.send(command);
      return result.Jobs || [];
    } catch (error) {
      console.error('MediaConvert list jobs error:', error);
      throw error;
    }
  }
}

// CloudFront Cache Management
export class AWSCDNManager {
  static async invalidateCache(paths: string[]): Promise<any> {
    if (!process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      throw new Error('CloudFront distribution ID not configured');
    }

    const invalidationParams = {
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `invalidation-${Date.now()}`,
        Paths: {
          Quantity: paths.length,
          Items: paths
        }
      }
    };

    try {
      const command = new CreateInvalidationCommand(invalidationParams);
      const result = await cloudfront.send(command);
      return result;
    } catch (error) {
      console.error('CloudFront invalidation error:', error);
      throw error;
    }
  }

  static async getDistributionInfo(): Promise<any> {
    if (!process.env.CLOUDFRONT_DISTRIBUTION_ID) {
      throw new Error('CloudFront distribution ID not configured');
    }

    try {
      const command = new GetDistributionCommand({
        Id: process.env.CLOUDFRONT_DISTRIBUTION_ID
      });
      const result = await cloudfront.send(command);
      return result.Distribution!;
    } catch (error) {
      console.error('CloudFront distribution info error:', error);
      throw error;
    }
  }
}

// Database Connection Health Check
export class AWSHealthCheck {
  static async checkDatabaseConnection(): Promise<{ status: string; message: string }> {
    try {
      const command = new DescribeDBInstancesCommand({
        DBInstanceIdentifier: process.env.DB_INSTANCE_IDENTIFIER
      });
      const result = await rds.send(command);

      const instance = result.DBInstances?.[0];
      if (instance?.DBInstanceStatus === 'available') {
        return {
          status: 'healthy',
          message: 'Database is available and running'
        };
      } else {
        return {
          status: 'unhealthy',
          message: `Database status: ${instance?.DBInstanceStatus || 'unknown'}`
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async checkS3Access(): Promise<{ status: string; message: string }> {
    const bucketName = process.env.S3_BUCKET_NAME;
    
    if (!bucketName) {
      return {
        status: 'error',
        message: 'S3 bucket name not configured'
      };
    }

    try {
      const command = new HeadBucketCommand({ Bucket: bucketName });
      await s3.send(command);
      return {
        status: 'healthy',
        message: 'S3 bucket is accessible'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `S3 access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async checkMediaConvert(): Promise<{ status: string; message: string }> {
    try {
      const command = new ListJobTemplatesCommand({ MaxResults: 1 });
      await mediaconvert.send(command);
      return {
        status: 'healthy',
        message: 'MediaConvert is accessible'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `MediaConvert check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async performFullHealthCheck(): Promise<{
    overall: string;
    services: {
      database: { status: string; message: string };
      s3: { status: string; message: string };
      mediaconvert: { status: string; message: string };
    };
  }> {
    const [database, s3Check, mediaconvertCheck] = await Promise.all([
      this.checkDatabaseConnection(),
      this.checkS3Access(),
      this.checkMediaConvert()
    ]);

    const allHealthy = [database, s3Check, mediaconvertCheck].every(service => service.status === 'healthy');

    return {
      overall: allHealthy ? 'healthy' : 'degraded',
      services: {
        database,
        s3: s3Check,
        mediaconvert: mediaconvertCheck
      }
    };
  }
}

// Utility functions
export const AWSUtils = {
  generateS3Key: (prefix: string, filename: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  },

  parseS3Url: (url: string): { bucket: string; key: string } | null => {
    const s3UrlRegex = /^https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/;
    const match = url.match(s3UrlRegex);
    
    if (match) {
      return {
        bucket: match[1],
        key: match[3]
      };
    }
    
    return null;
  },

  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
};

export default {
  AWSFileManager,
  AWSVideoProcessor,
  AWSCDNManager,
  AWSHealthCheck,
  AWSUtils
};
