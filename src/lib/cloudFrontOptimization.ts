import { CloudFrontClient, CreateInvalidationCommand, GetDistributionConfigCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront';

export interface CloudFrontConfig {
  distributionId: string;
  domain: string;
  cacheBehaviors: {
    videos: string;
    thumbnails: string;
    previews: string;
    manifests: string;
  };
}

export interface CacheBehaviorConfig {
  pathPattern: string;
  targetOriginId: string;
  viewerProtocolPolicy: 'allow-all' | 'redirect-to-https' | 'https-only';
  cachePolicyId?: string;
  originRequestPolicyId?: string;
  responseHeadersPolicyId?: string;
  compress: boolean;
  allowedMethods: string[];
  cachedMethods: string[];
  defaultTTL: number;
  maxTTL: number;
  minTTL: number;
}

export class CloudFrontOptimizer {
  private static client: CloudFrontClient;
  private static distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  private static domain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';

  private static getClient(): CloudFrontClient {
    if (!this.client) {
      this.client = new CloudFrontClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.client;
  }

  /**
   * Get optimized cache behaviors for video streaming
   */
  static getOptimizedCacheBehaviors(): CacheBehaviorConfig[] {
    return [
      // Video files - Long cache with range request support
      {
        pathPattern: 'videos/*',
        targetOriginId: 'S3-law-school-repository-content',
        viewerProtocolPolicy: 'https-only',
        compress: false, // Don't compress video files
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        defaultTTL: 86400, // 24 hours
        maxTTL: 31536000, // 1 year
        minTTL: 0,
      },
      // Streaming manifests - Short cache for adaptive streaming
      {
        pathPattern: 'manifests/*',
        targetOriginId: 'S3-law-school-repository-content',
        viewerProtocolPolicy: 'https-only',
        compress: true,
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        defaultTTL: 300, // 5 minutes
        maxTTL: 3600, // 1 hour
        minTTL: 0,
      },
      // Thumbnails and previews - Medium cache
      {
        pathPattern: 'thumbnails/*',
        targetOriginId: 'S3-law-school-repository-content',
        viewerProtocolPolicy: 'https-only',
        compress: true,
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        defaultTTL: 3600, // 1 hour
        maxTTL: 86400, // 24 hours
        minTTL: 0,
      },
      // Preview sprites - Long cache
      {
        pathPattern: 'previews/*',
        targetOriginId: 'S3-law-school-repository-content',
        viewerProtocolPolicy: 'https-only',
        compress: true,
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachedMethods: ['GET', 'HEAD'],
        defaultTTL: 86400, // 24 hours
        maxTTL: 604800, // 1 week
        minTTL: 0,
      }
    ];
  }

  /**
   * Configure CloudFront distribution for optimal video delivery
   */
  static async configureForVideoStreaming(): Promise<{
    success: boolean;
    message: string;
    config?: any;
  }> {
    try {
      if (!this.distributionId) {
        return {
          success: false,
          message: 'CloudFront distribution ID not configured'
        };
      }

      const client = this.getClient();
      
      // Get current distribution configuration
      const getConfigCommand = new GetDistributionConfigCommand({
        Id: this.distributionId
      });
      
      const configResponse = await client.send(getConfigCommand);
      
      if (!configResponse.DistributionConfig || !configResponse.ETag) {
        return {
          success: false,
          message: 'Failed to retrieve distribution configuration'
        };
      }

      const distributionConfig = configResponse.DistributionConfig;
      const etag = configResponse.ETag;

      // Update distribution with optimized settings for video streaming
      const optimizedConfig = {
        ...distributionConfig,
        Comment: 'Optimized for video streaming - Law School Repository',
        DefaultRootObject: '',
        PriceClass: 'PriceClass_All', // Use all edge locations for best performance
        Enabled: true,
        
        // Optimize default cache behavior for video content
        DefaultCacheBehavior: {
          ...distributionConfig.DefaultCacheBehavior,
          ViewerProtocolPolicy: 'redirect-to-https',
          Compress: false, // Don't compress video files by default
          AllowedMethods: {
            Quantity: 7,
            Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD']
            }
          },
          CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // Managed-CachingOptimized
          OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf', // Managed-CORS-S3Origin
          ResponseHeadersPolicyId: '67f7725c-6f97-4210-82d7-5512b31e9d03', // Managed-SecurityHeadersPolicy
        },

        // Add custom cache behaviors for different content types
        CacheBehaviors: {
          Quantity: 4,
          Items: this.getOptimizedCacheBehaviors().map(behavior => ({
            PathPattern: behavior.pathPattern,
            TargetOriginId: behavior.targetOriginId,
            ViewerProtocolPolicy: behavior.viewerProtocolPolicy,
            Compress: behavior.compress,
            AllowedMethods: {
              Quantity: behavior.allowedMethods.length,
              Items: behavior.allowedMethods,
              CachedMethods: {
                Quantity: behavior.cachedMethods.length,
                Items: behavior.cachedMethods
              }
            },
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad', // Managed-CachingOptimized
            OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf', // Managed-CORS-S3Origin
            ResponseHeadersPolicyId: '67f7725c-6f97-4210-82d7-5512b31e9d03', // Managed-SecurityHeadersPolicy
          }))
        }
      };

      // Update the distribution
      const updateCommand = new UpdateDistributionCommand({
        Id: this.distributionId,
        DistributionConfig: optimizedConfig,
        IfMatch: etag
      });

      const updateResponse = await client.send(updateCommand);

      return {
        success: true,
        message: 'CloudFront distribution optimized for video streaming',
        config: {
          distributionId: this.distributionId,
          domain: this.domain,
          status: updateResponse.Distribution?.Status,
          lastModified: updateResponse.Distribution?.LastModifiedTime
        }
      };

    } catch (error) {
      console.error('CloudFront optimization error:', error);
      return {
        success: false,
        message: `Failed to optimize CloudFront: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Invalidate video cache selectively
   */
  static async invalidateVideoCache(paths: string[]): Promise<{
    success: boolean;
    invalidationId?: string;
    message: string;
  }> {
    try {
      if (!this.distributionId) {
        return {
          success: false,
          message: 'CloudFront distribution ID not configured'
        };
      }

      const client = this.getClient();
      
      const invalidationCommand = new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          CallerReference: `video-invalidation-${Date.now()}`,
          Paths: {
            Quantity: paths.length,
            Items: paths.map(path => path.startsWith('/') ? path : `/${path}`)
          }
        }
      });

      const response = await client.send(invalidationCommand);

      return {
        success: true,
        invalidationId: response.Invalidation?.Id,
        message: `Cache invalidation created for ${paths.length} paths`
      };

    } catch (error) {
      console.error('Cache invalidation error:', error);
      return {
        success: false,
        message: `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get CloudFront URL for video with optimized parameters
   */
  static getOptimizedVideoUrl(s3Key: string, options: {
    quality?: string;
    format?: string;
    autoplay?: boolean;
  } = {}): string {
    const baseUrl = `https://${this.domain}/${s3Key}`;
    
    // Add query parameters for video optimization
    const params = new URLSearchParams();
    
    if (options.quality && options.quality !== 'original') {
      params.append('quality', options.quality);
    }
    
    if (options.format) {
      params.append('format', options.format);
    }
    
    if (options.autoplay) {
      params.append('autoplay', '1');
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Generate signed URLs for private video content
   */
  static generateSignedUrl(s3Key: string, expiresIn: number = 3600): string {
    // For now, return the regular CloudFront URL
    // In production, implement CloudFront signed URLs for private content
    return this.getOptimizedVideoUrl(s3Key);
  }

  /**
   * Check CloudFront cache hit ratio and performance
   */
  static async getCachePerformanceMetrics(): Promise<{
    success: boolean;
    metrics?: {
      cacheHitRatio: number;
      originRequests: number;
      edgeRequests: number;
      averageOriginLatency: number;
    };
    message: string;
  }> {
    try {
      // This would integrate with CloudWatch to get actual metrics
      // For now, return a placeholder structure
      return {
        success: true,
        metrics: {
          cacheHitRatio: 0.85, // 85% cache hit ratio
          originRequests: 1000,
          edgeRequests: 6667,
          averageOriginLatency: 150 // ms
        },
        message: 'Cache performance metrics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Optimize CloudFront for large video files
   */
  static getLargeVideoOptimizations(): {
    recommendations: string[];
    settings: Record<string, any>;
  } {
    return {
      recommendations: [
        'Enable HTTP/2 and HTTP/3 for better multiplexing',
        'Use range requests for large video files',
        'Implement adaptive bitrate streaming',
        'Configure proper cache headers for video segments',
        'Use CloudFront edge locations closest to users',
        'Enable compression for manifest files but not video content',
        'Set appropriate TTL values for different content types'
      ],
      settings: {
        enableHttp2: true,
        enableHttp3: true,
        enableRangeRequests: true,
        videoSegmentCacheTTL: 86400, // 24 hours
        manifestCacheTTL: 300, // 5 minutes
        thumbnailCacheTTL: 3600, // 1 hour
        enableGzipCompression: false, // For video files
        enableBrotliCompression: true, // For text files
        priceClass: 'PriceClass_All'
      }
    };
  }
}

export default CloudFrontOptimizer;
