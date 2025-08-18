import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';

const VIDEOS_DIR = path.join(process.cwd(), 'public', 'uploads', 'videos');
const PROCESSED_DIR = path.join(process.cwd(), 'public', 'uploads', 'processed');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const quality = url.searchParams.get('quality') || 'original';
    const range = request.headers.get('range');

    let filePath: string;
    
    if (quality === 'original') {
      // Find original file (could have different extensions)
      const possibleExtensions = ['.mp4', '.mov', '.avi', '.webm', '.ogg'];
      let foundFile = false;
      
      for (const ext of possibleExtensions) {
        const testPath = path.join(VIDEOS_DIR, `${id}_original${ext}`);
        if (existsSync(testPath)) {
          filePath = testPath;
          foundFile = true;
          break;
        }
      }
      
      if (!foundFile) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
    } else {
      // Processed quality file
      const qualityFile = path.join(PROCESSED_DIR, id, `${id}_${quality}.mp4`);
      
      if (!existsSync(qualityFile)) {
        // Fall back to original if processed version doesn't exist
        const originalFile = path.join(VIDEOS_DIR, `${id}_original.mp4`);
        if (existsSync(originalFile)) {
          filePath = originalFile;
        } else {
          return NextResponse.json(
            { error: 'Video quality not available' },
            { status: 404 }
          );
        }
      } else {
        filePath = qualityFile;
      }
    }

    const stat = statSync(filePath!);
    const fileSize = stat.size;

    // Handle range requests for video streaming
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const stream = createReadStream(filePath!, { start, end });

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600',
      };

      return new Response(stream as any, {
        status: 206, // Partial Content
        headers
      });
    } else {
      // Full file response
      const stream = createReadStream(filePath!);
      
      const headers = {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
      };

      return new Response(stream as any, {
        status: 200,
        headers
      });
    }

  } catch (error) {
    console.error('Video streaming error:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}