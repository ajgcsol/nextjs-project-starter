import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking for orphaned Mux assets...');

    // Get videos from the past day that might not be connected to Mux assets
    const recentVideos = await VideoDB.findRecentVideos(24); // Last 24 hours
    
    console.log(`📊 Found ${recentVideos.length} recent videos to check`);

    const orphanedAssets = [];
    const connectedAssets = [];

    for (const video of recentVideos) {
      if (!video.mux_asset_id || !video.mux_playback_id) {
        orphanedAssets.push({
          videoId: video.id,
          title: video.title,
          filename: video.filename,
          uploadDate: video.created_at,
          hasMuxAssetId: !!video.mux_asset_id,
          hasMuxPlaybackId: !!video.mux_playback_id,
          s3Key: video.s3_key
        });
      } else {
        connectedAssets.push({
          videoId: video.id,
          title: video.title,
          muxAssetId: video.mux_asset_id,
          muxPlaybackId: video.mux_playback_id
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRecentVideos: recentVideos.length,
        orphanedCount: orphanedAssets.length,
        connectedCount: connectedAssets.length,
        orphanedPercentage: Math.round((orphanedAssets.length / recentVideos.length) * 100)
      },
      orphanedAssets,
      connectedAssets: connectedAssets.slice(0, 5), // Show first 5 connected
      recommendation: orphanedAssets.length > 0 
        ? "Some videos are not connected to Mux assets. This may indicate upload flow issues."
        : "All recent videos are properly connected to Mux assets."
    });

  } catch (error) {
    console.error('❌ Failed to check orphaned assets:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check orphaned assets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}