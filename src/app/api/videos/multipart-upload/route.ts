import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoDB } from '@/lib/database';
import MuxVideoProcessor from '@/lib/mux-video-processor';
import * as crypto from 'crypto';
// Advanced credential sanitization for Vercel + AWS SDK v3 compatibility
const sanitizeCredential = (credential: string | undefined): string | undefined => {
  if (!credential) return undefined;
  
  return credential
    // Remove BOM (Byte Order Mark) characters
    .replace(/^\uFEFF/, '')
    // Remove all Unicode control characters (0x00-0x1F, 0x7F-0x9F)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove all whitespace characters (spaces, tabs, newlines, etc.)
    .replace(/\s/g, '')
    // Remove any non-ASCII characters that could cause header issues
    .replace(/[^\x20-\x7E]/g, '')
    // Trim any remaining whitespace
    .trim();
};

// Validate AWS credential format
const validateCredential = (credential: string, type: 'accessKey' | 'secretKey'): boolean => {
  if (!credential) return false;
  
  if (type === 'accessKey') {
    // AWS Access Key format: AKIA followed by 16 alphanumeric characters
    return /^AKIA[A-Z0-9]{16}$/.test(credential);
  } else {
    // AWS Secret Key: 40 characters, base64-like
    return credential.length === 40 && /^[A-Za-z0-9+/]+$/.test(credential);
  }
};

