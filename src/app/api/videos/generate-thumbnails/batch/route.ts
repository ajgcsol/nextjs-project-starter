import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { AWSFileManager } from '@/lib/aws-integration';

// Simple thumbnail generation using canvas (server-side)
async function generateThumbnailFromVideo(videoUrl: string, videoId: string): Promise<string | null> {
  try {
    console.log('🖼️ Generating thumbnail for video:', videoId);
    
    // For now, we'll create a simple thumbnail with video info
    // In a real implementation, you'd use ffmpeg or similar to extract a frame
    const thumbnailS3Key = `thumbnails/${videoId}-${Date.now()}.jpg`;
    
    // Create a simple thumbnail image (placeholder for now)
    const thumbnailData = await createSimpleThumbnail(videoId);
    
    // Upload to S3
    const uploadResult = await AWSFileManager.uploadFile(
      thumbnailData,
      thumbnailS3Key,
      'image/jpeg'
    );
    
    // Update video record with thumbnail
    await VideoDB.update(videoId, {
      thumbnail_path: uploadResult.Location
    });
    
    console.log('✅ Thumbnail generated and uploaded:', uploadResult.Location);
    return uploadResult.Location;
    
  } catch (error) {
    console.error('❌ Thumbnail generation failed:', error);
    return null;
  }
}

// Create a simple thumbnail image (this is a placeholder - in production you'd use ffmpeg)
async function createSimpleThumbnail(videoId: string): Promise<Buffer> {
  // This is a placeholder - in a real implementation, you'd use ffmpeg to extract a frame
  // For now, we'll create a simple colored rectangle as a thumbnail
  
  const width = 1280;
  const height = 720;
  
  // Create a simple SVG thumbnail
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <circle cx="${width/2}" cy="${height/2}" r="80" fill="rgba(255,255,255,0.2)"/>
      <polygon points="${width/2-30},${height/2-40} ${width/2-30},${height/2+40} ${width/2+30},${height/2}" fill="rgba(255,255,255,0.9)"/>
      <text x="${width/2}" y="${height/2+120}" font-family="Arial, sans-serif" font-size="32" 
            fill="rgba(255,255,255,0.9)" text-anchor="middle" font-weight="bold">
        Video Thumbnail
      </text>
      <text x="${width/2}" y="${height/2+160}" font-family="Arial, sans-serif" font-size="20" 
            fill="rgba(255,255,255,0.7)" text-anchor="middle">
        ID: ${videoId.substring(0, 8)}...
      </text>
    </svg>
  `;
  
  // Convert SVG to buffer (in a real implementation, you'd convert to JPEG)
  return Buffer.from(svg, 'utf-8');
}

export async function POST(request: NextRequest) {
  try {
    console.log('🖼️ Starting batch thumbnail generation...');
    
    // Get all videos that need thumbnails
    const videos = await VideoDB.findVideosWithoutThumbnails(50);
    
    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos need thumbnail generation',
        processed: 0
      });
    }
    
    console.log(`🖼️ Found ${videos.length} videos needing thumbnails`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const video of videos) {
      try {
        console.log(`🖼️ Processing video: ${video.id} - ${video.title}`);
        
        // Try to get the video URL for thumbnail generation
        let videoUrl = '';
        
        if (video.s3_key) {
          const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';
          videoUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
        } else if (video.file_path && video.file_path.startsWith('http')) {
          videoUrl = video.file_path;
        }
        
        if (!videoUrl) {
          console.log(`⚠️ No valid video URL for ${video.id}, skipping`);
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: 'No valid video URL'
          });
          failureCount++;
          continue;
        }
        
        const thumbnailUrl = await generateThumbnailFromVideo(videoUrl, video.id);
        
        if (thumbnailUrl) {
          results.push({
            videoId: video.id,
            title: video.title,
            success: true,
            thumbnailUrl
          });
          successCount++;
        } else {
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: 'Thumbnail generation failed'
          });
          failureCount++;
        }
        
        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing video ${video.id}:`, error);
        results.push({
          videoId: video.id,
          title: video.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }
    
    console.log(`✅ Batch thumbnail generation completed: ${successCount} success, ${failureCount} failures`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${videos.length} videos`,
      processed: videos.length,
      successCount,
      failureCount,
      results
    });
    
  } catch (error) {
    console.error('❌ Batch thumbnail generation error:', error);
    return NextResponse.json(
      { 
        error: 'Batch thumbnail generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get count of videos needing thumbnails
    const videos = await VideoDB.findVideosWithoutThumbnails(100);
    
    return NextResponse.json({
      success: true,
      videosNeedingThumbnails: videos.length,
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        filename: v.filename,
        uploadDate: v.uploaded_at,
        hasS3Key: !!v.s3_key,
        hasFilePath: !!v.file_path
      }))
    });
    
  } catch (error) {
    console.error('❌ Error checking videos needing thumbnails:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check videos needing thumbnails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
