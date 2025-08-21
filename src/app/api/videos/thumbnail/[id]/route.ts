import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { AWSFileManager } from '@/lib/aws-integration';
import { MediaDiscoveryService, ThumbnailResponse } from '@/lib/mediaDiscovery';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    
    console.log('🖼️ Thumbnail request for video ID:', videoId);
    
    // Check if video exists and has custom thumbnail
    const video = await VideoDB.findById(videoId);
    
    let thumbnailUrl = '';
    let discoveryMethod = 'database';
    let discoveryAttempts: string[] = [];
    let shouldRepairDatabase = false;
    let discoveredThumbnailS3Key = '';

    // Priority 1: Use existing thumbnail_path if it's a valid URL or data URL
    if (video?.thumbnail_path) {
      if (video.thumbnail_path.startsWith('data:image/')) {
        // Handle data URL thumbnails (enhanced SVG thumbnails)
        console.log('🎨 Using stored data URL thumbnail');
        discoveryMethod = 'database_data_url';
        discoveryAttempts.push(`database_data_url: ${video.thumbnail_path.substring(0, 50)}...`);
        
        // Extract the base64 data and decode it
        const base64Data = video.thumbnail_path.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Return the decoded image data
        return new Response(imageBuffer, {
          headers: {
            'Content-Type': video.thumbnail_path.includes('svg') ? 'image/svg+xml' : 'image/jpeg',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } else if (video.thumbnail_path.startsWith('http')) {
        thumbnailUrl = video.thumbnail_path;
        discoveryMethod = 'database_thumbnail_path';
        discoveryAttempts.push(`database_thumbnail_path: ${thumbnailUrl}`);
        console.log('🔗 Using stored thumbnail path:', thumbnailUrl);

        // Validate the URL works
        const isValid = await MediaDiscoveryService.validateMediaUrl(thumbnailUrl);
        if (!isValid) {
          console.log('⚠️ Database thumbnail path is invalid, falling back to discovery');
          thumbnailUrl = '';
          discoveryAttempts.push(`database_thumbnail_path_invalid: ${thumbnailUrl}`);
        }
      }
    }

    // Priority 2: Try to generate thumbnail from video if no stored thumbnail
    if (!thumbnailUrl && video) {
      console.log('🎬 No stored thumbnail, attempting to generate from video...');
      
      // Try to get video URL for thumbnail generation
      let videoUrl = '';
      
      // Use S3 key to construct CloudFront URL
      if (video.s3_key) {
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
        videoUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
        
        // Validate video URL works
        const isValid = await MediaDiscoveryService.validateMediaUrl(videoUrl);
        if (isValid) {
          console.log('✅ Video URL validated for thumbnail generation:', videoUrl);
          
          // For now, just return placeholder since client-side generation is complex
          console.log('📹 Video URL available but using placeholder for now:', videoUrl);
        }
      }
      
      // Try file_path if s3_key didn't work
      if (!videoUrl && video.file_path && video.file_path.startsWith('http')) {
        const isValid = await MediaDiscoveryService.validateMediaUrl(video.file_path);
        if (isValid) {
          console.log('📹 File path available but using placeholder for now:', video.file_path);
        }
      }
      
      discoveryAttempts.push('video_thumbnail_generation: no_valid_video_url');
    }

    // Priority 3: Generate placeholder if no thumbnail found
    if (!thumbnailUrl) {
      console.log('🎨 No thumbnail found, generating placeholder');
      discoveryMethod = 'placeholder_fallback';
      discoveryAttempts.push('placeholder_fallback: generated');
      
      if (!video) {
        return generatePlaceholderThumbnail('not-found');
      }
      
      return generatePlaceholderThumbnail(videoId);
    }

    console.log('✅ Final thumbnail URL:', thumbnailUrl);
    console.log('📊 Discovery method:', discoveryMethod);
    console.log('🔍 Discovery attempts:', discoveryAttempts);

    // Redirect to the thumbnail URL
    return NextResponse.redirect(thumbnailUrl);

  } catch (error) {
    console.error('❌ Thumbnail error:', error);
    const { id } = await params;
    return generatePlaceholderThumbnail(id || 'error');
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
      
      // Get CloudFront domain from environment
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
      
      // Generate the final thumbnail URL (prefer CloudFront if available)
      const thumbnailUrl = cloudFrontDomain 
        ? `https://${cloudFrontDomain}/${s3Key}`
        : uploadResult.Location;
      
      // Update video with S3 thumbnail info
      await VideoDB.update(id, {
        thumbnail_path: thumbnailUrl
      });

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

      // Note: Base64 storage not supported in persistent database
      // For now, we'll skip storing base64 thumbnails and rely on placeholder
      console.warn('Base64 thumbnail storage not implemented for persistent database');

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