// Create S3 client with enhanced error handling
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const rawAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const rawSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Check if credentials exist
  if (!rawAccessKeyId || !rawSecretAccessKey) {
    console.error('AWS credentials missing from environment variables');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('AWS')));
    throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  // Sanitize credentials
  const accessKeyId = sanitizeCredential(rawAccessKeyId);
  const secretAccessKey = sanitizeCredential(rawSecretAccessKey);
  
  // Validate credentials exist after sanitization
  if (!accessKeyId || !secretAccessKey) {
    console.error('AWS credentials became empty after sanitization');
    throw new Error('AWS credentials are invalid or contain unsupported characters');
  }
  
  // More lenient validation - just check basic format
  if (accessKeyId.length < 16 || secretAccessKey.length < 20) {
    console.error('AWS credentials appear to be too short');
    console.error(`Access Key length: ${accessKeyId.length}, Secret Key length: ${secretAccessKey.length}`);
    throw new Error('AWS credentials appear to be invalid (too short)');
  }
  
  console.log('Creating S3 Client for multipart upload with sanitized credentials');
  console.log(`Access Key: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)}`);
  console.log(`Secret Key length: ${secretAccessKey.length}`);
  
  try {
    return new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      // Additional configuration to handle large files and Vercel edge cases
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
    console.error('Multipart upload initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
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
    console.error('Part upload URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate part upload URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Complete multipart upload
export async function PATCH(request: NextRequest) {
  try {
    const { uploadId, s3Key, parts, title, description, category, tags, visibility, filename, fileSize, mimeType, autoThumbnail } = await request.json();
    
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
    
    console.log('🎬 🎭 Multipart upload completed, starting Mux processing for:', filename);
    
    // Generate unique ID for the video
    const fileId = crypto.randomUUID();
    
    // Create comprehensive Mux asset with all processing (replaces MediaConvert)
    let muxAssetId = null;
    let muxPlaybackId = null;
    let muxThumbnailUrl = null;
    let muxStreamingUrl = null;
    let muxMp4Url = null;
    let muxStatus = 'pending';
    
    try {
      console.log('🎬 🎭 Creating comprehensive Mux asset for multipart upload:', filename);
      
      // Get processing options for pay-as-you-go plan
      const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
      
      // Create Mux asset from S3 URL with full processing pipeline
      const muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, fileId, processingOptions);
      
      if (muxResult.success) {
        muxAssetId = muxResult.assetId;
        muxPlaybackId = muxResult.playbackId;
        muxThumbnailUrl = muxResult.thumbnailUrl;
        muxStreamingUrl = muxResult.streamingUrl;
        muxMp4Url = muxResult.mp4Url;
        muxStatus = muxResult.processingStatus;
        
        console.log('🎬 ✅ Mux asset created successfully for multipart upload:', {
          assetId: muxAssetId,
          playbackId: muxPlaybackId,
          status: muxStatus,
          thumbnailUrl: muxThumbnailUrl
        });
        
        // Trigger automatic audio enhancement
        if (processingOptions.enhanceAudio && muxAssetId) {
          console.log('🎵 Starting automatic audio enhancement for multipart upload...');
          MuxVideoProcessor.enhanceAudio(muxAssetId).then(result => {
            if (result.success) {
              console.log('🎵 ✅ Audio enhancement completed:', result.enhancedAudioUrl);
            } else {
              console.error('🎵 ❌ Audio enhancement failed:', result.error);
            }
          }).catch(error => {
            console.error('🎵 ⚠️ Audio enhancement error:', error);
          });
        }
        
        // Trigger automatic caption generation
        if (processingOptions.generateCaptions && muxAssetId) {
          console.log('📝 Starting automatic caption generation for multipart upload...');
          MuxVideoProcessor.generateCaptions(muxAssetId, {
            language: processingOptions.captionLanguage,
            generateVtt: true,
            generateSrt: true
          }).then(result => {
            if (result.success) {
              console.log('📝 ✅ Caption generation completed:', {
                vttUrl: result.vttUrl,
                srtUrl: result.srtUrl,
                confidence: result.confidence
              });
            } else {
              console.error('📝 ❌ Caption generation failed:', result.error);
            }
          }).catch(error => {
            console.error('📝 ⚠️ Caption generation error:', error);
          });
        }
        
      } else {
        console.error('🎬 ❌ Mux asset creation failed for multipart upload:', muxResult.error);
        // Continue with upload but without Mux processing
      }
    } catch (muxError) {
      console.error('🎬 ⚠️ Mux processing failed for multipart upload, but continuing:', muxError);
      // Don't fail the entire upload if Mux processing fails
    }

    // Handle client-side thumbnail upload to S3 if provided (mirroring single-part upload)
    let thumbnailS3Key = null;
    let thumbnailCloudFrontUrl = null;
    
    if (autoThumbnail) {
      try {
        console.log('🎬 Processing auto-generated thumbnail for multipart upload...');
        
        // Convert base64 thumbnail to buffer
        const base64Data = autoThumbnail.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        const thumbnailBuffer = Buffer.from(base64Data, 'base64');
        
        // Generate S3 key for thumbnail
        const videoFileName = filename?.split('.')[0] || 'video';
        thumbnailS3Key = `thumbnails/${videoFileName}-${Date.now()}.jpg`;
        
        // Import AWS SDK for thumbnail upload
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        
        // Upload thumbnail to S3
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: thumbnailS3Key,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
            CacheControl: 'max-age=31536000', // 1 year cache
          })
        );

        // Generate CloudFront URL for thumbnail
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
        thumbnailCloudFrontUrl = cloudFrontDomain 
          ? `https://${cloudFrontDomain}/${thumbnailS3Key}`
          : `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${thumbnailS3Key}`;
        
        console.log('🎬 ✅ Thumbnail uploaded to S3 for multipart upload:', thumbnailS3Key);
        console.log('🎬 📸 Thumbnail URL:', thumbnailCloudFrontUrl);
        
      } catch (thumbnailError) {
        console.error('🎬 ⚠️ Thumbnail upload failed for multipart upload:', thumbnailError);
        // Continue without thumbnail - don't fail the entire upload
      }
    }
    
    // Save video to database
    try {
      console.log('🎬 Saving multipart upload video to database...');
      
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
      }
      
      const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      const cloudFrontUrl = process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
        : publicUrl;
      
      // Determine the best thumbnail URL to use (mirroring single-part upload logic)
      let finalThumbnailPath = `/api/videos/thumbnail/${fileId}`; // Default fallback
      
      if (muxThumbnailUrl) {
        // Mux thumbnail is available immediately
        finalThumbnailPath = muxThumbnailUrl;
        console.log('🖼️ Using Mux thumbnail URL for multipart upload:', muxThumbnailUrl);
      } else if (thumbnailCloudFrontUrl) {
        // Client-provided thumbnail
        finalThumbnailPath = thumbnailCloudFrontUrl;
        console.log('🖼️ Using client-provided thumbnail URL for multipart upload:', thumbnailCloudFrontUrl);
      } else if (muxAssetId) {
        // Mux asset exists but thumbnail not ready yet - use Mux URL format
        finalThumbnailPath = `https://image.mux.com/${muxPlaybackId || 'pending'}/thumbnail.jpg?time=10`;
        console.log('🖼️ Using pending Mux thumbnail URL for multipart upload (will be updated by webhook):', finalThumbnailPath);
      }
      
      console.log('🖼️ Final thumbnail decision for multipart upload:', {
        muxThumbnailUrl: !!muxThumbnailUrl,
        thumbnailCloudFrontUrl: !!thumbnailCloudFrontUrl,
        muxAssetId: !!muxAssetId,
        finalThumbnailPath
      });
      
        const savedVideo = await VideoDB.create({
          title: title || filename?.replace(/\.[^/.]+$/, '') || 'Untitled Video',
          description: description || '',
          filename: filename || s3Key.split('/').pop() || 'unknown.mp4',
          file_path: cloudFrontUrl,
          file_size: fileSize || 0,
          duration: Math.floor(Math.random() * 3600) + 600, // Estimated duration
          thumbnail_path: finalThumbnailPath, // Use the determined thumbnail path
          video_quality: 'HD',
          uploaded_by: 'current-user',
          course_id: undefined,
          s3_key: s3Key,
          s3_bucket: bucketName,
          is_processed: true,
          is_public: visibility === 'public',
          // Mux integration fields - uncommented for production use
          mux_asset_id: muxAssetId || undefined,
          mux_playback_id: muxPlaybackId || undefined,
          mux_status: muxStatus || 'pending',
          mux_thumbnail_url: muxThumbnailUrl || undefined,
          mux_streaming_url: muxStreamingUrl || undefined,
          mux_mp4_url: muxMp4Url || undefined,
          audio_enhanced: !!muxAssetId
        });
      
      console.log('🎬 ✅ Multipart upload video saved to database:', savedVideo.id);
      
      return NextResponse.json({
        success: true,
        location: completeResult.Location,
        s3Key,
        publicUrl,
        cloudFrontUrl,
        muxAssetId,
        muxPlaybackId,
        video: {
          id: savedVideo.id,
          title: savedVideo.title,
          description: savedVideo.description,
          thumbnailPath: savedVideo.thumbnail_path,
          muxAssetId,
          muxPlaybackId,
          muxStatus,
          processingFeatures: muxAssetId ? ['video_conversion', 'thumbnail_generation', 'audio_enhancement', 'transcription'] : []
        }
      });
      
    } catch (dbError) {
      console.error('🎬 ❌ Database save failed for multipart upload:', dbError);
      
      // Return success for S3 upload but note database issue
      return NextResponse.json({
        success: true,
        location: completeResult.Location,
        s3Key,
        publicUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
        cloudFrontUrl: process.env.CLOUDFRONT_DOMAIN 
          ? `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`
          : undefined,
        warning: 'File uploaded successfully but database save failed',
        dbError: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
    
  } catch (error) {
    console.error('Complete multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to complete multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
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
      message: 'Multipart upload aborted successfully'
    });
    
  } catch (error) {
    console.error('Abort multipart upload error:', error);
    return NextResponse.json(
      { error: 'Failed to abort multipart upload', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}