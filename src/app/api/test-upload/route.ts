import { NextRequest, NextResponse } from 'next/server';
import videoDatabase from '@/lib/videoDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Create a mock video record with a working external video URL for testing
    const fileId = uuidv4();
    const testVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    
    const videoRecord = {
      id: fileId,
      title: "Big Buck Bunny (Test Video)",
      description: "Sample video for testing the video player functionality",
      category: "Test",
      tags: ["test", "sample", "demo"],
      visibility: "public" as 'public' | 'private' | 'unlisted',
      originalFilename: "BigBuckBunny.mp4",
      storedFilename: "test-video.mp4",
      thumbnailPath: "/uploads/thumbnails/test_thumb.jpg",
      size: 158235000, // ~150MB estimated
      duration: 596, // ~10 minutes
      width: 1920,
      height: 1080,
      bitrate: 2000000,
      status: 'ready' as 'processing' | 'ready' | 'failed',
      uploadDate: new Date().toISOString(),
      views: 0,
      streamUrl: testVideoUrl, // Use external URL for testing
      createdBy: 'Test User',
      metadata: {
        mimeType: 'video/mp4',
        originalName: 'BigBuckBunny.mp4',
        fileExtension: '.mp4'
      }
    };

    // Save to database
    const savedVideo = videoDatabase.create(videoRecord);

    return NextResponse.json({
      success: true,
      video: savedVideo,
      message: 'Test video created successfully',
      note: 'This uses an external sample video for testing purposes'
    });

  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test video', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}