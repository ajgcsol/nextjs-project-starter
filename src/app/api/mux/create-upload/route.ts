import { NextRequest, NextResponse } from 'next/server';
import { MuxUploaderHandler, type MuxUploaderConfig } from '@/lib/mux-uploader-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body as { config: MuxUploaderConfig };

    if (!config || !config.videoId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required config or videoId'
      }, { status: 400 });
    }

    console.log('🎬 Creating Mux upload endpoint for video:', config.videoId);
    console.log('📝 Upload config:', JSON.stringify(config, null, 2));

    // Create the direct upload with subtitle and thumbnail support
    const uploadResult = await MuxUploaderHandler.createUploadEndpoint(config);

    if (!uploadResult.success) {
      return NextResponse.json({
        success: false,
        error: uploadResult.error
      }, { status: 500 });
    }

    console.log('✅ Mux upload endpoint created successfully:', {
      uploadId: uploadResult.uploadId,
      endpoint: uploadResult.endpoint?.substring(0, 50) + '...'
    });

    return NextResponse.json({
      success: true,
      endpoint: uploadResult.endpoint,
      uploadId: uploadResult.uploadId,
      message: 'Upload endpoint created with subtitle and thumbnail generation enabled'
    });

  } catch (error) {
    console.error('❌ Failed to create Mux upload endpoint:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating upload endpoint'
    }, { status: 500 });
  }
}