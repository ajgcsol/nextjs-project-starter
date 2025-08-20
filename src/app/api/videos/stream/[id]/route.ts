import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const quality = url.searchParams.get('quality') || 'original';
    
    // Get video from database
    const video = await VideoDB.findById(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if video is accessible (basic privacy check)
    if (!video.is_public) {
      // TODO: Add proper authentication check
      console.log('Private video access attempted');
    }

    // Increment view count (TODO: Implement in VideoDB)
    console.log('View count increment - TODO: implement in VideoDB');

    // Determine the best streaming URL
    let streamingUrl: string;
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
    
    if (video.s3_key && cloudFrontDomain) {
      // Use CloudFront for optimized delivery
      streamingUrl = `https://${cloudFrontDomain}/${video.s3_key}`;
    } else if (video.file_path && video.file_path.startsWith('http')) {
      // Use existing S3 URL
      streamingUrl = video.file_path;
    } else {
      // Fallback to file path
      streamingUrl = video.file_path || '#';
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
          type: 'video/mp4',
          url: streamingUrl
        }
      ],
      tracks: [], // For future subtitle support
      poster: `/api/videos/thumbnail/${id}`,
      metadata: {
        views: video.view_count || 0,
        uploadDate: video.uploaded_at,
        category: 'General',
        tags: [],
        createdBy: 'Current User'
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
