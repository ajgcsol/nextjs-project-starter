import { NextRequest, NextResponse } from 'next/server';
import { MuxUploaderHandler } from '@/lib/mux-uploader-handler';
import { createMuxSignedPlaybackFromEnv } from '@/lib/mux-signed-playback';

interface RouteParams {
  params: {
    uploadId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { uploadId } = params;

    if (!uploadId) {
      return NextResponse.json({
        success: false,
        error: 'Upload ID is required'
      }, { status: 400 });
    }

    console.log('🔍 Checking upload status for:', uploadId);

    // Get upload status from Mux
    const uploadStatus = await MuxUploaderHandler.getUploadStatus(uploadId);

    if (!uploadStatus.success) {
      return NextResponse.json({
        success: false,
        error: uploadStatus.error
      }, { status: 500 });
    }

    // If the video is ready, generate URLs including thumbnails and subtitles
    let urls: any = {};
    
    if (uploadStatus.status === 'ready' && uploadStatus.playbackId) {
      const signedPlayback = createMuxSignedPlaybackFromEnv();
      
      if (signedPlayback) {
        // Generate signed URLs with thumbnails
        urls = signedPlayback.getAllSignedUrls(uploadStatus.playbackId, {
          expirationTime: 7200 // 2 hours
        });
        
        // Add multiple thumbnail variants
        urls.thumbnails = {
          small: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
            time: 10,
            width: 320,
            height: 180,
            expirationTime: 7200
          }),
          medium: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
            time: 10,
            width: 640,
            height: 360,
            expirationTime: 7200
          }),
          large: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
            time: 10,
            width: 1280,
            height: 720,
            expirationTime: 7200
          }),
          variants: [
            {
              time: 5,
              url: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
                time: 5,
                width: 1280,
                height: 720,
                expirationTime: 7200
              })
            },
            {
              time: 15,
              url: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
                time: 15,
                width: 1280,
                height: 720,
                expirationTime: 7200
              })
            },
            {
              time: 30,
              url: signedPlayback.getSignedThumbnailUrl(uploadStatus.playbackId, {
                time: 30,
                width: 1280,
                height: 720,
                expirationTime: 7200
              })
            }
          ]
        };
        
        console.log('🖼️ Generated thumbnail URLs:', Object.keys(urls.thumbnails));
        
      } else {
        // Generate public URLs
        urls = {
          streaming: `https://stream.mux.com/${uploadStatus.playbackId}.m3u8`,
          thumbnail: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=10`,
          thumbnails: {
            small: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=10&width=320&height=180`,
            medium: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=10&width=640&height=360`,
            large: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=10&width=1280&height=720`,
            variants: [
              {
                time: 5,
                url: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=5&width=1280&height=720`
              },
              {
                time: 15,
                url: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=15&width=1280&height=720`
              },
              {
                time: 30,
                url: `https://image.mux.com/${uploadStatus.playbackId}/thumbnail.jpg?time=30&width=1280&height=720`
              }
            ]
          },
          mp4: {
            high: `https://stream.mux.com/${uploadStatus.playbackId}/high.mp4`,
            medium: `https://stream.mux.com/${uploadStatus.playbackId}/medium.mp4`,
            low: `https://stream.mux.com/${uploadStatus.playbackId}/low.mp4`
          }
        };
      }
    }

    console.log('📊 Upload status response:', {
      uploadId,
      status: uploadStatus.status,
      assetId: uploadStatus.assetId,
      playbackId: uploadStatus.playbackId,
      hasUrls: Object.keys(urls).length > 0
    });

    return NextResponse.json({
      success: true,
      status: uploadStatus,
      urls,
      message: `Upload status: ${uploadStatus.status}`
    });

  } catch (error) {
    console.error('❌ Failed to get upload status:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting upload status'
    }, { status: 500 });
  }
}