import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { MediaDiscoveryService } from '@/lib/mediaDiscovery';
import { videoMonitor } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Database repair analysis request');
    
    // Find videos that need repair
    const videosNeedingRepair = await VideoDB.findVideosNeedingRepair();
    
    console.log(`📊 Found ${videosNeedingRepair.length} videos needing repair`);
    
    return NextResponse.json({
      success: true,
      videosNeedingRepair: videosNeedingRepair.length,
      videos: videosNeedingRepair.map(video => ({
        id: video.id,
        title: video.title,
        filename: video.filename,
        hasS3Key: !!video.s3_key,
        hasFilePath: !!video.file_path,
        hasThumbnailPath: !!video.thumbnail_path,
        isPlaceholder: video.file_path?.includes('#placeholder-') || false,
        isThumbnailEndpoint: video.thumbnail_path?.includes('/api/videos/thumbnail/') || false,
        uploadedAt: video.uploaded_at
      }))
    });

  } catch (error) {
    console.error('❌ Database repair analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze database repair needs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, videoIds, discoverAll = false } = body;

    console.log('🔧 Database repair request:', { action, videoIds: videoIds?.length, discoverAll });

    if (action === 'repair') {
      let videosToRepair = [];

      if (discoverAll) {
        // Get all videos needing repair
        videosToRepair = await VideoDB.findVideosNeedingRepair();
        console.log(`📊 Found ${videosToRepair.length} videos needing repair`);
      } else if (videoIds && Array.isArray(videoIds)) {
        // Get specific videos
        videosToRepair = [];
        for (const videoId of videoIds) {
          const video = await VideoDB.findById(videoId);
          if (video) {
            videosToRepair.push(video);
          }
        }
        console.log(`📊 Processing ${videosToRepair.length} specified videos`);
      } else {
        return NextResponse.json(
          { error: 'Either provide videoIds array or set discoverAll to true' },
          { status: 400 }
        );
      }

      if (videosToRepair.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No videos found needing repair',
          repaired: 0,
          failed: 0,
          results: []
        });
      }

      // Process repairs
      const repairResults = [];
      let repairedCount = 0;
      let failedCount = 0;

      for (const video of videosToRepair) {
        try {
          console.log(`🔍 Processing video: ${video.id} - ${video.title}`);
          
          let videoDiscovered = false;
          let thumbnailDiscovered = false;
          let videoUrl = '';
          let thumbnailUrl = '';
          let videoS3Key = '';
          let thumbnailS3Key = '';

          // Discover video if needed
          if (!video.s3_key || !video.file_path || video.file_path.includes('#placeholder-')) {
            console.log(`🎥 Discovering video for: ${video.id}`);
            const videoDiscovery = await MediaDiscoveryService.discoverVideo(video.id);
            
            if (videoDiscovery.found && videoDiscovery.url) {
              videoDiscovered = true;
              videoUrl = videoDiscovery.url;
              videoS3Key = videoDiscovery.s3Key || '';
              console.log(`✅ Video discovered: ${videoUrl}`);
            } else {
              console.log(`❌ Video not discovered for: ${video.id}`);
            }
          }

          // Discover thumbnail if needed
          if (!video.thumbnail_path || video.thumbnail_path.includes('/api/videos/thumbnail/')) {
            console.log(`🖼️ Discovering thumbnail for: ${video.id}`);
            const thumbnailDiscovery = await MediaDiscoveryService.discoverThumbnail(video.id);
            
            if (thumbnailDiscovery.found && thumbnailDiscovery.url) {
              thumbnailDiscovered = true;
              thumbnailUrl = thumbnailDiscovery.url;
              thumbnailS3Key = thumbnailDiscovery.s3Key || '';
              console.log(`✅ Thumbnail discovered: ${thumbnailUrl}`);
            } else {
              console.log(`❌ Thumbnail not discovered for: ${video.id}`);
            }
          }

          // Apply repairs if any discoveries were made
          if (videoDiscovered || thumbnailDiscovered) {
            const repairResult = await VideoDB.repairVideoRecord(
              video.id,
              videoS3Key || undefined,
              thumbnailS3Key || undefined,
              videoUrl || undefined,
              thumbnailUrl || undefined
            );

            if (repairResult) {
              repairedCount++;
              repairResults.push({
                videoId: video.id,
                title: video.title,
                success: true,
                videoDiscovered,
                thumbnailDiscovered,
                videoUrl: videoDiscovered ? videoUrl : 'unchanged',
                thumbnailUrl: thumbnailDiscovered ? thumbnailUrl : 'unchanged'
              });
              
              console.log(`✅ Successfully repaired: ${video.id}`);
            } else {
              failedCount++;
              repairResults.push({
                videoId: video.id,
                title: video.title,
                success: false,
                error: 'Database update failed'
              });
              
              console.log(`❌ Failed to repair database record: ${video.id}`);
            }
          } else {
            repairResults.push({
              videoId: video.id,
              title: video.title,
              success: false,
              error: 'No media discovered'
            });
            
            failedCount++;
            console.log(`❌ No media discovered for: ${video.id}`);
          }

        } catch (videoError) {
          failedCount++;
          repairResults.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: videoError instanceof Error ? videoError.message : 'Unknown error'
          });
          
          console.error(`❌ Error processing video ${video.id}:`, videoError);
        }
      }

      // Log repair completion
      await videoMonitor.logUploadEvent('database_repair_completed', {
        totalVideos: videosToRepair.length,
        repairedCount,
        failedCount,
        successRate: (repairedCount / videosToRepair.length) * 100
      });

      return NextResponse.json({
        success: true,
        message: `Repair completed: ${repairedCount} repaired, ${failedCount} failed`,
        totalProcessed: videosToRepair.length,
        repaired: repairedCount,
        failed: failedCount,
        results: repairResults
      });

    } else if (action === 'test') {
      // Test discovery for a single video without making changes
      const { videoId } = body;
      
      if (!videoId) {
        return NextResponse.json(
          { error: 'videoId required for test action' },
          { status: 400 }
        );
      }

      console.log(`🧪 Testing discovery for video: ${videoId}`);

      const video = await VideoDB.findById(videoId);
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      // Test video discovery
      const videoDiscovery = await MediaDiscoveryService.discoverVideo(videoId);
      
      // Test thumbnail discovery
      const thumbnailDiscovery = await MediaDiscoveryService.discoverThumbnail(videoId);

      return NextResponse.json({
        success: true,
        videoId,
        title: video.title,
        currentState: {
          s3_key: video.s3_key,
          file_path: video.file_path,
          thumbnail_path: video.thumbnail_path
        },
        videoDiscovery: {
          found: videoDiscovery.found,
          url: videoDiscovery.url,
          s3Key: videoDiscovery.s3Key,
          method: videoDiscovery.method
        },
        thumbnailDiscovery: {
          found: thumbnailDiscovery.found,
          url: thumbnailDiscovery.url,
          s3Key: thumbnailDiscovery.s3Key,
          method: thumbnailDiscovery.method
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "repair" or "test".' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Database repair error:', error);
    return NextResponse.json(
      { 
        error: 'Database repair failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
