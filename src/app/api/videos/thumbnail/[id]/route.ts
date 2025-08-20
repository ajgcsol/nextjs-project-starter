import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { AWSFileManager } from '@/lib/aws-integration';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if video exists and has custom thumbnail
    const video = await VideoDB.findById(id);
    
    // Check if video has a thumbnail path
    if (video?.thumbnail_path && video.thumbnail_path.startsWith('http')) {
      // Redirect to external thumbnail URL
      return NextResponse.redirect(video.thumbnail_path);
    }
    
    // Fallback to placeholder
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

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Thumbnail file too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const video = await VideoDB.findById(id);
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    try {
      // Try to upload to S3 first
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate S3 key for thumbnail
      const extension = file.name.split('.').pop() || 'jpg';
      const s3Key = `thumbnails/${id}-${Date.now()}.${extension}`;
      
      // Upload to S3
      const uploadResult = await AWSFileManager.uploadFile(
        buffer,
        s3Key,
        file.type
      );
      
      // Update video with S3 thumbnail info
      liteVideoDatabase.update(id, {
        thumbnailPath: `/api/videos/thumbnail/${id}`,
        metadata: {
          ...video.metadata,
          s3ThumbnailKey: s3Key,
          s3ThumbnailUrl: uploadResult.Location,
          thumbnailType: file.type
        }
      });

      // Return CloudFront URL if available
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
      const thumbnailUrl = cloudFrontDomain 
        ? `https://${cloudFrontDomain}/${s3Key}`
        : uploadResult.Location;

      return NextResponse.json({
        success: true,
        message: 'Thumbnail uploaded to S3 successfully',
        thumbnailUrl: `/api/videos/thumbnail/${id}`,
        s3Url: thumbnailUrl
      });

    } catch (s3Error) {
      console.warn('S3 upload failed, falling back to base64 storage:', s3Error);
      
      // Fallback to base64 storage in database
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64Data = buffer.toString('base64');

      liteVideoDatabase.update(id, {
        thumbnailPath: `/api/videos/thumbnail/${id}`,
        metadata: {
          ...video.metadata,
          customThumbnail: base64Data,
          thumbnailType: file.type
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Thumbnail stored successfully (fallback mode)',
        thumbnailUrl: `/api/videos/thumbnail/${id}`
      });
    }

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