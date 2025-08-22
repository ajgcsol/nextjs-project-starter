import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { videoMonitor } from '@/lib/monitoring';
import MuxVideoProcessor from '@/lib/mux-video-processor';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get('id');
  
  // If no video ID provided, return system diagnostics including Mux config
  if (!videoId) {
    try {
      const systemDiagnostics = {
        timestamp: new Date().toISOString(),
        system: {
          environment: process.env.NODE_ENV || 'development',
          region: process.env.AWS_REGION || 'us-east-1'
        },
        aws: {
          hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
          bucketName: process.env.S3_BUCKET_NAME,
          cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
          region: process.env.AWS_REGION
        },
        mux: {
          tokenId: !!process.env.VIDEO_MUX_TOKEN_ID,
          tokenSecret: !!process.env.VIDEO_MUX_TOKEN_SECRET,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
          status: (process.env.VIDEO_MUX_TOKEN_ID && process.env.VIDEO_MUX_TOKEN_SECRET) ? 'configured' : 'missing_credentials'
        },
        environment: {
          VIDEO_MUX_TOKEN_ID: !!process.env.VIDEO_MUX_TOKEN_ID,
          VIDEO_MUX_TOKEN_SECRET: !!process.env.VIDEO_MUX_TOKEN_SECRET
        },
        database: {
          hasUrl: !!process.env.DATABASE_URL,
          status: 'unknown' as string,
          videoCount: undefined as number | undefined,
          error: undefined as string | undefined
        }
      };

      // Test database connectivity
      try {
        const testQuery = await VideoDB.findAll(1, 0); // Get 1 video to test connection
        systemDiagnostics.database.status = 'connected';
        systemDiagnostics.database.videoCount = testQuery.length;
      } catch (dbError) {
        systemDiagnostics.database.status = 'error';
        systemDiagnostics.database.error = dbError instanceof Error ? dbError.message : 'Unknown error';
      }

      return NextResponse.json(systemDiagnostics);
    } catch (error) {
      return NextResponse.json({
        error: 'System diagnostics failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }

  try {
    await videoMonitor.logVideoRequest(videoId, { action: 'diagnostics_start' });
    
    // Get video from database
    const video = await VideoDB.findById(videoId);
    
    if (!video) {
      return NextResponse.json({
        error: 'Video not found',
        videoId,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Test S3 connectivity and permissions
    const diagnostics = {
      videoId,
      timestamp: new Date().toISOString(),
      database: {
        found: true,
        title: video.title,
        s3_key: video.s3_key,
        s3_bucket: video.s3_bucket,
        file_path: video.file_path,
        file_size: video.file_size,
        is_processed: video.is_processed
      },
      aws: {
        region: process.env.AWS_REGION,
        hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        bucketName: process.env.S3_BUCKET_NAME
      },
      urls: {
        streamingEndpoint: `/api/videos/stream/${videoId}`,
        directS3: video.s3_key ? `https://${video.s3_bucket || process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${video.s3_key}` : null,
        cloudFront: process.env.CLOUDFRONT_DOMAIN ? `https://${process.env.CLOUDFRONT_DOMAIN}/${video.s3_key}` : null
      },
      tests: {} as any
    };

    // Test presigned URL generation
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
        Bucket: video.s3_bucket || process.env.S3_BUCKET_NAME!,
        Key: video.s3_key,
      });

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes
      
      diagnostics.tests.presignedUrl = {
        success: true,
        url: presignedUrl.substring(0, 100) + '...',
        expiresIn: 300
      };

      // Test if the presigned URL is accessible
      try {
        const headResponse = await fetch(presignedUrl, { method: 'HEAD' });
        diagnostics.tests.s3Access = {
          success: headResponse.ok,
          status: headResponse.status,
          statusText: headResponse.statusText,
          contentType: headResponse.headers.get('content-type'),
          contentLength: headResponse.headers.get('content-length'),
          lastModified: headResponse.headers.get('last-modified')
        };
      } catch (fetchError) {
        diagnostics.tests.s3Access = {
          success: false,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError)
        };
      }

    } catch (awsError) {
      diagnostics.tests.presignedUrl = {
        success: false,
        error: awsError instanceof Error ? awsError.message : String(awsError)
      };
    }

    // Log diagnostics to CloudWatch
    await videoMonitor.logVideoRequest(videoId, {
      action: 'diagnostics',
      results: diagnostics
    });

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('🔍 Diagnostics error:', error);
    
    await videoMonitor.logVideoError(videoId, 'Diagnostics failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : String(error),
      videoId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, s3Key, videoId } = body;

    if (action === 'test-mux-asset') {
      console.log('🎭 Testing Mux asset creation in production (v2)...');
      
      // Check Mux credentials first
      if (!process.env.VIDEO_MUX_TOKEN_ID || !process.env.VIDEO_MUX_TOKEN_SECRET) {
        return NextResponse.json({
          success: false,
          error: 'Mux credentials not configured',
          environment: {
            VIDEO_MUX_TOKEN_ID: !!process.env.VIDEO_MUX_TOKEN_ID,
            VIDEO_MUX_TOKEN_SECRET: !!process.env.VIDEO_MUX_TOKEN_SECRET
          }
        });
      }

      // Test Mux configuration
      const configTest = await MuxVideoProcessor.testConfiguration();
      
      if (!configTest.success) {
        return NextResponse.json({
          success: false,
          error: 'Mux configuration test failed',
          details: configTest.message,
          configTest
        });
      }

      // Try to create a test Mux asset
      try {
        const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
        const result = await MuxVideoProcessor.createAssetFromS3(s3Key, videoId, processingOptions);
        
        return NextResponse.json({
          success: result.success,
          assetId: result.assetId,
          playbackId: result.playbackId,
          thumbnailUrl: result.thumbnailUrl,
          streamingUrl: result.streamingUrl,
          mp4Url: result.mp4Url,
          processingStatus: result.processingStatus,
          error: result.error,
          configTest
        });
        
      } catch (muxError) {
        return NextResponse.json({
          success: false,
          error: 'Mux asset creation failed',
          details: muxError instanceof Error ? muxError.message : 'Unknown error',
          configTest
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action',
      supportedActions: ['test-mux-asset']
    });

  } catch (error) {
    console.error('🔍 POST diagnostics error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'POST diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
