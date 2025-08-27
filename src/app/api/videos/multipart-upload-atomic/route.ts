import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoDB } from '@/lib/database';
import MuxVideoProcessor from '@/lib/mux-video-processor';
import VideoMetadataExtractor from '@/lib/video-metadata-extractor';
import * as crypto from 'crypto';

// Advanced credential sanitization for Vercel + AWS SDK v3 compatibility
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  
  return credential
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
};

// Create S3 client with enhanced error handling
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!rawAccessKeyId || !rawSecretAccessKey) {
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  const accessKeyId = sanitizeCredential(rawAccessKeyId);
  const secretAccessKey = sanitizeCredential(rawSecretAccessKey);
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are invalid or contain unsupported characters');
  }
  
  if (accessKeyId.length < 16 || secretAccessKey.length < 20) {
    throw new Error('AWS credentials appear to be invalid (too short)');
  }
  
  console.log('Creating S3 Client for atomic multipart upload');
  
  try {
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      requestHandler: {
        requestTimeout: 300000, // 5 minutes for large file operations
        connectionTimeout: 30000 // 30 seconds connection timeout
      }
    });
  } catch (s3Error) {
    console.error('Failed to create S3 client:', s3Error);
    throw new Error(`Failed to initialize S3 client: ${s3Error instanceof Error ? s3Error.message : 'Unknown error'}`);
  }
};

