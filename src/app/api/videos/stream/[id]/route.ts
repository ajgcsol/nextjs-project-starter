import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { videoMonitor } from '@/lib/monitoring';
import { MediaDiscoveryService, VideoStreamResponse } from '@/lib/mediaDiscovery';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    
    console.log('🎥 Video stream request for ID:', videoId);
    
    await videoMonitor.logVideoRequest(videoId, {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Get video from database
    const video = await VideoDB.findById(videoId);
    
    if (!video) {
      console.log('❌ Video not found in database:', videoId);
      await videoMonitor.logVideoError(videoId, 'Video not found in database');
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log('📹 Found video in database:', {
      id: video.id,
      title: video.title,
      s3_key: video.s3_key,
      file_path: video.file_path,
      is_processed: video.is_processed
    });

    let videoUrl = '';
    let discoveryMethod = 'database';
    let discoveryAttempts: string[] = [];
    let shouldRepairDatabase = false;
    let discoveredS3Key = '';

    // Priority 1: Use existing S3 key to construct CloudFront URL
    if (video.s3_key) {
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
      videoUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
      discoveryMethod = 'database_s3_key';
      discoveryAttempts.push(`database_s3_key: ${videoUrl}`);
      console.log('🔗 Using CloudFront URL from database S3 key:', videoUrl);
      
      // Validate the URL works
      const isValid = await MediaDiscoveryService.validateMediaUrl(videoUrl);
      if (!isValid) {
        console.log('⚠️ Database S3 key URL is invalid, falling back to discovery');
        videoUrl = '';
        discoveryAttempts.push(`database_s3_key_invalid: ${videoUrl}`);
      }
    }

    // Priority 2: Use stored file_path if it looks like a valid CloudFront/S3 URL
    if (!videoUrl && video.file_path && (
      video.file_path.includes('cloudfront.net') || 
      video.file_path.includes('amazonaws.com') ||
      video.file_path.startsWith('https://')
    )) {
      videoUrl = video.file_path;
      discoveryMethod = 'database_file_path';
      discoveryAttempts.push(`database_file_path: ${videoUrl}`);
      console.log('🔗 Using stored file path:', videoUrl);
      
      // Validate the URL works
      const isValid = await MediaDiscoveryService.validateMediaUrl(videoUrl);
      if (!isValid) {
        console.log('⚠️ Database file path URL is invalid, falling back to discovery');
        videoUrl = '';
        discoveryAttempts.push(`database_file_path_invalid: ${videoUrl}`);
      }
    }

    // Priority 3: Comprehensive video discovery using MediaDiscoveryService
    if (!videoUrl) {
      console.log('🔍 No valid URL from database, starting comprehensive discovery...');
      
      const discoveryResult = await MediaDiscoveryService.discoverVideo(videoId);
      
      if (discoveryResult.found && discoveryResult.url) {
        videoUrl = discoveryResult.url;
        discoveryMethod = discoveryResult.method;
        discoveredS3Key = discoveryResult.s3Key || '';
        shouldRepairDatabase = true;
        
        discoveryAttempts.push(`${discoveryResult.method}: ${videoUrl}`);
        console.log(`✅ Video discovered via ${discoveryResult.method}:`, videoUrl);
        
        // Repair database record with discovered information
        if (shouldRepairDatabase && discoveredS3Key) {
          try {
            await VideoDB.repairVideoRecord(videoId, discoveredS3Key, undefined, videoUrl, undefined);
            console.log('✅ Database record repaired with discovered S3 key');
          } catch (repairError) {
            console.warn('⚠️ Failed to repair database record:', repairError);
          }
        }
      } else {
        discoveryAttempts.push(`comprehensive_discovery: failed`);
        console.log('❌ Comprehensive discovery failed');
      }
    }

    // Priority 4: Generate presigned URL as absolute last resort
    if (!videoUrl && (video.s3_key || discoveredS3Key)) {
      try {
        console.log('🔐 Generating presigned URL as last resort...');
        const s3Key = video.s3_key || discoveredS3Key;
        
        videoUrl = await MediaDiscoveryService.generatePresignedFallback(s3Key);
        discoveryMethod = 'presigned_fallback';
        discoveryAttempts.push(`presigned_fallback: ${s3Key}`);
        console.log('✅ Generated presigned URL as fallback');
        
      } catch (presignedError) {
        console.error('❌ Failed to generate presigned URL:', presignedError);
        discoveryAttempts.push(`presigned_fallback: failed`);
      }
    }

    // If still no URL found, return comprehensive error
    if (!videoUrl) {
      console.log('❌ All video discovery methods failed');
      
      const errorResponse: VideoStreamResponse = {
        success: false,
        error: 'Video URL not available after comprehensive discovery',
        metadata: {
          discoveryAttempts,
          s3Key: video.s3_key,
          directUrl: video.file_path
        }
      };
      
      await videoMonitor.logVideoError(videoId, 'All discovery methods failed', {
        videoData: {
          id: video.id,
          s3_key: video.s3_key,
          file_path: video.file_path,
          s3_bucket: video.s3_bucket
        },
        discoveryAttempts
      });
      
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log('✅ Final video URL:', videoUrl);
    console.log('📊 Discovery method:', discoveryMethod);
    console.log('🔍 Discovery attempts:', discoveryAttempts);

    // Log successful stream
    await videoMonitor.logVideoSuccess(videoId, videoUrl, Date.now());

    // Increment view count
    try {
      await VideoDB.incrementViews(videoId);
    } catch (viewError) {
      console.warn('⚠️ Failed to increment view count:', viewError);
    }

    // Always redirect large videos (>100MB) directly to CloudFront to avoid timeout
    const isLargeVideo = video.size && video.size > 100 * 1024 * 1024; // 100MB threshold
    const range = request.headers.get('range');
    
    // For all videos, especially large ones, redirect directly to CloudFront
    // This prevents Vercel timeout issues and leverages CloudFront's optimized delivery
    console.log(`🔄 Redirecting video (${video.size ? Math.round(video.size / 1024 / 1024) + 'MB' : 'unknown size'}) directly to CloudFront`);
    
    const response = NextResponse.redirect(videoUrl, 302);
    
    // Set optimal headers for video streaming
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
    response.headers.set('Accept-Ranges', 'bytes');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
    response.headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    
    // Add video-specific headers
    if (range) {
      response.headers.set('Vary', 'Range');
    }
    
    return response;

  } catch (error) {
    console.error('❌ Video stream error:', error);
    
    const { id: videoId } = await params;
    await videoMonitor.logVideoError(videoId, 'Stream endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const errorResponse: VideoStreamResponse = {
      success: false,
      error: 'Failed to stream video',
      metadata: {
        discoveryAttempts: ['endpoint_error'],
        directUrl: error instanceof Error ? error.message : 'Unknown error'
      }
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Add a POST endpoint for manual video URL testing/repair
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'discover') {
      console.log('🔍 Manual discovery request for video:', videoId);
      
      // Perform comprehensive discovery
      const discoveryResult = await MediaDiscoveryService.discoverVideo(videoId);
      
      if (discoveryResult.found && discoveryResult.url && discoveryResult.s3Key) {
        // Repair database record
        try {
          await VideoDB.repairVideoRecord(videoId, discoveryResult.s3Key, undefined, discoveryResult.url, undefined);
          
          return NextResponse.json({
            success: true,
            discovered: true,
            repaired: true,
            videoUrl: discoveryResult.url,
            s3Key: discoveryResult.s3Key,
            method: discoveryResult.method
          });
        } catch (repairError) {
          return NextResponse.json({
            success: true,
            discovered: true,
            repaired: false,
            videoUrl: discoveryResult.url,
            s3Key: discoveryResult.s3Key,
            method: discoveryResult.method,
            repairError: repairError instanceof Error ? repairError.message : 'Unknown error'
          });
        }
      } else {
        return NextResponse.json({
          success: false,
          discovered: false,
          error: 'Video not found through discovery methods'
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "discover".' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Manual discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
