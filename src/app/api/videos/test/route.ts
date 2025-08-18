import { NextRequest, NextResponse } from 'next/server';
import videoDatabase from '@/lib/videoDatabase';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Get all videos from database
    const videos = videoDatabase.getAll();
    
    // Check upload directories
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const videosDir = path.join(uploadsDir, 'videos');
    
    let uploadedFiles: string[] = [];
    let dirExists = false;
    
    if (existsSync(videosDir)) {
      dirExists = true;
      uploadedFiles = readdirSync(videosDir);
    }
    
    return NextResponse.json({
      databaseVideos: videos,
      totalInDatabase: videos.length,
      uploadDirectory: {
        exists: dirExists,
        path: videosDir,
        files: uploadedFiles,
        fileCount: uploadedFiles.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test endpoint error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}