// Initialize multipart upload
export async function POST(request: NextRequest) {
  try {
    const { filename, contentType, fileSize } = await request.json();
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'Filename and content type are required' },
        { status: 400 }
      );
    }
    
    // Validate file size (up to 5TB for multipart uploads)
    const maxSize = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5TB' },
        { status: 400 }
      );
    }
    
    // Generate unique S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    const s3Key = `videos/${timestamp}-${randomString}.${extension}`;
    
    // Create multipart upload
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      Metadata: {
        'original-filename': filename,
        'upload-date': new Date().toISOString(),
        'file-size': fileSize?.toString() || '0'
      }
    });
    
    const createResult = await s3Client.send(createCommand);
    
    if (!createResult.UploadId) {
      throw new Error('Failed to create multipart upload');
    }
    
    // Calculate recommended part size (100MB to 1GB based on file size)
    let partSize = 100 * 1024 * 1024; // Start with 100MB
    if (fileSize) {
      if (fileSize > 10 * 1024 * 1024 * 1024) { // >10GB
        partSize = 1024 * 1024 * 1024; // 1GB parts
      } else if (fileSize > 1024 * 1024 * 1024) { // >1GB
        partSize = 500 * 1024 * 1024; // 500MB parts
      }
    }
    
    const totalParts = fileSize ? Math.ceil(fileSize / partSize) : 1;
    
    return NextResponse.json({
      uploadId: createResult.UploadId,
      s3Key,
      bucketName,
      partSize,
      totalParts,
      publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
      cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
        : undefined
    });
    
  } catch (error) {
    console.error('Atomic multipart upload initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize atomic multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get presigned URLs for upload parts
export async function PUT(request: NextRequest) {
  try {
    const { uploadId, s3Key, partNumber, contentType } = await request.json();
    
    if (!uploadId || !s3Key || !partNumber) {
      return NextResponse.json(
        { error: 'Upload ID, S3 key, and part number are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const uploadPartCommand = new UploadPartCommand({
      Bucket: bucketName,
      Key: s3Key,
      PartNumber: partNumber,
      UploadId: uploadId
    });
    
    // Generate presigned URL for this part (valid for 1 hour)
    const presignedUrl = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
    
    return NextResponse.json({
      presignedUrl,
      partNumber
    });
    
  } catch (error) {
    console.error('Atomic part upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate part upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Complete multipart upload - ATOMIC APPROACH
export async function PATCH(request: NextRequest) {
  try {
    const { uploadId, s3Key, parts, title, description, category, tags, visibility, filename, fileSize, mimeType } = await request.json();
    
    if (!uploadId || !s3Key || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: 'Upload ID, S3 key, and parts array are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((part: any) => ({
          ETag: part.etag,
          PartNumber: part.partNumber
        }))
      }
    });
    
    const completeResult = await s3Client.send(completeCommand);
    
    console.log('🎯 ATOMIC MULTIPART: Upload completed, starting atomic processing for:', filename);
    
    // Generate unique video ID
    const videoId = crypto.randomUUID();
    
    // ATOMIC STEP 1: Create Mux asset immediately
    console.log('🎯 Step 1: Creating Mux asset for multipart upload...');
    const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
    
    let muxResult;
    try {
      muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, videoId, processingOptions);
      
      if (!muxResult.success) {
        console.error('🎯 ❌ Mux asset creation failed for multipart:', muxResult.error);
        return NextResponse.json(
          { error: 'Failed to create Mux asset for multipart upload', details: muxResult.error },
          { status: 500 }
        );
      }
      
      console.log('🎯 ✅ Mux asset created for multipart:', {
        assetId: muxResult.assetId,
        playbackId: muxResult.playbackId,
        status: muxResult.processingStatus
      });
      
    } catch (muxError) {
      console.error('🎯 ❌ Mux processing error for multipart:', muxError);
      return NextResponse.json(
        { error: 'Mux processing failed for multipart upload', details: muxError instanceof Error ? muxError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // ATOMIC STEP 2: Wait 5 seconds for initial Mux processing
    console.log('🎯 Step 2: Waiting 5 seconds for Mux processing (multipart)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // ATOMIC STEP 3: Extract complete metadata from Mux asset
    console.log('🎯 Step 3: Extracting metadata from Mux asset (multipart)...');
    let metadata;
    
    try {
      metadata = await VideoMetadataExtractor.extractFromMuxAsset(
        muxResult.assetId!,
        muxResult.playbackId!,
        3 // Max 3 retries
      );
      
      if (!metadata) {
        console.log('🎯 ⚠️ Metadata extraction failed for multipart, using fallback');
        metadata = VideoMetadataExtractor.extractFromFileInfo(filename, fileSize, s3Key);
      } else {
        console.log('🎯 ✅ Metadata extracted successfully for multipart:', {
          duration: VideoMetadataExtractor.formatDuration(metadata.duration),
          dimensions: `${metadata.width}x${metadata.height}`,
          fileSize: VideoMetadataExtractor.formatFileSize(metadata.fileSize),
          quality: VideoMetadataExtractor.getQualityLabel(metadata.width, metadata.height)
        });
      }
      
    } catch (metadataError) {
      console.error('🎯 ⚠️ Metadata extraction error for multipart, using fallback:', metadataError);
      metadata = VideoMetadataExtractor.extractFromFileInfo(filename, fileSize, s3Key);
    }
    
    // ATOMIC STEP 4: Create single database record with complete metadata
    console.log('🎯 Step 4: Creating atomic database record for multipart...');
    
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
      }
      
      const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      const cloudFrontUrl = process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
        : publicUrl;
      
      // Check for duplicates using simple filename+filesize check
      const duplicateCheck = await VideoDB.findDuplicateByFileInfo(filename, fileSize || 0);
      if (duplicateCheck) {
        console.log('🎯 ⚠️ Duplicate video detected for multipart, returning existing:', duplicateCheck.id);
        return NextResponse.json({
          success: true,
          location: completeResult.Location,
          s3Key,
          publicUrl,
          cloudFrontUrl,
          video: {
            id: duplicateCheck.id,
            title: duplicateCheck.title,
            isDuplicate: true,
            message: 'Video already exists with same filename and size'
          }
        });
      }
      
      // Use atomic database creation with complete metadata
      const savedVideo = await VideoDB.createVideoWithCompleteMetadata({
        // Basic video info
        title: title || filename?.replace(/\.[^/.]+$/, '') || 'Untitled Video',
        description: description || '',
        filename: filename || s3Key.split('/').pop() || 'unknown.mp4',
        file_path: cloudFrontUrl,
        file_size: metadata.fileSize,
        duration: metadata.duration,
        thumbnail_path: metadata.thumbnailUrl,
        video_quality: VideoMetadataExtractor.getQualityLabel(metadata.width, metadata.height),
        uploaded_by: 'current-user',
        course_id: undefined,
        s3_key: s3Key,
        s3_bucket: bucketName,
        is_processed: true,
        is_public: visibility === 'public',
        
        // Complete Mux integration fields
        mux_asset_id: muxResult.assetId,
        mux_playback_id: muxResult.playbackId,
        mux_status: muxResult.processingStatus || 'preparing',
        mux_thumbnail_url: metadata.thumbnailUrl,
        mux_streaming_url: muxResult.streamingUrl,
        mux_mp4_url: muxResult.mp4Url,
        mux_duration_seconds: metadata.duration,
        mux_aspect_ratio: metadata.aspectRatio,
        mux_created_at: new Date(),
        
        // Enhanced metadata
        width: metadata.width,
        height: metadata.height,
        bitrate: metadata.bitrate,
        audio_enhanced: true
      });
      
      console.log('🎯 ✅ Atomic multipart upload video saved to database:', savedVideo.video.id);
      
      // Trigger background audio enhancement and transcription
      if (muxResult.assetId) {
        // Audio enhancement
        MuxVideoProcessor.enhanceAudio(muxResult.assetId).then(result => {
          if (result.success) {
            console.log('🎵 ✅ Audio enhancement completed for multipart:', result.enhancedAudioUrl);
          }
        }).catch(error => {
          console.error('🎵 ❌ Audio enhancement failed for multipart:', error);
        });
        
        // Caption generation
        MuxVideoProcessor.generateCaptions(muxResult.assetId, {
          language: processingOptions.captionLanguage,
          generateVtt: true,
          generateSrt: true
        }).then(result => {
          if (result.success) {
            console.log('📝 ✅ Caption generation completed for multipart:', {
              vttUrl: result.vttUrl,
              srtUrl: result.srtUrl,
              confidence: result.confidence
            });
          }
        }).catch(error => {
          console.error('📝 ❌ Caption generation failed for multipart:', error);
        });
      }
      
      return NextResponse.json({
        success: true,
        location: completeResult.Location,
        s3Key,
        publicUrl,
        cloudFrontUrl,
        video: {
          id: savedVideo.video.id,
          duration: VideoMetadataExtractor.formatDuration(metadata.duration),
          fileSize: VideoMetadataExtractor.formatFileSize(metadata.fileSize),
          quality: VideoMetadataExtractor.getQualityLabel(metadata.width, metadata.height),
          dimensions: `${metadata.width}x${metadata.height}`,
          muxAssetId: muxResult.assetId,
          muxPlaybackId: muxResult.playbackId,
          muxStatus: muxResult.processingStatus,
          thumbnailUrl: metadata.thumbnailUrl,
          processingFeatures: ['video_conversion', 'thumbnail_generation', 'audio_enhancement', 'transcription'],
          uploadMethod: 'multipart-atomic'
        }
      });
      
    } catch (dbError) {
      console.error('🎯 ❌ Atomic database save failed for multipart:', dbError);
      
      // Return success for S3 upload but note database issue
      return NextResponse.json({
        success: true,
        location: completeResult.Location,
        s3Key,
        publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
        cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
          ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
          : undefined,
        warning: 'File uploaded successfully but atomic database save failed',
        dbError: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
    
  } catch (error) {
    console.error('Complete atomic multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to complete atomic multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Abort multipart upload
export async function DELETE(request: NextRequest) {
  try {
    const { uploadId, s3Key } = await request.json();
    
    if (!uploadId || !s3Key) {
      return NextResponse.json(
        { error: 'Upload ID and S3 key are required' },
        { status: 400 }
      );
    }
    
    const s3Client = createS3Client();
    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    const abortCommand = new AbortMultipartUploadCommand({
      Bucket: bucketName,
      Key: s3Key,
      UploadId: uploadId
    });
    
    await s3Client.send(abortCommand);
    
    return NextResponse.json({
      success: true,
      message: 'Atomic multipart upload aborted successfully'
    });
    
  } catch (error) {
    console.error('Abort atomic multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to abort atomic multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
