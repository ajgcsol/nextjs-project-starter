import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import videoDatabase from '@/lib/videoDatabase';

const THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');

// Ensure thumbnails directory exists
if (!existsSync(THUMBNAILS_DIR)) {
  mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check for custom thumbnail first
    const customThumbnailPath = path.join(THUMBNAILS_DIR, `${id}_custom.jpg`);
    if (existsSync(customThumbnailPath)) {
      const stat = statSync(customThumbnailPath);
      const stream = createReadStream(customThumbnailPath);
      return new Response(stream as any, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Check for auto-generated thumbnail
    const autoThumbnailPath = path.join(THUMBNAILS_DIR, `${id}_thumb.jpg`);
    if (existsSync(autoThumbnailPath)) {
      const stat = statSync(autoThumbnailPath);
      const stream = createReadStream(autoThumbnailPath);
      return new Response(stream as any, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': stat.size.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Generate placeholder thumbnail
    return generatePlaceholderThumbnail(id);

  } catch (error) {
    console.error('Thumbnail error:', error);
    return generatePlaceholderThumbnail('error');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('thumbnail') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No thumbnail file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Save custom thumbnail
    const customThumbnailPath = path.join(THUMBNAILS_DIR, `${id}_custom.jpg`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    writeFileSync(customThumbnailPath, buffer);

    // Update database record
    const video = videoDatabase.get(id);
    if (video) {
      videoDatabase.update(id, {
        thumbnailPath: `/api/videos/thumbnail/${id}`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thumbnail updated successfully',
      thumbnailUrl: `/api/videos/thumbnail/${id}`
    });

  } catch (error) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload thumbnail' },
      { status: 500 }
    );
  }
}

function generatePlaceholderThumbnail(id: string) {
  // Create a simple SVG placeholder thumbnail
  const svg = `
    <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <circle cx="640" cy="360" r="80" fill="rgba(255,255,255,0.2)"/>
      <polygon points="610,320 610,400 680,360" fill="rgba(255,255,255,0.8)"/>
      <text x="640" y="480" font-family="Arial, sans-serif" font-size="24" 
            fill="rgba(255,255,255,0.7)" text-anchor="middle">
        Video Thumbnail
      </text>
      <text x="640" y="520" font-family="Arial, sans-serif" font-size="16" 
            fill="rgba(255,255,255,0.5)" text-anchor="middle">
        ID: ${id.substring(0, 8)}...
      </text>
    </svg>
  `;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}