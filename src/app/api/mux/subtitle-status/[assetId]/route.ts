import { NextRequest, NextResponse } from 'next/server';
import { MuxUploaderHandler } from '@/lib/mux-uploader-handler';

interface RouteParams {
  params: {
    assetId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { assetId } = params;

    if (!assetId) {
      return NextResponse.json({
        success: false,
        error: 'Asset ID is required'
      }, { status: 400 });
    }

    console.log('📝 Checking subtitle status for asset:', assetId);

    // Check if the asset has subtitle generation
    const subtitleStatus = await MuxUploaderHandler.hasSubtitleGeneration(assetId);

    console.log('📊 Subtitle status result:', {
      assetId,
      hasSubtitles: subtitleStatus.hasSubtitles,
      trackCount: subtitleStatus.subtitleTracks.length
    });

    return NextResponse.json({
      success: true,
      hasSubtitles: subtitleStatus.hasSubtitles,
      subtitleTracks: subtitleStatus.subtitleTracks,
      message: subtitleStatus.hasSubtitles ? 
        `Found ${subtitleStatus.subtitleTracks.length} subtitle tracks` : 
        'No subtitle tracks found'
    });

  } catch (error) {
    console.error('❌ Failed to get subtitle status:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error getting subtitle status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { assetId } = params;
    const body = await request.json();
    const { language = 'en', name } = body;

    if (!assetId) {
      return NextResponse.json({
        success: false,
        error: 'Asset ID is required'
      }, { status: 400 });
    }

    console.log('📝 Generating subtitles for asset:', assetId, 'in language:', language);

    // Generate subtitles retroactively (for assets created within last 7 days)
    const result = await MuxUploaderHandler.generateSubtitlesForAsset(assetId, {
      language,
      name
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    console.log('✅ Subtitle generation initiated:', result.trackId);

    return NextResponse.json({
      success: true,
      trackId: result.trackId,
      message: `Subtitle generation started for ${language} language`
    });

  } catch (error) {
    console.error('❌ Failed to generate subtitles:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating subtitles'
    }, { status: 500 });
  }
}