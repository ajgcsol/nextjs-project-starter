import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import MuxVideoProcessor from '@/lib/mux-video-processor';
import { TranscriptionService } from '@/lib/transcriptionService';
import { S3Client, CreateMultipartUploadCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for complete processing

// File size thresholds
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB - use multipart for files larger than this
const LARGE_FILE_THRESHOLD = 1024 * 1024 * 1024; // 1GB - considered large file

interface UploadStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime?: number;
  completedTime?: number;
  error?: string;
}

interface SteppedUploadResponse {
  success: boolean;
  videoId: string;
  steps: UploadStep[];
  currentStep: number;
  overallProgress: number;
  uploadMethod?: 'regular' | 'multipart' | 'direct';
  uploadInfo?: {
    uploadId?: string;
    s3Key?: string;
    partSize?: number;
    totalParts?: number;
    presignedUrl?: string;
  };
  video?: any;
  error?: string;
}

// Helper function to create S3 client
const createS3Client = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured');
  }
  
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });
};

// Helper function to determine upload method based on file size
const determineUploadMethod = (fileSize: number): 'regular' | 'multipart' => {
  return fileSize > MULTIPART_THRESHOLD ? 'multipart' : 'regular';
};

// Function to initiate smart upload (chooses between regular and multipart)
async function initiateSmartUpload(
  filename: string, 
  size: number, 
  mimeType: string, 
  title?: string, 
  description?: string
): Promise<NextResponse> {
  try {
    const uploadMethod = determineUploadMethod(size);
    const videoId = crypto.randomUUID();
    
    console.log(`🎬 Initiating ${uploadMethod} upload for:`, filename, `(${(size / (1024*1024)).toFixed(2)}MB)`);
    
    if (uploadMethod === 'multipart') {
      // Initialize multipart upload
      const s3Client = createS3Client();
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = filename.split('.').pop();
      const s3Key = `videos/${timestamp}-${randomString}.${extension}`;
      
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: s3Key,
        ContentType: mimeType,
        Metadata: {
          'original-filename': filename,
          'upload-date': new Date().toISOString(),
          'file-size': size.toString(),
          'video-id': videoId
        }
      });
      
      const createResult = await s3Client.send(createCommand);
      
      if (!createResult.UploadId) {
        throw new Error('Failed to create multipart upload');
      }
      
      // Calculate recommended part size
      let partSize = 100 * 1024 * 1024; // Start with 100MB
      if (size > 10 * 1024 * 1024 * 1024) { // >10GB
        partSize = 1024 * 1024 * 1024; // 1GB parts
      } else if (size > 1024 * 1024 * 1024) { // >1GB
        partSize = 500 * 1024 * 1024; // 500MB parts
      }
      
      const totalParts = Math.ceil(size / partSize);
      
      return NextResponse.json({
        success: true,
        uploadMethod: 'multipart',
        videoId,
        uploadInfo: {
          uploadId: createResult.UploadId,
          s3Key,
          partSize,
          totalParts,
          bucketName
        },
        message: `Multipart upload initialized with ${totalParts} parts`
      });
      
    } else {
      // Regular upload - generate presigned URL
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const extension = filename.split('.').pop();
      const s3Key = `videos/${timestamp}-${randomString}.${extension}`;
      
      // For regular uploads, we can use the existing presigned URL logic
      // or direct upload to S3
      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      
      return NextResponse.json({
        success: true,
        uploadMethod: 'regular',
        videoId,
        uploadInfo: {
          s3Key,
          bucketName,
          presignedUrl: publicUrl // In production, generate actual presigned URL
        },
        message: 'Regular upload initialized'
      });
    }
    
  } catch (error) {
    console.error('❌ Smart upload initiation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🎬 Starting Perfect Stepped Video Upload Process');
  
  try {
    const data = await request.json();
    const { title, description, filename, size, s3Key, publicUrl, mimeType, uploadMethod } = data;
    
    // Handle upload initiation request
    if (uploadMethod === 'initiate') {
      if (!filename || !size) {
        return NextResponse.json({
          success: false,
          error: 'Filename and file size are required to initiate upload'
        }, { status: 400 });
      }
      
      return await initiateSmartUpload(filename, size, mimeType, title, description);
    }
    
    // Handle processing request (after file is uploaded to S3)
    if (!s3Key || !publicUrl || !filename) {
      return NextResponse.json({
        success: false,
        error: 'Missing required upload data for processing'
      }, { status: 400 });
    }

    const videoId = crypto.randomUUID();
    const startTime = Date.now();
    const detectedUploadMethod = determineUploadMethod(size || 0);
    
    // Initialize the 3-step process with upload method info
    const steps: UploadStep[] = [
      {
        step: 1,
        name: 'Thumbnail Generation',
        status: 'processing',
        progress: 0,
        message: `Creating Mux asset and generating thumbnail... (${detectedUploadMethod} upload)`,
        startTime: Date.now()
      },
      {
        step: 2,
        name: 'Video Upload Completion',
        status: 'pending',
        progress: 0,
        message: 'Waiting for thumbnail completion...'
      },
      {
        step: 3,
        name: 'Transcript Processing',
        status: 'pending',
        progress: 0,
        message: 'Waiting for video upload completion...'
      }
    ];

    console.log('📋 Initialized 3-step upload process for:', filename);
    console.log('📊 Upload method detected:', detectedUploadMethod, `(${((size || 0) / (1024*1024)).toFixed(2)}MB)`);

    // STEP 1: THUMBNAIL GENERATION (Synchronous)
    console.log('🖼️ STEP 1: Starting thumbnail generation...');
    steps[0].message = 'Creating Mux asset...';
    steps[0].progress = 10;

    let muxAssetId: string | null = null;
    let muxPlaybackId: string | null = null;
    let thumbnailUrl: string | null = null;
    let streamingUrl: string | null = null;

    try {
      const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
      
      // Create Mux asset
      steps[0].message = 'Processing video with Mux...';
      steps[0].progress = 30;
      
      const muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, videoId, processingOptions);
      
      if (muxResult.success && muxResult.assetId) {
        muxAssetId = muxResult.assetId;
        muxPlaybackId = muxResult.playbackId!;
        
        steps[0].message = 'Waiting for Mux asset to be ready...';
        steps[0].progress = 50;
        
        // Wait for asset to be ready (with timeout)
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        
        while (attempts < maxAttempts) {
          const statusResult = await MuxVideoProcessor.getAssetStatus(muxAssetId);
          
          if (statusResult.success && statusResult.processingStatus === 'ready') {
            thumbnailUrl = statusResult.thumbnailUrl!;
            streamingUrl = statusResult.streamingUrl!;
            
            steps[0].status = 'completed';
            steps[0].progress = 100;
            steps[0].message = 'Thumbnail generated successfully!';
            steps[0].completedTime = Date.now();
            
            console.log('✅ STEP 1 COMPLETED: Thumbnail ready:', thumbnailUrl);
            break;
          } else if (statusResult.processingStatus === 'errored') {
            throw new Error('Mux asset processing failed');
          }
          
          // Update progress during wait
          const waitProgress = 50 + (attempts / maxAttempts) * 40;
          steps[0].progress = Math.min(90, waitProgress);
          steps[0].message = `Processing video... (${attempts + 1}/${maxAttempts})`;
          
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        }
        
        if (!thumbnailUrl) {
          throw new Error('Thumbnail generation timed out');
        }
      } else {
        throw new Error(muxResult.error || 'Failed to create Mux asset');
      }
    } catch (error) {
      console.error('❌ STEP 1 FAILED:', error);
      steps[0].status = 'failed';
      steps[0].error = error instanceof Error ? error.message : 'Unknown error';
      steps[0].message = 'Thumbnail generation failed';
      
      return NextResponse.json({
        success: false,
        videoId,
        steps,
        currentStep: 1,
        overallProgress: 0,
        uploadMethod: detectedUploadMethod,
        error: 'Step 1 failed: ' + steps[0].error
      } as SteppedUploadResponse);
    }

    // STEP 2: VIDEO UPLOAD COMPLETION (Synchronous)
    console.log('📹 STEP 2: Completing video upload...');
    steps[1].status = 'processing';
    steps[1].startTime = Date.now();
    steps[1].message = 'Saving video to database...';
    steps[1].progress = 20;

    try {
      // Create video record with all Mux data
      const videoRecord = {
        title: title || filename.replace(/\.[^/.]+$/, ''),
        description: description || '',
        filename: filename,
        file_path: streamingUrl!,
        file_size: size || 0,
        duration: 0, // Will be updated by webhook
        thumbnail_path: thumbnailUrl!,
        video_quality: 'HD',
        uploaded_by: 'current-user',
        course_id: undefined,
        s3_key: s3Key,
        s3_bucket: process.env.S3_BUCKET_NAME || undefined,
        is_processed: true,
        is_public: false,
        // Mux integration fields
        mux_asset_id: muxAssetId,
        mux_playback_id: muxPlaybackId,
        mux_status: 'ready',
        mux_thumbnail_url: thumbnailUrl,
        mux_streaming_url: streamingUrl || undefined,
        mux_created_at: new Date(),
        mux_ready_at: new Date()
      };

      steps[1].message = 'Creating database record...';
      steps[1].progress = 60;

      const savedVideo = await VideoDB.create(videoRecord);
      
      steps[1].status = 'completed';
      steps[1].progress = 100;
      steps[1].message = 'Video upload completed successfully!';
      steps[1].completedTime = Date.now();
      
      console.log('✅ STEP 2 COMPLETED: Video saved to database:', savedVideo.id);

      // STEP 3: TRANSCRIPT PROCESSING (Asynchronous)
      console.log('📝 STEP 3: Starting transcript processing...');
      steps[2].status = 'processing';
      steps[2].startTime = Date.now();
      steps[2].message = 'Initializing transcript generation...';
      steps[2].progress = 10;

      // Start transcript processing asynchronously
      processTranscriptAsync(videoId, muxAssetId!, s3Key, savedVideo.id)
        .then(() => {
          console.log('✅ STEP 3 COMPLETED: Transcript processing finished');
        })
        .catch(error => {
          console.error('❌ STEP 3 FAILED:', error);
        });

      // Return success with transcript processing started
      steps[2].message = 'Transcript processing started (will complete in background)';
      steps[2].progress = 20;

      const response: SteppedUploadResponse = {
        success: true,
        videoId: savedVideo.id,
        steps,
        currentStep: 3,
        overallProgress: 80, // Steps 1&2 complete, Step 3 in progress
        uploadMethod: detectedUploadMethod,
        video: {
          id: savedVideo.id,
          title: savedVideo.title,
          thumbnailPath: savedVideo.thumbnail_path,
          streamUrl: `/api/videos/stream/${savedVideo.id}`,
          muxPlaybackId: muxPlaybackId,
          status: 'ready',
          transcriptStatus: 'processing'
        }
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('❌ STEP 2 FAILED:', error);
      steps[1].status = 'failed';
      steps[1].error = error instanceof Error ? error.message : 'Unknown error';
      steps[1].message = 'Video upload completion failed';
      
      return NextResponse.json({
        success: false,
        videoId,
        steps,
        currentStep: 2,
        overallProgress: 33,
        uploadMethod: detectedUploadMethod,
        error: 'Step 2 failed: ' + steps[1].error
      } as SteppedUploadResponse);
    }

  } catch (error) {
    console.error('❌ Upload process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Upload process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Asynchronous transcript processing function
async function processTranscriptAsync(
  videoId: string, 
  muxAssetId: string, 
  s3Key: string, 
  dbVideoId: string
): Promise<void> {
  try {
    console.log('📝 Starting asynchronous transcript processing for:', videoId);
    
    // Use Mux's built-in transcription capabilities
    const transcriptResult = await MuxVideoProcessor.generateCaptions(muxAssetId, {
      language: 'en',
      generateVtt: true,
      generateSrt: true
    });
    
    if (transcriptResult.success) {
      // Update database with transcript results
      await VideoDB.update(dbVideoId, {
        description: `${transcriptResult.transcriptText || 'Transcript generated'}`,
        is_processed: true
      });
      
      // Store transcript data in a way that's compatible with current schema
      console.log('📝 Transcript data:', {
        text: transcriptResult.transcriptText,
        vttUrl: transcriptResult.vttUrl,
        srtUrl: transcriptResult.srtUrl
      });
      
      console.log('✅ Transcript processing completed and saved to database');
    } else {
      console.error('❌ Transcript generation failed:', transcriptResult.error);
      
      // Update database with error status
      await VideoDB.update(dbVideoId, {
        description: 'Transcript generation failed: ' + transcriptResult.error,
        is_processed: true
      });
    }
  } catch (error) {
    console.error('❌ Asynchronous transcript processing failed:', error);
    
    try {
      await VideoDB.update(dbVideoId, {
        description: 'Transcript processing error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        is_processed: true
      });
    } catch (dbError) {
      console.error('❌ Failed to update database with transcript error:', dbError);
    }
  }
}

// GET endpoint to check upload progress
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({
        error: 'Video ID required'
      }, { status: 400 });
    }
    
    // Get video from database to check current status
    const video = await VideoDB.findById(videoId);
    
    if (!video) {
      return NextResponse.json({
        error: 'Video not found'
      }, { status: 404 });
    }
    
    // Determine current step status
    const steps: UploadStep[] = [
      {
        step: 1,
        name: 'Thumbnail Generation',
        status: video.mux_thumbnail_url ? 'completed' : 'failed',
        progress: video.mux_thumbnail_url ? 100 : 0,
        message: video.mux_thumbnail_url ? 'Thumbnail ready' : 'Thumbnail not available'
      },
      {
        step: 2,
        name: 'Video Upload Completion',
        status: video.is_processed ? 'completed' : 'failed',
        progress: video.is_processed ? 100 : 0,
        message: video.is_processed ? 'Video upload completed' : 'Video upload incomplete'
      },
      {
        step: 3,
        name: 'Transcript Processing',
        status: video.description && video.description.includes('Transcript') ? 
          (video.description.includes('error') || video.description.includes('failed') ? 'failed' : 'completed') : 
          'processing',
        progress: video.description && video.description.includes('Transcript') ? 100 : 50,
        message: video.description && video.description.includes('Transcript') ? 
          (video.description.includes('error') ? 'Transcript generation failed' : 'Transcript ready') : 
          'Transcript processing in progress...'
      }
    ];
    
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const overallProgress = (completedSteps / 3) * 100;
    
    return NextResponse.json({
      success: true,
      videoId: video.id,
      steps,
      currentStep: completedSteps + 1,
      overallProgress,
      video: {
        id: video.id,
        title: video.title,
        thumbnailPath: video.thumbnail_path,
        streamUrl: `/api/videos/stream/${video.id}`,
        muxPlaybackId: video.mux_playback_id,
        status: video.is_processed ? 'ready' : 'processing',
        transcriptStatus: video.description && video.description.includes('Transcript') ? 
          (video.description.includes('error') ? 'failed' : 'ready') : 
          'processing',
        transcriptText: video.description && video.description.includes('Transcript') && !video.description.includes('error') ? 
          video.description : undefined
      }
    } as SteppedUploadResponse);
    
  } catch (error) {
    console.error('❌ Progress check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check upload progress'
    }, { status: 500 });
  }
}
