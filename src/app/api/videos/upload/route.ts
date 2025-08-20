import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import liteVideoDatabase from '@/lib/videoDatabase-lite';
import { VideoDB } from '@/lib/database';

// For serverless environment, we'll skip local file storage
// In production, files should be uploaded directly to S3

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for large uploads

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Configure runtime for memory efficiency
// Configure to handle large files (5GB max)
export async function POST(request: NextRequest) {
  console.log('🎬 VIDEO UPLOAD: Starting POST request');
  console.log('🎬 Environment:', process.env.NODE_ENV);
  console.log('🎬 Has S3 Bucket:', !!process.env.S3_BUCKET_NAME);
  console.log('🎬 Has AWS Credentials:', !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY));
  
  if (isProduction) {
    console.log('🎬 Production mode - optimized for S3 uploads');
  }
  
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
      
      const { title, description, category, tags, visibility, s3Key, publicUrl, filename, size, mimeType } = data;
      console.log('🎬 Extracted fields:', { title, description, category, tags, visibility, s3Key, publicUrl, filename, size, mimeType });

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
      
      // Extract basic metadata
      const estimatedDuration = Math.floor(Math.random() * 3600) + 600; // Random duration for demo
      
      // Determine video dimensions based on file size
      let width = 1920;
      let height = 1080;
      
      if (size < 100 * 1024 * 1024) { // Less than 100MB
        width = 1280;
        height = 720;
      } else if (size < 50 * 1024 * 1024) { // Less than 50MB
        width = 854;
        height = 480;
      }

      // Create video record with S3 data and CloudFront optimization
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
      const optimizedStreamUrl = cloudFrontDomain 
        ? `https://${cloudFrontDomain}/${s3Key}`
        : publicUrl;

      const videoRecord = {
        id: fileId,
        title: title || filename.replace(/\.[^/.]+$/, ''),
        description: description || '',
        category: category || 'General',
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        visibility: (visibility || 'private') as 'public' | 'private' | 'unlisted',
        originalFilename: filename,
        storedFilename: s3Key,
        thumbnailPath: `/api/videos/thumbnail/${fileId}`,
        size: size,
        duration: estimatedDuration,
        width,
        height,
        bitrate: Math.round((size * 8) / estimatedDuration),
        status: 'ready' as 'processing' | 'ready' | 'failed' | 'draft', // Mark as ready since upload is complete
        uploadDate: new Date().toISOString(),
        views: 0,
        streamUrl: optimizedStreamUrl, // Use CloudFront URL if available
        createdBy: 'Current User',
        metadata: {
          mimeType: mimeType || 'video/mp4',
          originalName: filename,
          s3Key: s3Key,
          publicUrl: publicUrl,
          cloudFrontUrl: optimizedStreamUrl,
          uploadMethod: 'presigned-url',
          processingComplete: true
        }
      };

      // Save to database - use in-memory storage for serverless
      const savedVideo = liteVideoDatabase.create(videoRecord);
      console.log('🎬 Video saved to in-memory database:', savedVideo.id);

      return NextResponse.json({
        success: true,
        video: savedVideo,
        message: 'Video uploaded successfully to S3 and database'
      });
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

    // Save to database using in-memory storage
    const savedVideo = videoDatabase.create(videoRecord);
    console.log('🎬 Video saved to database:', savedVideo.id);

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
    
    // Get videos from in-memory database
    let videos = liteVideoDatabase.getAll();
    console.log('🎬 Videos loaded from database:', videos.length);
    console.log('🎬 Sample video IDs:', videos.slice(0, 3).map(v => ({ id: v.id, title: v.title })));
    
    // Apply filters
    if (query) {
      console.log('🎬 Applying search filter:', query);
      videos = liteVideoDatabase.search(query);
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
    const { id, title, description, category, tags, visibility, status } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Video ID required' },
        { status: 400 }
      );
    }
    
    // Update the video in the database
    const updatedVideo = liteVideoDatabase.update(id, {
      title,
      description,
      category,
      tags,
      visibility,
      status
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
    const success = liteVideoDatabase.delete(videoId);
    
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
