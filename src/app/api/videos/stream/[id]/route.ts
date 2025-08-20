import { NextRequest, NextResponse } from 'next/server';
import videoDatabase from '@/lib/videoDatabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const quality = url.searchParams.get('quality') || 'original';
    
    // Get video from database
    const video = videoDatabase.get(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if video is accessible (basic privacy check)
    if (video.visibility === 'private') {
      // TODO: Add proper authentication check
      console.log('Private video access attempted');
    }

    // Increment view count
    videoDatabase.incrementViews(id);

    // Determine the best streaming URL
    let streamingUrl: string;
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    
    if (video.metadata?.s3Key && cloudFrontDomain) {
      // Use CloudFront for optimized delivery
      streamingUrl = `https://${cloudFrontDomain}/${video.metadata.s3Key}`;
    } else if (video.streamUrl && video.streamUrl.startsWith('http')) {
      // Use existing S3 URL
      streamingUrl = video.streamUrl;
    } else {
      // Fallback to public URL
      streamingUrl = video.metadata?.publicUrl || video.streamUrl || '#';
    }

    // For direct video streaming, redirect to the CDN URL
    if (url.searchParams.get('download') !== 'true') {
      return NextResponse.redirect(streamingUrl);
    }

    // Return video metadata for players
    return NextResponse.json({
      id: video.id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      thumbnail: `/api/videos/thumbnail/${id}`,
      sources: [
        {
          quality: 'original',
          type: video.metadata?.mimeType || 'video/mp4',
          url: streamingUrl
        }
      ],
      tracks: [], // For future subtitle support
      poster: `/api/videos/thumbnail/${id}`,
      metadata: {
        views: video.views,
        uploadDate: video.uploadDate,
        category: video.category,
        tags: video.tags,
        createdBy: video.createdBy
      }
    });

  } catch (error) {
    console.error('Video streaming error:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}
