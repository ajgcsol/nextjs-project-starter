import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { videoMonitor } from '@/lib/monitoring';
import { MediaDiscoveryService, VideoStreamResponse } from '@/lib/mediaDiscovery';
import { VideoConverter } from '@/lib/videoConverter';

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
      is_processed: video.is_processed,
      filename: video.filename
    });

    // Check if this is a WMV file that needs conversion
    const isWMVFile = video.filename && (
      video.filename.toLowerCase().endsWith('.wmv') ||
      video.s3_key?.toLowerCase().includes('.wmv')
    );

    if (isWMVFile) {
      console.log('🎬 WMV file detected, checking for converted version...');
      
      // Check if converted MP4 version exists
      const convertedS3Key = video.s3_key ? 
        video.s3_key.replace(/\.wmv$/i, '.mp4') : 
        `videos/${videoId}.mp4`;
      
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
      const convertedUrl = `https://${cloudFrontDomain}/${convertedS3Key}`;
      
      // Check if converted version exists
      const convertedExists = await MediaDiscoveryService.validateMediaUrl(convertedUrl);
      
      if (convertedExists) {
        console.log('✅ Found converted MP4 version, serving that instead');
        
        // Update database with converted path
        try {
          await VideoDB.updateVideoPath(videoId, convertedS3Key, convertedUrl);
          console.log('📝 Updated database with converted MP4 path');
        } catch (updateError) {
          console.warn('⚠️ Failed to update database with converted path:', updateError);
        }
        
        // Redirect to converted version
        const response = NextResponse.redirect(convertedUrl, 302);
        response.headers.set('Cache-Control', 'public, max-age=3600');
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Range');
        return response;
      } else {
        console.log('🔄 Converted version not found, initiating conversion...');
        
        // Trigger conversion if not already in progress
        try {
          const conversionResult = await VideoConverter.convertVideo(videoId, video.s3_key || '', video.filename || '');
          
          if (conversionResult.success) {
            console.log('✅ Conversion initiated successfully');
            console.log('🎬 Conversion initiated, but serving original file for now');
          } else {
            console.error('❌ Conversion failed:', conversionResult.error);
            console.log('⚠️ Attempting to serve original WMV file as fallback...');
          }
        } catch (conversionError) {
          console.error('❌ Conversion error:', conversionError);
          // Fall through to original logic
        }
      }
    }

    let videoUrl = '';
    let discoveryMethod = 'database';
    let discoveryAttempts: string[] = [];
    let shouldRepairDatabase = false;
    let discoveredS3Key = '';

    // Priority 1: Use existing S3 key to construct CloudFront URL (CloudFront is working!)
    if (video.s3_key) {
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
      videoUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
      discoveryMethod = 'database_s3_key_cloudfront';
      discoveryAttempts.push(`database_s3_key_cloudfront: ${videoUrl}`);
      console.log('🔗 Using CloudFront URL from database S3 key:', videoUrl);
      
      // CloudFront URLs are validated as working, skip validation for performance
      console.log('✅ CloudFront URL validated via testing - skipping runtime validation');
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

    // Check if this is a range request (for video seeking/progressive loading)
    const range = request.headers.get('range');
    
    // For small videos (<50MB), proxy through our API to avoid CORS issues
    // For large videos, still redirect but with better CORS handling
    const isSmallVideo = !video.size || video.size < 50 * 1024 * 1024; // 50MB threshold
    
    if (isSmallVideo || range) {
      console.log(`🔄 Proxying video (${video.size ? Math.round(video.size / 1024 / 1024) + 'MB' : 'unknown size'}) through API to avoid CORS issues`);
      
      try {
        // Fetch the video from CloudFront
        const videoResponse = await fetch(videoUrl, {
          headers: range ? { 'Range': range } : {}
        });
        
        if (!videoResponse.ok) {
          throw new Error(`CloudFront fetch failed: ${videoResponse.status}`);
        }
        
        // Get the video stream
        const videoStream = videoResponse.body;
        
        if (!videoStream) {
          throw new Error('No video stream available');
        }
        
        // Create response with proper headers
        const response = new NextResponse(videoStream, {
          status: range ? 206 : 200,
          headers: {
            'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
            'Content-Length': videoResponse.headers.get('content-length') || '',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600', // 1 hour cache for proxied content
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Length',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
            'Access-Control-Allow-Credentials': 'false'
          }
        });
        
        // Add range-specific headers if this is a partial content request
        if (range && videoResponse.status === 206) {
          const contentRange = videoResponse.headers.get('content-range');
          if (contentRange) {
            response.headers.set('Content-Range', contentRange);
          }
        }
        
        return response;
        
      } catch (proxyError) {
        console.error('❌ Video proxy failed, falling back to redirect:', proxyError);
        // Fall through to redirect logic below
      }
    }
    
    // For large videos or when proxy fails, redirect with proper CORS headers
    console.log(`🔄 Redirecting large video (${video.size ? Math.round(video.size / 1024 / 1024) + 'MB' : 'unknown size'}) to CloudFront`);
    
    const response = NextResponse.redirect(videoUrl, 302);
    
    // Set optimal headers for video streaming with correct CORS
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
    response.headers.set('Accept-Ranges', 'bytes');
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Range, Content-Range, Content-Length');
    response.headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    response.headers.set('Access-Control-Allow-Credentials', 'false');
    
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
