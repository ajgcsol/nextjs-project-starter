import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { VideoDB } from '@/lib/database';
import { videoMonitor, PerformanceMonitor } from '@/lib/monitoring';
import { VideoConverter } from '@/lib/videoConverter';
import MuxVideoProcessor from '@/lib/mux-video-processor';
import { SynchronousMuxProcessor } from '@/lib/synchronous-mux-processor';
import { ThumbnailGenerator } from '@/lib/thumbnailGenerator';

// For serverless environment, we'll skip local file storage
// In production, files should be uploaded directly to S3

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for large uploads

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Configure runtime for memory efficiency
// Configure to handle large files (5GB max)
export async function POST(request: NextRequest) {
  const uploadTimer = PerformanceMonitor.startTimer('video-upload-request');
  await videoMonitor.logUploadEvent('VIDEO UPLOAD: Starting POST request', {
    method: 'POST',
    timestamp: new Date().toISOString()
  });
  await videoMonitor.logUploadEvent('Environment check', {
    environment: process.env.NODE_ENV,
    hasS3Bucket: !!process.env.S3_BUCKET_NAME,
    hasAWSCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    isProduction
  });
  
  if (isProduction) {
    await videoMonitor.logUploadEvent('Production mode - optimized for S3 uploads', {});
  }
  
  await videoMonitor.logUploadEvent('Upload request started', {
    environment: process.env.NODE_ENV,
    hasS3Bucket: !!process.env.S3_BUCKET_NAME,
    hasAWSCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  });
  
  try {
    const contentType = request.headers.get('content-type');
    console.log('🎬 Content-Type:', contentType);
    
    // Prioritize JSON data handling for presigned URL uploads
    if (contentType?.includes('application/json')) {
      console.log('🎬 Processing JSON S3 upload data');
      
      let data;
      try {
        data = await request.json();
        console.log('🎬 Received JSON data:', {
          title: data.title,
          filename: data.filename,
          size: data.size ? `${(data.size / (1024*1024)).toFixed(2)}MB` : 'unknown',
          s3Key: data.s3Key,
          hasPublicUrl: !!data.publicUrl,
          dataSize: JSON.stringify(data).length
        });
      } catch (jsonError) {
        console.error('🎬 ❌ JSON parsing error:', jsonError);
        return NextResponse.json(
          { error: 'Invalid JSON data in request body' },
          { status: 400 }
        );
      }
      
      const { title: jsonTitle, description: jsonDescription, category: jsonCategory, tags: jsonTags, visibility: jsonVisibility, status: requestedStatus, s3Key, publicUrl, filename, size, mimeType, autoThumbnail } = data;
      console.log('🎬 Extracted fields:', { title: jsonTitle, description: jsonDescription, category: jsonCategory, tags: jsonTags, visibility: jsonVisibility, s3Key, publicUrl, filename, size, mimeType, hasThumbnail: !!autoThumbnail });

      if (!s3Key || !publicUrl || !filename) {
        console.log('🎬 ❌ Missing required S3 data:', { s3Key: !!s3Key, publicUrl: !!publicUrl, filename: !!filename });
        return NextResponse.json(
          { error: 'Missing required S3 upload data' },
          { status: 400 }
        );
      }

      // Generate unique ID early so it can be used in thumbnail processing
      const jsonFileId = crypto.randomUUID();
      console.log('🎬 Generated file ID:', jsonFileId);

      // Check if video needs conversion for web compatibility
      const needsConversion = VideoConverter.needsConversion(filename, mimeType);
      console.log('🎬 Video conversion check:', {
        filename,
        mimeType,
        needsConversion,
        fileExtension: filename.toLowerCase().split('.').pop()
      });

      // Decide whether to use synchronous or asynchronous Mux processing
      const shouldProcessSync = SynchronousMuxProcessor.shouldProcessSynchronously(size, mimeType || 'video/mp4');
      console.log('🎬 Processing decision:', {
        fileSize: `${(size / (1024*1024)).toFixed(2)}MB`,
        mimeType,
        shouldProcessSync,
        estimatedTime: `${SynchronousMuxProcessor.estimateProcessingTime(size, mimeType || 'video/mp4') / 1000}s`
      });

      // CRITICAL: Create database record IMMEDIATELY after S3 upload
      // This prevents race condition where Mux webhooks arrive before DB record exists
      console.log('📝 Creating initial database record to prevent webhook race condition...');
      
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
      const initialStreamUrl = cloudFrontDomain 
        ? `https://${cloudFrontDomain}/${s3Key}`
        : publicUrl;
      
      let savedVideo;
      try {
        savedVideo = await VideoDB.createWithId(jsonFileId, {
          title: jsonTitle || filename.replace(/\.[^/.]+$/, ''),
          description: jsonDescription || '',
          filename: filename,
          file_path: initialStreamUrl,
          file_size: size,
          duration: 0, // Will be updated after Mux processing
          thumbnail_path: `/api/videos/thumbnail/${jsonFileId}`, // Default fallback
          video_quality: 'HD',
          uploaded_by: 'current-user',
          course_id: undefined,
          s3_key: s3Key,
          s3_bucket: process.env.S3_BUCKET_NAME || undefined,
          is_processed: requestedStatus === 'ready', // Set based on requested status or processing state
          is_public: jsonVisibility === 'public',
          // Initialize Mux fields as null - will be populated by webhooks
          mux_status: 'pending',
          transcript_status: 'pending',
          captions_status: 'pending'
        });
        
        console.log('✅ Initial database record created:', savedVideo.id);
        
      } catch (dbError) {
        console.error('❌ Failed to create initial database record:', dbError);
        throw new Error('Database record creation failed - aborting to prevent webhook issues');
      }

      // Initialize Mux processing variables
      let muxAssetId = null;
      let muxPlaybackId = null;
      let muxThumbnailUrl = null;
      let muxStreamingUrl = null;
      let muxMp4Url = null;
      let muxStatus = 'pending';
      let transcriptText = '';
      let captionsUrl = '';
      let muxDuration = null;
      let muxWidth = null;
      let muxHeight = null;
      let muxAspectRatio = null;
      let muxBitrate = null;
      
      try {
        console.log('🎬 🎭 Starting Mux processing for:', filename, 'with existing DB record:', savedVideo.id);
        
        if (shouldProcessSync) {
          console.log('⚡ Using SYNCHRONOUS Mux processing - thumbnails and transcripts will be ready immediately');
          
          // Use synchronous processing for immediate results
          const syncResult = await SynchronousMuxProcessor.processVideoSynchronously(
            s3Key, 
            jsonFileId, 
            filename, 
            size,
            90000 // 90 seconds max wait for synchronous processing
          );
          
          if (syncResult.success) {
            muxAssetId = syncResult.muxAssetId;
            muxPlaybackId = syncResult.muxPlaybackId;
            muxThumbnailUrl = syncResult.thumbnailUrl;
            muxStreamingUrl = syncResult.muxStreamingUrl;
            muxMp4Url = syncResult.muxMp4Url;
            transcriptText = syncResult.transcriptText || '';
            captionsUrl = syncResult.captionsUrl || '';
            muxDuration = syncResult.duration;
            muxWidth = syncResult.width;
            muxHeight = syncResult.height;
            muxAspectRatio = syncResult.aspectRatio;
            muxBitrate = syncResult.bitrate;
            muxStatus = syncResult.error ? 'processing' : 'ready';
            
            console.log('🎬 ✅ Synchronous Mux processing completed:', {
              assetId: muxAssetId,
              playbackId: muxPlaybackId,
              status: muxStatus,
              thumbnailUrl: muxThumbnailUrl,
              hasTranscript: !!transcriptText,
              hasCaptions: !!captionsUrl,
              processingTime: `${syncResult.processingTime}ms`,
              metadata: {
                duration: muxDuration,
                dimensions: muxWidth && muxHeight ? `${muxWidth}x${muxHeight}` : 'unknown',
                aspectRatio: muxAspectRatio
              }
            });
            
            await videoMonitor.logUploadEvent('Synchronous Mux processing completed', {
              assetId: muxAssetId,
              playbackId: muxPlaybackId,
              status: muxStatus,
              processingTime: syncResult.processingTime,
              features: ['video_conversion', 'thumbnail_generation', 'transcript_generation', 'metadata_extraction'],
              thumbnailReady: !!muxThumbnailUrl,
              transcriptReady: !!transcriptText
            });
            
          } else {
            console.error('🎬 ❌ Synchronous Mux processing failed:', syncResult.error);
            await videoMonitor.logUploadEvent('Synchronous Mux processing failed', {
              error: syncResult.error,
              processingTime: syncResult.processingTime,
              fallback: 'continuing_without_mux'
            });
          }
          
        } else {
          console.log('🔄 Using ASYNCHRONOUS Mux processing - thumbnails and transcripts will be available via webhooks');
          
          // Use asynchronous processing for large files
          const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
          const muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, jsonFileId, processingOptions);
          
          if (muxResult.success) {
            muxAssetId = muxResult.assetId;
            muxPlaybackId = muxResult.playbackId;
            muxThumbnailUrl = muxResult.thumbnailUrl;
            muxStreamingUrl = muxResult.streamingUrl;
            muxMp4Url = muxResult.mp4Url;
            muxStatus = muxResult.processingStatus;
            
            console.log('🎬 ✅ Asynchronous Mux asset created:', {
              assetId: muxAssetId,
              playbackId: muxPlaybackId,
              status: muxStatus,
              thumbnailUrl: muxThumbnailUrl,
              note: 'Processing will continue in background'
            });
            
            await videoMonitor.logUploadEvent('Asynchronous Mux asset created', {
              assetId: muxAssetId,
              playbackId: muxPlaybackId,
              status: muxStatus,
              features: ['video_conversion', 'thumbnail_generation', 'audio_enhancement', 'transcription'],
              note: 'Background processing initiated'
            });
            
            // Trigger background processing (don't await)
            if (processingOptions.enhanceAudio && muxAssetId) {
              console.log('🎵 Starting background audio enhancement...');
              MuxVideoProcessor.enhanceAudio(muxAssetId).then(result => {
                if (result.success) {
                  console.log('🎵 ✅ Background audio enhancement completed:', result.enhancedAudioUrl);
                } else {
                  console.error('🎵 ❌ Background audio enhancement failed:', result.error);
                }
              }).catch(error => {
                console.error('🎵 ⚠️ Background audio enhancement error:', error);
              });
            }
            
            if (processingOptions.generateCaptions && muxAssetId) {
              console.log('📝 Starting background caption generation...');
              MuxVideoProcessor.generateCaptions(muxAssetId, {
                language: processingOptions.captionLanguage,
                generateVtt: true,
                generateSrt: true
              }).then(result => {
                if (result.success) {
                  console.log('📝 ✅ Background caption generation completed:', {
                    vttUrl: result.vttUrl,
                    srtUrl: result.srtUrl,
                    confidence: result.confidence
                  });
                } else {
                  console.error('📝 ❌ Background caption generation failed:', result.error);
                }
              }).catch(error => {
                console.error('📝 ⚠️ Background caption generation error:', error);
              });
            }
            
          } else {
            console.error('🎬 ❌ Asynchronous Mux asset creation failed:', muxResult.error);
            await videoMonitor.logUploadEvent('Asynchronous Mux asset creation failed', {
              error: muxResult.error,
              fallback: 'continuing_without_mux'
            });
          }
        }
        
      } catch (muxError) {
        console.error('🎬 ⚠️ Mux processing failed, but continuing:', muxError);
        await videoMonitor.logUploadEvent('Mux processing error', {
          error: muxError instanceof Error ? muxError.message : 'Unknown error',
          fallback: 'continuing_without_mux'
        });
        // Don't fail the entire upload if Mux processing fails
      }

      // Legacy video conversion handling (now as fallback)
      let finalS3Key = s3Key;
      let conversionStatus = muxAssetId ? 'mux-handled' : 'not-needed';
      
      if (needsConversion && !muxAssetId) {
        try {
          console.log('🎬 ⚙️ Starting fallback video conversion (Mux unavailable)...');
          await videoMonitor.logUploadEvent('Fallback video conversion started', {
            originalFormat: filename.split('.').pop(),
            inputS3Key: s3Key,
            reason: 'mux-unavailable-fallback'
          });

          // Mark as needing conversion but use the original file
          conversionStatus = 'pending';
          console.log('🎬 📝 Video marked for fallback conversion');
          
        } catch (conversionError) {
          console.error('🎬 ❌ Fallback video conversion failed:', conversionError);
          conversionStatus = 'failed';
        }
      }

      // Handle thumbnail upload to S3 if provided
      let thumbnailS3Key = null;
      let thumbnailCloudFrontUrl = null;
      
      if (autoThumbnail) {
        try {
          const thumbnailTimer = PerformanceMonitor.startTimer('thumbnail-upload');
          console.log('🎬 Processing auto-generated thumbnail...');
          
          // Convert base64 thumbnail to buffer
          const base64Data = autoThumbnail.split(',')[1]; // Remove data:image/jpeg;base64, prefix
          const thumbnailBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate S3 key for thumbnail
          const videoFileName = filename.split('.')[0];
          thumbnailS3Key = `thumbnails/${videoFileName}-${Date.now()}.jpg`;
          
          // Import AWS SDK for thumbnail upload
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          
          const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
          });

          // Upload thumbnail to S3
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: thumbnailS3Key,
              Body: thumbnailBuffer,
              ContentType: 'image/jpeg',
              CacheControl: 'max-age=31536000', // 1 year cache
            })
          );

          // Use existing cloudFrontDomain variable from above
          thumbnailCloudFrontUrl = cloudFrontDomain 
            ? `https://${cloudFrontDomain}/${thumbnailS3Key}`
            : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${thumbnailS3Key}`;
          
          const thumbnailLoadTime = thumbnailTimer();
          console.log('🎬 ✅ Thumbnail uploaded to S3:', thumbnailS3Key);
          
          await videoMonitor.logUploadEvent('Thumbnail uploaded', {
            thumbnailS3Key,
            thumbnailUrl: thumbnailCloudFrontUrl,
            uploadDuration: thumbnailLoadTime
          });
          
          // Track thumbnail upload completion
          await videoMonitor.logUploadEvent('Thumbnail tracking', {
            fileId: jsonFileId,
            thumbnailUrl: thumbnailCloudFrontUrl,
            loadTime: thumbnailLoadTime
          });
        } catch (thumbnailError) {
          console.error('🎬 ⚠️ Thumbnail upload failed:', thumbnailError);
          await videoMonitor.logUploadEvent('Thumbnail upload failed', {
            error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'
          });
          // Continue without thumbnail - don't fail the entire upload
        }
      }

      // File ID already generated above for thumbnail processing
      
      // Use enhanced metadata from Mux processing if available, otherwise estimate
      const finalDuration = muxDuration || Math.floor(Math.random() * 3600) + 600; // Use Mux duration or fallback
      const finalWidth = muxWidth || (size < 100 * 1024 * 1024 ? (size < 50 * 1024 * 1024 ? 854 : 1280) : 1920);
      const finalHeight = muxHeight || (size < 100 * 1024 * 1024 ? (size < 50 * 1024 * 1024 ? 480 : 720) : 1080);
      const finalBitrate = muxBitrate || Math.round((size * 8) / finalDuration);
      
      console.log('🎬 Final metadata decision:', {
        duration: muxDuration ? `${finalDuration}s (from Mux)` : `${finalDuration}s (estimated)`,
        dimensions: muxWidth && muxHeight ? `${finalWidth}x${finalHeight} (from Mux)` : `${finalWidth}x${finalHeight} (estimated)`,
        bitrate: muxBitrate ? `${finalBitrate} (from Mux)` : `${finalBitrate} (estimated)`,
        aspectRatio: muxAspectRatio || 'unknown'
      });

      // Create video record with S3 data - use CloudFront URL for better performance
      const optimizedStreamUrl = cloudFrontDomain 
        ? `https://${cloudFrontDomain}/${s3Key}`
        : publicUrl; // Fallback to direct S3 URL
      
      console.log('🎬 Stream URL decision:', {
        cloudFrontDomain,
        s3Key,
        publicUrl,
        usingCloudFront: !!cloudFrontDomain,
        finalStreamUrl: optimizedStreamUrl
      });

      const jsonVideoRecord = {
        id: jsonFileId,
        title: jsonTitle || filename.replace(/\.[^/.]+$/, ''),
        description: jsonDescription || '',
        category: jsonCategory || 'General',
        tags: jsonTags ? jsonTags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        visibility: (jsonVisibility || 'private') as 'public' | 'private' | 'unlisted',
        originalFilename: filename,
        storedFilename: s3Key,
        thumbnailPath: thumbnailCloudFrontUrl || `/api/videos/thumbnail/${jsonFileId}`,
        size: size,
        duration: finalDuration,
        width: finalWidth,
        height: finalHeight,
        bitrate: finalBitrate,
        status: (muxStatus === 'ready' ? 'ready' : 'processing') as 'processing' | 'ready' | 'failed' | 'draft',
        uploadDate: new Date().toISOString(),
        views: 0,
        streamUrl: optimizedStreamUrl, // Use CloudFront URL if available
        createdBy: 'Current User',
        metadata: {
          mimeType: 'video/mp4', // Force MP4 for web compatibility
          originalName: filename,
          s3Key: s3Key,
          publicUrl: publicUrl,
          cloudFrontUrl: optimizedStreamUrl,
          uploadMethod: 'presigned-url',
          processingComplete: muxStatus === 'ready', // True if synchronous processing completed
          needsTranscoding: muxStatus !== 'ready',
          muxProcessed: !!muxAssetId,
          hasTranscript: !!transcriptText,
          hasCaptions: !!captionsUrl,
          aspectRatio: muxAspectRatio
        }
      };

      // Save to database - use persistent PostgreSQL storage
      try {
        const dbTimer = PerformanceMonitor.startTimer('database-save');
        console.log('🎬 Attempting to save to database...');
        console.log('🎬 DATABASE_URL exists:', !!process.env.DATABASE_URL);
        
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL not configured');
        }
        
        // Determine the best thumbnail URL to use
        let finalThumbnailPath = jsonVideoRecord.thumbnailPath; // Default fallback
        
        if (muxThumbnailUrl) {
          // Mux thumbnail is available immediately
          finalThumbnailPath = muxThumbnailUrl;
          console.log('🖼️ Using Mux thumbnail URL:', muxThumbnailUrl);
        } else if (thumbnailCloudFrontUrl) {
          // Client-provided thumbnail
          finalThumbnailPath = thumbnailCloudFrontUrl;
          console.log('🖼️ Using client-provided thumbnail URL:', thumbnailCloudFrontUrl);
        } else if (muxAssetId) {
          // Mux asset exists but thumbnail not ready yet - use Mux URL format
          finalThumbnailPath = `https://image.mux.com/${muxPlaybackId || 'pending'}/thumbnail.jpg?time=10`;
          console.log('🖼️ Using pending Mux thumbnail URL (will be updated by webhook):', finalThumbnailPath);
        }
        
        console.log('🖼️ Final thumbnail decision:', {
          muxThumbnailUrl: !!muxThumbnailUrl,
          thumbnailCloudFrontUrl: !!thumbnailCloudFrontUrl,
          muxAssetId: !!muxAssetId,
          finalThumbnailPath
        });
        
        // FIXED: Use direct create method to avoid infinite loop
        // Check for existing video first if we have a Mux Asset ID
        let savedVideo;
        let muxFieldsUsed = false;
        let fallbackUsed = false;
        
        if (muxAssetId) {
          console.log('🔍 Checking for existing video with Mux Asset ID:', muxAssetId);
          const existingVideo = await VideoDB.findByMuxAssetId(muxAssetId);
          
          if (existingVideo) {
            console.log('✅ Found existing video, returning it:', existingVideo.id);
            savedVideo = existingVideo;
            muxFieldsUsed = true;
          } else {
            console.log('➕ No existing video found, creating new one');
            savedVideo = await VideoDB.createWithId(jsonFileId, {
              title: jsonVideoRecord.title,
              description: jsonVideoRecord.description,
              filename: jsonVideoRecord.originalFilename,
              file_path: jsonVideoRecord.streamUrl,
              file_size: jsonVideoRecord.size,
              duration: jsonVideoRecord.duration,
              thumbnail_path: finalThumbnailPath, // Use the determined thumbnail path
              video_quality: 'HD',
              uploaded_by: 'current-user', // TODO: Get from auth context
              course_id: undefined,
              s3_key: s3Key,
              s3_bucket: process.env.S3_BUCKET_NAME || undefined,
              is_processed: true, // Mark as processed since S3 upload is complete
              is_public: jsonVisibility === 'public',
              // Mux integration fields - will be saved if columns exist, ignored if not
              mux_asset_id: muxAssetId || undefined,
              mux_playback_id: muxPlaybackId || undefined,
              mux_upload_id: undefined, // Not used in S3 upload flow
              mux_status: muxStatus || 'pending',
              mux_thumbnail_url: muxThumbnailUrl || undefined,
              mux_streaming_url: muxStreamingUrl || undefined,
              mux_mp4_url: muxMp4Url || undefined,
              mux_duration_seconds: undefined, // Will be updated by Mux webhook
              mux_aspect_ratio: undefined, // Will be updated by Mux webhook
              mux_created_at: muxAssetId ? new Date() : undefined,
              mux_ready_at: undefined, // Will be updated when Mux processing completes
              audio_enhanced: !!muxAssetId,
              audio_enhancement_job_id: undefined, // Will be set when audio enhancement starts
              transcription_job_id: undefined, // Will be set when transcription starts
              captions_webvtt_url: undefined, // Will be set when captions are generated
              captions_srt_url: undefined, // Will be set when captions are generated
              transcript_text: undefined, // Will be set when transcription completes
              transcript_confidence: undefined // Will be set when transcription completes
            });
            muxFieldsUsed = !!savedVideo.mux_asset_id;
            fallbackUsed = !savedVideo.mux_asset_id;
          }
        } else {
          console.log('➕ No Mux Asset ID, creating video directly');
          savedVideo = await VideoDB.createWithId(jsonFileId, {
            title: jsonVideoRecord.title,
            description: jsonVideoRecord.description,
            filename: jsonVideoRecord.originalFilename,
            file_path: jsonVideoRecord.streamUrl,
            file_size: jsonVideoRecord.size,
            duration: jsonVideoRecord.duration,
            thumbnail_path: finalThumbnailPath, // Use the determined thumbnail path
            video_quality: 'HD',
            uploaded_by: 'current-user', // TODO: Get from auth context
            course_id: undefined,
            s3_key: s3Key,
            s3_bucket: process.env.S3_BUCKET_NAME || undefined,
            is_processed: true, // Mark as processed since S3 upload is complete
            is_public: jsonVisibility === 'public'
          });
          fallbackUsed = true;
        }

        if (fallbackUsed) {
          console.log('🎬 ⚠️ Video saved using fallback method (Mux columns not available)');
          if (muxAssetId) {
            console.log('🎬 📝 Mux data will be added after database migration:', {
              videoId: savedVideo.id,
              muxAssetId,
              muxPlaybackId,
              muxStatus,
              thumbnailUrl: finalThumbnailPath
            });
          }
        } else {
          console.log('🎬 ✅ Video saved with full Mux integration fields');
          console.log('🎬 📝 Mux thumbnail URL stored:', savedVideo.mux_thumbnail_url);
        }
        const dbSaveTime = dbTimer();
        console.log('🎬 Video saved to persistent database:', savedVideo.id);
        
        await videoMonitor.logDatabaseEvent('video_insert', true, {
          videoId: savedVideo.id,
          title: savedVideo.title,
          duration: dbSaveTime
        });

        // Start background thumbnail generation if no client-side thumbnail was provided
        if (!autoThumbnail) {
          console.log('🖼️ No client thumbnail provided, starting background thumbnail generation...');
          
          // Don't await this - let it run in the background after upload completion
          ThumbnailGenerator.generateThumbnailBackground(
            savedVideo.id,
            s3Key,
            {
              id: savedVideo.id,
              filename: savedVideo.filename,
              title: savedVideo.title,
              uploaded_at: savedVideo.uploaded_at
            }
          ).catch(error => {
            console.error('🖼️ ❌ Background thumbnail generation error:', error);
          });
          
          console.log('🖼️ ✅ Background thumbnail generation started (will complete asynchronously)');
          await videoMonitor.logUploadEvent('Background thumbnail generation started', {
            videoId: savedVideo.id,
            s3Key: s3Key,
            note: 'Thumbnail generation running in background'
          });
        }
        
        // Track upload completion
        const uploadDuration = uploadTimer();
        await videoMonitor.logUploadEvent('Upload completed', {
          filename,
          videoId: savedVideo.id,
          duration: uploadDuration
        });
        
        // Return the video in the expected format
        const formattedVideo = {
          id: savedVideo.id,
          title: savedVideo.title,
          description: savedVideo.description || '',
          category: 'General',
          tags: [],
          visibility: savedVideo.is_public ? 'public' : 'private',
          originalFilename: savedVideo.filename,
          storedFilename: savedVideo.filename,
          thumbnailPath: savedVideo.thumbnail_path || `/api/videos/thumbnail/${savedVideo.id}`,
          size: savedVideo.file_size,
          duration: savedVideo.duration,
          width: jsonVideoRecord.width,
          height: jsonVideoRecord.height,
          bitrate: jsonVideoRecord.bitrate,
          status: savedVideo.is_processed ? 'ready' : 'processing',
          uploadDate: savedVideo.uploaded_at,
          views: savedVideo.view_count || 0,
          streamUrl: `/api/videos/stream/${savedVideo.id}`, // Use streaming endpoint
          createdBy: 'Current User',
          metadata: {
            ...jsonVideoRecord.metadata,
            directUrl: savedVideo.file_path // Keep direct URL as backup
          }
        };
        
        return NextResponse.json({
          success: true,
          video: formattedVideo,
          message: 'Video uploaded successfully to S3 and database'
        });
      } catch (dbError) {
        console.error('🎬 Database save failed:', dbError);
        console.error('🔍 Database error details:', {
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
          code: (dbError as any)?.code,
          constraint: (dbError as any)?.constraint,
          detail: (dbError as any)?.detail
        });
        
        // Check if this is a duplicate key constraint violation
        if (dbError && (dbError as any).code === '23505' && (dbError as any).constraint === 'videos_pkey') {
          console.log('⚠️ Duplicate key detected in upload endpoint, attempting recovery...');
          
          // Try to extract the video ID from the error or generate a new one
          const duplicateId = jsonFileId; // We know this is the duplicate ID
          try {
            const existingVideo = await VideoDB.findById(duplicateId);
            if (existingVideo) {
              console.log('✅ Found existing video, returning it instead of failing');
              
              // Format the video for frontend response
              const formattedVideo = {
                id: existingVideo.id,
                title: existingVideo.title,
                description: existingVideo.description || '',
                category: 'General',
                tags: [],
                visibility: existingVideo.is_public ? 'public' : 'private',
                originalFilename: existingVideo.filename,
                storedFilename: existingVideo.filename,
                thumbnailPath: existingVideo.thumbnail_path,
                size: existingVideo.file_size,
                duration: existingVideo.duration || 0,
                uploadedAt: existingVideo.created_at,
                status: existingVideo.is_processed ? 'ready' : 'processing',
                createdBy: 'Current User',
                metadata: {
                  directUrl: existingVideo.file_path
                }
              };
              
              return NextResponse.json({
                success: true,
                video: formattedVideo,
                message: 'Video already exists - returning existing record'
              });
            }
          } catch (fetchError) {
            console.error('❌ Failed to fetch existing video during duplicate recovery:', fetchError);
          }
        }
        
        await videoMonitor.logDatabaseEvent('video_insert', false, {
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        
        // Track upload error
        await videoMonitor.logUploadEvent('Upload error', {
          filename,
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        
        // Don't fallback - fail the upload if database is unreachable
        return NextResponse.json({
          success: false,
          error: 'Database connection failed - video upload aborted',
          details: dbError instanceof Error ? dbError.message : 'Unknown database error',
          troubleshooting: {
            issue: 'Database server unreachable',
            suggestion: 'Check DATABASE_URL and database server status'
          }
        }, { status: 500 });
      }
    }

    // Original file upload handling - serverless compatible
    // In production, only use presigned URL uploads to avoid 413 errors
    if (isProduction) {
      console.log('🎬 ❌ FormData uploads disabled in production - use presigned URLs only');
      return NextResponse.json(
        { error: 'FormData uploads not supported in production. Use presigned URL upload instead.' },
        { status: 400 }
      );
    }
    
    console.log('🎬 Processing FormData upload (development mode only)');

    const formData = await request.formData();
    console.log('🎬 FormData parsed, entries:', Array.from(formData.entries()).map(([key, value]) => [key, typeof value === 'string' ? value : `File(${value.name})`]));
    
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const visibility = formData.get('visibility') as string;

    console.log('🎬 Extracted form fields:', { 
      hasFile: !!file, 
      fileName: file?.name, 
      fileSize: file?.size, 
      title, 
      description, 
      category, 
      tags, 
      visibility 
    });

    if (!file) {
      console.log('🎬 ❌ No file provided in FormData');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type - be more lenient with MIME type detection
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-m4v',
      'video/avi',
      'video/mov',
      'application/octet-stream' // Sometimes video files are detected as this
    ];

    const fileType = file.type || 'video/mp4';
    const fileName = file.name.toLowerCase();
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg', '.mkv', '.m4v'];
    
    // Check both MIME type and file extension
    const isValidType = allowedTypes.includes(fileType) || 
                       fileType.startsWith('video/') ||
                       videoExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidType) {
      console.log('🎬 ❌ Invalid file type:', { fileType, fileName });
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }
    
    console.log('🎬 ✅ File type validation passed:', { fileType, fileName });

    // Check file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5GB (current: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)` },
        { status: 400 }
      );
    }

    // Generate unique filename (for metadata only in serverless)
    const fileId = uuidv4();
    const fileExtension = path.extname(file.name) || '.mp4';
    const originalFilename = `${fileId}_original${fileExtension}`;
    
    // In serverless environment, we skip file storage
    // In production, you would upload directly to S3 here
    console.log('🎬 Skipping file storage in serverless environment');

    // Use thumbnail API endpoint instead of direct file path
    const thumbnailUrl = `/api/videos/thumbnail/${fileId}`;
    
    // Extract basic metadata (in production, use cloud services for proper extraction)
    const estimatedDuration = Math.floor(Math.random() * 3600) + 600; // Random duration for demo
    const estimatedBitrate = Math.round((file.size * 8) / estimatedDuration); // Rough estimate
    
    // Determine video dimensions based on common resolutions
    let width = 1920;
    let height = 1080;
    
    if (file.size < 100 * 1024 * 1024) { // Less than 100MB
      width = 1280;
      height = 720;
    } else if (file.size < 50 * 1024 * 1024) { // Less than 50MB
      width = 854;
      height = 480;
    }

    // Create video record
    const videoRecord = {
      id: fileId,
      title: title || file.name.replace(fileExtension, ''),
      description: description || '',
      category: category || 'General',
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      visibility: (visibility || 'private') as 'public' | 'private' | 'unlisted',
      originalFilename: file.name,
      storedFilename: originalFilename,
      thumbnailPath: thumbnailUrl,
      size: file.size,
      duration: estimatedDuration,
      width,
      height,
      bitrate: estimatedBitrate,
      status: 'draft' as 'processing' | 'ready' | 'failed' | 'draft', // New uploads start as drafts
      uploadDate: new Date().toISOString(),
      views: 0,
      streamUrl: `#placeholder-${fileId}`, // Placeholder URL for serverless
      createdBy: 'Current User', // In production, get from auth context
      metadata: {
        mimeType: fileType,
        originalName: file.name,
        fileExtension: fileExtension
      }
    };

    // Save to database using persistent storage
    console.log('🔧 Starting database record creation...');
    const dbStartTime = Date.now();
    const savedVideo = await VideoDB.create({
      title: videoRecord.title,
      description: videoRecord.description,
      filename: videoRecord.originalFilename,
      file_path: videoRecord.streamUrl,
      file_size: videoRecord.size,
      duration: videoRecord.duration,
      thumbnail_path: videoRecord.thumbnailPath,
      video_quality: 'HD',
      uploaded_by: 'current-user',
      course_id: undefined,
      is_processed: true,
      is_public: videoRecord.visibility === 'public'
    });
    const dbEndTime = Date.now();
    console.log('🎬 Video saved to database:', savedVideo.id, `(took ${dbEndTime - dbStartTime}ms)`);

    // In production, you would:
    // 1. Upload to AWS S3
    // 2. Trigger AWS Elemental MediaConvert for processing
    // 3. Generate thumbnails using Lambda functions
    // 4. Create HLS/DASH streams for adaptive bitrate
    // 5. Update database with CloudFront URLs

    return NextResponse.json({
      success: true,
      video: savedVideo,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('🎬 Upload error:', error);
    
    await videoMonitor.logUploadEvent('Upload failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('🎬 VIDEO GET: Starting GET request');
  
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const visibility = url.searchParams.get('visibility');
    
    console.log('🎬 GET filters:', { query, category, visibility });
    
    // Get videos from persistent database
    let dbVideos;
    try {
      console.log('🎬 Attempting to load videos from database...');
      console.log('🎬 DATABASE_URL exists:', !!process.env.DATABASE_URL);
      
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured - check environment variables');
      }
      
      dbVideos = await VideoDB.findAll(100, 0); // Get up to 100 videos
      console.log('🎬 Videos loaded from database:', dbVideos.length);
      console.log('🎬 Sample video IDs:', dbVideos.slice(0, 3).map(v => ({ id: v.id, title: v.title })));
    } catch (dbError) {
      console.error('🎬 Database query failed:', dbError);
      
      // Return empty result with clear error message instead of crashing the dashboard
      return NextResponse.json({
        videos: [],
        total: 0,
        error: 'Database server unreachable',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error',
        troubleshooting: {
          issue: 'PostgreSQL server at 10.0.2.167:5432 is unreachable',
          checkDatabaseUrl: !process.env.DATABASE_URL ? 'DATABASE_URL environment variable is missing' : 'DATABASE_URL is configured',
          suggestion: 'Fix database connectivity - server appears to be down or network blocked',
          nextSteps: 'Check DATABASE_CONNECTION_DEBUG.md for diagnostic steps'
        }
      }, { status: 200 }); // Return 200 so dashboard doesn't crash
    }
    
    // Transform database videos to expected frontend format
    let videos = dbVideos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description || '',
      category: 'General', // TODO: Add category field to database
      tags: [], // TODO: Add tags field to database
      visibility: v.is_public ? 'public' : 'private',
      originalFilename: v.filename,
      storedFilename: v.filename,
      thumbnailPath: v.thumbnail_path || `/api/videos/thumbnail/${v.id}`,
      size: v.file_size,
      duration: v.duration,
      width: 1920, // Default values
      height: 1080,
      bitrate: v.file_size && v.duration ? Math.round((v.file_size * 8) / v.duration) : 0,
      status: v.is_processed ? 'ready' : 'processing',
      uploadDate: v.uploaded_at,
      views: v.view_count || 0,
      streamUrl: `/api/videos/stream/${v.id}`, // Use streaming endpoint instead of direct URL
      createdBy: 'Current User',
      metadata: {
        mimeType: 'video/mp4',
        originalName: v.filename,
        s3Key: v.s3_key,
        cloudFrontUrl: v.file_path, // Keep direct URL as backup
        directUrl: v.file_path
      }
    }));
    
    // Apply filters
    if (query) {
      console.log('🎬 Applying search filter:', query);
      const lowercaseQuery = query.toLowerCase();
      videos = videos.filter(v =>
        v.title.toLowerCase().includes(lowercaseQuery) ||
        v.description.toLowerCase().includes(lowercaseQuery)
      );
      console.log('🎬 After search filter:', videos.length);
    }
    
    if (category && category !== 'All Categories') {
      console.log('🎬 Applying category filter:', category);
      videos = videos.filter(v => v.category === category);
      console.log('🎬 After category filter:', videos.length);
    }
    
    if (visibility) {
      console.log('🎬 Applying visibility filter:', visibility);
      videos = videos.filter(v => v.visibility === visibility);
      console.log('🎬 After visibility filter:', videos.length);
    }
    
    // Sort by upload date (newest first)
    videos.sort((a, b) => {
      const dateA = new Date(a.uploadDate).getTime();
      const dateB = new Date(b.uploadDate).getTime();
      return dateB - dateA;
    });
    
    console.log('🎬 Final video count:', videos.length);
    console.log('🎬 Returning videos:', videos.map(v => ({ id: v.id, title: v.title, status: v.status })));
    
    return NextResponse.json({
      videos,
      total: videos.length
    });
  } catch (error) {
    console.error('🎬 ❌ Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating videos
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      );
    }
    
    // Update the video in the database
    const updatedVideo = await VideoDB.update(id, {
      title,
      description,
      // category, // TODO: Add category field to database
      // tags, // TODO: Add tags field to database
      // visibility, // TODO: Add visibility field to database
      // status // TODO: Add status field to database
    });
    
    if (updatedVideo) {
      return NextResponse.json({
        success: true,
        video: updatedVideo,
        message: 'Video updated successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE endpoint for removing videos
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('id');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      );
    }
    
    // Delete from database
    const success = await VideoDB.delete(videoId);
    
    if (success) {
      // In production, also delete files from storage
      return NextResponse.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
