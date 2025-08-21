import { NextRequest, NextResponse } from 'next/server';
import { AdaptiveStreamingService } from '@/lib/adaptiveStreaming';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    
    console.log('🎬 Generating streaming manifest for video:', videoId);

    // Generate adaptive streaming manifest
    const manifest = await AdaptiveStreamingService.generateManifest(videoId);
    
    if (!manifest) {
      return NextResponse.json(
        { error: 'Video not found or manifest generation failed' },
        { status: 404 }
      );
    }

    // Check if HLS format is requested
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    
    if (format === 'hls' || format === 'm3u8') {
      // Generate HLS master playlist
      const masterPlaylist = AdaptiveStreamingService.generateMasterPlaylist(manifest);
      
      return new NextResponse(masterPlaylist, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache for manifests
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        }
      });
    }

    // Return JSON manifest by default
    return NextResponse.json({
      success: true,
      manifest
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      }
    });

  } catch (error) {
    console.error('❌ Manifest generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate streaming manifest',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
