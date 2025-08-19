import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import videoDatabase from '@/lib/videoDatabase';

// Configure upload directories - use public folder for direct serving
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const VIDEOS_DIR = path.join(UPLOAD_DIR, 'videos');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure directories exist
async function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, VIDEOS_DIR, THUMBNAILS_DIR]) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for large uploads

// Configure to handle large files (5GB max)
export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const visibility = formData.get('visibility') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/x-m4v'
    ];

    const fileType = file.type || 'video/mp4';
    if (!allowedTypes.includes(fileType) && !fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a video file.' },
        { status: 400 }
      );
    }

    // Check file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5GB (current: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB)` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileId = uuidv4();
    const fileExtension = path.extname(file.name) || '.mp4';
    const originalFilename = `${fileId}_original${fileExtension}`;
    const originalPath = path.join(VIDEOS_DIR, originalFilename);

    // Save original file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(originalPath, buffer);

    // Generate thumbnail placeholder path
    const thumbnailFilename = `${fileId}_thumb.jpg`;
    const thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
    
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
      status: 'ready' as 'processing' | 'ready' | 'failed', // Mark as ready immediately
      uploadDate: new Date().toISOString(),
      views: 0,
      streamUrl: `/uploads/videos/${originalFilename}`,
      createdBy: 'Current User', // In production, get from auth context
      metadata: {
        mimeType: fileType,
        originalName: file.name,
        fileExtension: fileExtension
      }
    };

    // Save to database
    const savedVideo = videoDatabase.create(videoRecord);

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
    console.error('Upload error:', error);
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
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const visibility = url.searchParams.get('visibility');
    
    let videos = videoDatabase.getAll();
    
    // Apply filters
    if (query) {
      videos = videoDatabase.search(query);
    }
    
    if (category && category !== 'All Categories') {
      videos = videos.filter(v => v.category === category);
    }
    
    if (visibility) {
      videos = videos.filter(v => v.visibility === visibility);
    }
    
    // Sort by upload date (newest first)
    videos.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    
    return NextResponse.json({
      videos,
      total: videos.length
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
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
    const updatedVideo = videoDatabase.update(id, {
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
    
    const success = videoDatabase.delete(videoId);
    
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