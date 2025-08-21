import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    // Get video from database
    const video = await VideoDB.findById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
    const testResults = {
      videoId,
      videoSize: video.size,
      videoTitle: video.title,
      s3Key: video.s3Key,
      tests: [] as any[]
    };

    // Test 1: Direct CloudFront URL
    if (video.s3_key) {
      const cloudFrontUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
      console.log(`Testing CloudFront URL: ${cloudFrontUrl}`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(cloudFrontUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        const responseTime = Date.now() - startTime;
        
        testResults.tests.push({
          test: 'CloudFront Direct URL',
          url: cloudFrontUrl,
          success: response.ok,
          status: response.status,
          responseTime,
          headers: {
            contentLength: response.headers.get('content-length'),
            contentType: response.headers.get('content-type'),
            cacheControl: response.headers.get('cache-control'),
            acceptRanges: response.headers.get('accept-ranges'),
            etag: response.headers.get('etag'),
            lastModified: response.headers.get('last-modified'),
            server: response.headers.get('server'),
            xCache: response.headers.get('x-cache'),
            xAmzCfId: response.headers.get('x-amz-cf-id')
          }
        });
      } catch (error) {
        testResults.tests.push({
          test: 'CloudFront Direct URL',
          url: cloudFrontUrl,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Range request support (critical for large videos)
    if (video.s3_key) {
      const cloudFrontUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
      console.log(`Testing range request: ${cloudFrontUrl}`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(cloudFrontUrl, { 
          method: 'GET',
          headers: {
            'Range': 'bytes=0-1023' // Request first 1KB
          },
          signal: AbortSignal.timeout(10000)
        });
        const responseTime = Date.now() - startTime;
        
        testResults.tests.push({
          test: 'Range Request Support',
          url: cloudFrontUrl,
          success: response.status === 206, // Partial Content
          status: response.status,
          responseTime,
          headers: {
            contentRange: response.headers.get('content-range'),
            contentLength: response.headers.get('content-length'),
            acceptRanges: response.headers.get('accept-ranges')
          }
        });
      } catch (error) {
        testResults.tests.push({
          test: 'Range Request Support',
          url: cloudFrontUrl,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 3: Our streaming endpoint
    const streamUrl = `/api/videos/stream/${videoId}`;
    console.log(`Testing streaming endpoint: ${streamUrl}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${request.nextUrl.origin}${streamUrl}`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      const responseTime = Date.now() - startTime;
      
      testResults.tests.push({
        test: 'Streaming Endpoint',
        url: streamUrl,
        success: response.ok,
        status: response.status,
        responseTime,
        redirected: response.redirected,
        finalUrl: response.url,
        headers: {
          contentType: response.headers.get('content-type'),
          cacheControl: response.headers.get('cache-control'),
          location: response.headers.get('location')
        }
      });
    } catch (error) {
      testResults.tests.push({
        test: 'Streaming Endpoint',
        url: streamUrl,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Video metadata check
    if (video.s3_key) {
      const cloudFrontUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
      console.log(`Testing video metadata: ${cloudFrontUrl}`);
      
      try {
        const startTime = Date.now();
        const response = await fetch(cloudFrontUrl, { 
          method: 'GET',
          headers: {
            'Range': 'bytes=0-8191' // First 8KB for metadata
          },
          signal: AbortSignal.timeout(10000)
        });
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(buffer);
          
          // Check for common video file signatures
          const isMP4 = uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70;
          const isWebM = uint8Array[0] === 0x1A && uint8Array[1] === 0x45 && uint8Array[2] === 0xDF && uint8Array[3] === 0xA3;
          
          testResults.tests.push({
            test: 'Video Metadata Check',
            url: cloudFrontUrl,
            success: true,
            status: response.status,
            responseTime,
            metadata: {
              fileSignature: Array.from(uint8Array.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '),
              isMP4,
              isWebM,
              dataSize: buffer.byteLength
            }
          });
        }
      } catch (error) {
        testResults.tests.push({
          test: 'Video Metadata Check',
          url: cloudFrontUrl,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Analysis and recommendations
    const analysis = {
      overallHealth: 'unknown',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    const cloudFrontTest = testResults.tests.find(t => t.test === 'CloudFront Direct URL');
    const rangeTest = testResults.tests.find(t => t.test === 'Range Request Support');
    const streamTest = testResults.tests.find(t => t.test === 'Streaming Endpoint');

    if (!cloudFrontTest?.success) {
      analysis.issues.push('CloudFront URL is not accessible');
      analysis.recommendations.push('Check S3 bucket permissions and CloudFront configuration');
    }

    if (!rangeTest?.success || rangeTest?.status !== 206) {
      analysis.issues.push('Range requests not supported - critical for large video streaming');
      analysis.recommendations.push('Enable range request support in CloudFront and S3');
    }

    if (!streamTest?.success) {
      analysis.issues.push('Streaming endpoint is failing');
      analysis.recommendations.push('Check streaming endpoint logic and timeout configurations');
    }

    if (video.size > 100 * 1024 * 1024 && !rangeTest?.success) {
      analysis.issues.push('Large video without range request support will cause timeouts');
      analysis.recommendations.push('Implement proper range request handling for videos over 100MB');
    }

    analysis.overallHealth = analysis.issues.length === 0 ? 'healthy' : 
                           analysis.issues.length <= 2 ? 'warning' : 'critical';

    return NextResponse.json({
      success: true,
      ...testResults,
      analysis
    });

  } catch (error) {
    console.error('CloudFront test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
