import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { VideoDB } from '@/lib/database';
import { videoMonitor, PerformanceMonitor } from '@/lib/monitoring';
import { SynchronousMuxProcessor } from '@/lib/synchronous-mux-processor';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for processing

/**
 * Enhanced video upload with synchronous thumbnail and transcript generation
 * This ensures thumbnails are ready before the upload completes
 */
export async function POST(request: NextRequest) {
  const uploadTimer = PerformanceMonitor.startTimer('sync-video-upload-request');
  
  await videoMonitor.logUploadEvent('SYNC VIDEO UPLOAD: Starting POST request', {
    method: 'POST',
    timestamp: new Date().toISOString(),
    syncProcessing: true
  });
  
  try {
    const contentType = request.headers.get('content-type');
    console.log('🎬 Content-Type:', contentType);
    
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }
    
    let data;
    try {
      data = await request.json();
      console.log('🎬 Received JSON data:', {
        title: data.title,
        filename: data.filename,
        size: data.size ? `${(data.size / (1024*1024)).toFixed(2)}MB` : 'unknown',
        s3Key: data.s3Key,
        hasPublicUrl: !!data.publicUrl,
        syncProcessing: data.syncProcessing !== false // Default to true
      });
    } catch (jsonError) {
      console.error('🎬 ❌ JSON parsing error:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON data in request body' },
        { status: 400 }
      );
    }
    
    const { 
      title, 
      description, 
      category, 
      tags, 
      visibility, 
      s3Key, 
      publicUrl, 
      filename, 
      size, 
      mimeType,
      syncProcessing = true // Enable sync processing by default
    } = data;

    if (!s3Key || !publicUrl || !filename) {
      console.log('🎬 ❌ Missing required S3 data:', { s3Key: !!s3Key, publicUrl: !!publicUrl, filename: !!filename });
      return NextResponse.json(
        { error: 'Missing required S3 upload data' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const fileId = crypto.randomUUID();
    console.log('🎬 Generated file ID:', fileId);

    // Determine processing strategy
    const shouldProcessSync = syncProcessing && 
      SynchronousMuxProcessor.shouldProcessSynchronously(size || 0, mimeType || 'video/mp4');
    
    console.log('🎬 Processing strategy:', {
      syncProcessing,
      shouldProcessSync,
      fileSize: size ? `${(size / (1024*1024)).toFixed(2)}MB` : 'unknown',
      mimeType,
      estimatedTime: SynchronousMuxProcessor.estimateProcessingTime(size || 0, mimeType || 'video/mp4')
    });

    let thumbnailUrl = null;
    let transcriptText = null;
    let captionsUrl = null;
    let muxAssetId = null;
    let muxPlaybackId = null;
    let processingStatus = 'pending';
    let processingTime = 0;

    if (shouldProcessSync) {
      console.log('🎬 ⚡ Starting synchronous processing...');
      
      try {
        const syncResult = await SynchronousMuxProcessor.processVideoSynchronously(
          s3Key,
          fileId,
          filename, // filename parameter
          size, // fileSize parameter
          120000 // maxWaitTime parameter - 2 minutes max wait
        );
        
        if (syncResult.success) {
          thumbnailUrl = syncResult.thumbnailUrl;
          transcriptText = syncResult.transcriptText;
          captionsUrl = syncResult.captionsUrl;
          muxAssetId = syncResult.muxAssetId;
          muxPlaybackId = syncResult.muxPlaybackId;
          processingStatus = 'ready';
          processingTime = syncResult.processingTime;
          
          console.log('🎬 ✅ Synchronous processing completed:', {
            thumbnailUrl: !!thumbnailUrl,
            transcriptText: !!transcriptText,
            processingTime: `${processingTime}ms`,
            muxAssetId
          });
          
          await videoMonitor.logUploadEvent('Synchronous processing completed', {
            processingTime,
            hasThumbnail: !!thumbnailUrl,
            hasTranscript: !!transcriptText,
            muxAssetId
          });
        } else {
          console.error('🎬 ❌ Synchronous processing failed:', syncResult.error);
          
          // Fall back to quick thumbnail generation
          console.log('🎬 🔄 Falling back to quick thumbnail generation...');
          const quickResult = await SynchronousMuxProcessor.generateQuickThumbnail(s3Key, fileId);
          
          if (quickResult.success) {
            thumbnailUrl = quickResult.thumbnailUrl;
            console.log('🎬 ✅ Quick thumbnail generated:', thumbnailUrl);
          }
          
          processingStatus = 'processing'; // Will be completed asynchronously
        }
      } catch (syncError) {
        console.error('🎬 ⚠️ Synchronous processing error:', syncError);
        processingStatus = 'processing'; // Will be completed asynchronously
      }
    } else {
      console.log('🎬 📤 Using asynchronous processing for large file');
      
      // For large files, start async processing but try to get a quick thumbnail
      try {
        const quickResult = await SynchronousMuxProcessor.generateQuickThumbnail(s3Key, fileId);
        if (quickResult.success) {
          thumbnailUrl = quickResult.thumbnailUrl;
          console.log('🎬 ✅ Quick thumbnail generated for large file:', thumbnailUrl);
        }
      } catch (quickError) {
        console.warn('🎬 ⚠️ Quick thumbnail generation failed:', quickError);
      }
      
      processingStatus = 'processing'; // Will be completed asynchronously
    }

    // Create video record with processing results
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    const optimizedStreamUrl = cloudFrontDomain 
      ? `https://${cloudFrontDomain}/${s3Key}`
      : publicUrl;

    console.log('🎬 Creating video record with processing results:', {
      fileId,
      thumbnailUrl: !!thumbnailUrl,
      transcriptText: !!transcriptText,
      processingStatus,
      muxAssetId: !!muxAssetId
    });

    try {
      const dbTimer = PerformanceMonitor.startTimer('database-save');
      
      const savedVideo = await VideoDB.create({
        title: title || filename.replace(/\.[^/.]+$/, ''),
        description: description || '',
        filename: filename,
        file_path: optimizedStreamUrl,
        file_size: size,
        duration: 0, // Will be updated when processing completes
        thumbnail_path: thumbnailUrl || `/api/videos/thumbnail/${fileId}`,
        video_quality: 'HD',
        uploaded_by: 'current-user',
        course_id: undefined,
        s3_key: s3Key,
        s3_bucket: process.env.S3_BUCKET_NAME || undefined,
        is_processed: processingStatus === 'ready',
        is_public: visibility === 'public',
        // Mux integration fields (will be saved if columns exist)
        mux_asset_id: muxAssetId || undefined,
        mux_playback_id: muxPlaybackId || undefined,
        mux_status: processingStatus,
        mux_thumbnail_url: thumbnailUrl || undefined,
        transcript_text: transcriptText || undefined,
        captions_webvtt_url: captionsUrl || undefined
      });

      const dbSaveTime = dbTimer();
      console.log('🎬 Video saved to database:', savedVideo.id);
      
      await videoMonitor.logDatabaseEvent('video_insert', true, {
        videoId: savedVideo.id,
        title: savedVideo.title,
        duration: dbSaveTime,
        syncProcessing: shouldProcessSync,
        hasThumbnail: !!thumbnailUrl
      });

      // Format response
      const formattedVideo = {
        id: savedVideo.id,
        title: savedVideo.title,
        description: savedVideo.description || '',
        category: category || 'General',
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        visibility: savedVideo.is_public ? 'public' : 'private',
        originalFilename: savedVideo.filename,
        storedFilename: savedVideo.filename,
        thumbnailPath: savedVideo.thumbnail_path,
        size: savedVideo.file_size,
        duration: savedVideo.duration,
        width: 1920, // Default values
        height: 1080,
        bitrate: savedVideo.file_size && savedVideo.duration ? 
          Math.round((savedVideo.file_size * 8) / savedVideo.duration) : 0,
        status: savedVideo.is_processed ? 'ready' : 'processing',
        uploadDate: savedVideo.uploaded_at,
        views: savedVideo.view_count || 0,
        streamUrl: `/api/videos/stream/${savedVideo.id}`,
        createdBy: 'Current User',
        metadata: {
          mimeType: mimeType || 'video/mp4',
          originalName: filename,
          s3Key: s3Key,
          cloudFrontUrl: optimizedStreamUrl,
          directUrl: savedVideo.file_path,
          syncProcessing: shouldProcessSync,
          processingTime,
          muxAssetId,
          hasThumbnail: !!thumbnailUrl,
          hasTranscript: !!transcriptText
        }
      };
      
      const uploadDuration = uploadTimer();
      await videoMonitor.logUploadEvent('Sync upload completed', {
        filename,
        videoId: savedVideo.id,
        duration: uploadDuration,
        syncProcessing: shouldProcessSync,
        processingTime,
        hasThumbnail: !!thumbnailUrl,
        hasTranscript: !!transcriptText
      });
      
      console.log('🎬 ✅ Sync upload completed successfully:', {
        videoId: savedVideo.id,
        hasThumbnail: !!thumbnailUrl,
        hasTranscript: !!transcriptText,
        processingStatus,
        totalTime: uploadDuration
      });
      
      return NextResponse.json({
        success: true,
        video: formattedVideo,
        message: shouldProcessSync ? 
          'Video uploaded with thumbnail and transcript ready' :
          'Video uploaded, processing in background',
        processing: {
          synchronous: shouldProcessSync,
          processingTime,
          thumbnailReady: !!thumbnailUrl,
          transcriptReady: !!transcriptText,
          status: processingStatus
        }
      });

    } catch (dbError) {
      console.error('🎬 Database save failed:', dbError);
      
      await videoMonitor.logDatabaseEvent('video_insert', false, {
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
      
      return NextResponse.json({
        success: false,
        error: 'Database connection failed - video upload aborted',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🎬 Sync upload error:', error);
    
    await videoMonitor.logUploadEvent('Sync upload failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { 
        error: 'Sync upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      );
    }
    
    const video = await VideoDB.findById(videoId);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      processing: {
        status: video.is_processed ? 'ready' : 'processing',
        hasThumbnail: !!video.thumbnail_path && !video.thumbnail_path.includes('/api/videos/thumbnail/'),
        hasTranscript: !!video.transcript_text,
        muxAssetId: video.mux_asset_id,
        muxStatus: video.mux_status
      }
    });
    
  } catch (error) {
    console.error('Processing status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check processing status' },
      { status: 500 }
    );
  }
}
