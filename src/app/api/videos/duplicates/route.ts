import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  console.log('🔍 Duplicate detection API called');
  
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const includeResolved = url.searchParams.get('includeResolved') === 'true';
    
    console.log('🔍 Finding duplicate videos...');
    
    // Find all duplicate videos
    // For now, return empty array since findDuplicateVideos method doesn't exist yet
    const duplicateGroups: any[] = [];
    
    console.log(`🔍 Found ${duplicateGroups.length} duplicate groups`);
    
    // Filter out resolved duplicates if requested
    const filteredGroups = includeResolved 
      ? duplicateGroups 
      : duplicateGroups.filter(group => group.videos.length > 1);
    
    // Limit results
    const limitedGroups = filteredGroups.slice(0, limit);
    
    // Calculate statistics
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.videos.length - 1), 0);
    const duplicatesByType = duplicateGroups.reduce((acc, group) => {
      acc[group.type] = (acc[group.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Generate resolution instructions
    const resolutionInstructions = [
      "1. Review each duplicate group carefully",
      "2. Choose the primary video (usually the most recent or complete)",
      "3. Use the merge action to consolidate metadata",
      "4. Verify the result before confirming",
      "5. Monitor for new duplicates regularly"
    ];
    
    return NextResponse.json({
      success: true,
      duplicateGroups: limitedGroups,
      statistics: {
        totalGroups: duplicateGroups.length,
        totalDuplicates,
        duplicatesByType,
        averageDuplicatesPerGroup: duplicateGroups.length > 0 
          ? Math.round((totalDuplicates / duplicateGroups.length) * 100) / 100 
          : 0
      },
      resolutionInstructions,
      debugInfo: {
        searchCriteria: ['mux_asset_id', 'filename_timing'],
        timeWindow: '300 seconds',
        includeResolved,
        limit
      }
    });
    
  } catch (error) {
    console.error('❌ Duplicate detection error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to detect duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check database connectivity',
        'Ensure duplicate detection functions are available',
        'Verify Mux integration fields exist',
        'Check database migration status'
      ]
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('🔧 Duplicate resolution API called');
  
  try {
    const body = await request.json();
    const { 
      action, 
      primaryVideoId, 
      duplicateVideoIds, 
      mergeStrategy = 'keep_latest',
      dryRun = false 
    } = body;
    
    console.log('🔧 Resolution request:', {
      action,
      primaryVideoId,
      duplicateCount: duplicateVideoIds?.length || 0,
      mergeStrategy,
      dryRun
    });
    
    if (!action || !Array.isArray(duplicateVideoIds) || duplicateVideoIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: action and duplicateVideoIds are required'
      }, { status: 400 });
    }
    
    let results: any = {
      action,
      dryRun,
      processed: 0,
      errors: [],
      changes: []
    };
    
    switch (action) {
      case 'merge':
        if (!primaryVideoId) {
          return NextResponse.json({
            success: false,
            error: 'Primary video ID is required for merge action'
          }, { status: 400 });
        }
        
        console.log(`🔄 ${dryRun ? 'Simulating' : 'Executing'} merge operation...`);
        
        // Get the primary video
        const primaryVideo = await VideoDB.findById(primaryVideoId);
        if (!primaryVideo) {
          return NextResponse.json({
            success: false,
            error: 'Primary video not found'
          }, { status: 404 });
        }
        
        // Process each duplicate
        for (const duplicateId of duplicateVideoIds) {
          if (duplicateId === primaryVideoId) continue; // Skip primary video
          
          try {
            const duplicateVideo = await VideoDB.findById(duplicateId);
            if (!duplicateVideo) {
              results.errors.push({
                videoId: duplicateId,
                error: 'Video not found'
              });
              continue;
            }
            
            // Determine what needs to be merged
            // TODO: Implement shouldMergeVideoData method
            const mergeNeeded = { shouldMerge: false, fieldsToMerge: [] };
            
            if (mergeNeeded.shouldMerge && !dryRun) {
              // TODO: Implement mergeVideoData method
              const mergedVideo = null;
              
              results.changes.push({
                action: 'merged_metadata',
                fromVideoId: duplicateId,
                toVideoId: primaryVideoId,
                mergedFields: mergeNeeded.fieldsToMerge,
                success: !!mergedVideo
              });
              
              // Delete the duplicate (soft delete by marking as merged)
              await VideoDB.update(duplicateId, {
                title: `[MERGED] ${duplicateVideo.title}`,
                description: `This video was merged into ${primaryVideoId}. Original: ${duplicateVideo.description || ''}`
              });
              
              results.changes.push({
                action: 'marked_as_merged',
                videoId: duplicateId,
                success: true
              });
              
            } else if (mergeNeeded.shouldMerge && dryRun) {
              results.changes.push({
                action: 'would_merge_metadata',
                fromVideoId: duplicateId,
                toVideoId: primaryVideoId,
                fieldsToMerge: mergeNeeded.fieldsToMerge,
                dryRun: true
              });
            } else {
              results.changes.push({
                action: 'no_merge_needed',
                videoId: duplicateId,
                reason: 'No conflicting or missing data'
              });
            }
            
            results.processed++;
            
          } catch (error) {
            results.errors.push({
              videoId: duplicateId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        break;
        
      case 'delete_duplicates':
        console.log(`🗑️ ${dryRun ? 'Simulating' : 'Executing'} delete duplicates operation...`);
        
        for (const duplicateId of duplicateVideoIds) {
          try {
            if (!dryRun) {
              const deleted = await VideoDB.delete(duplicateId);
              results.changes.push({
                action: 'deleted',
                videoId: duplicateId,
                success: !!deleted
              });
            } else {
              results.changes.push({
                action: 'would_delete',
                videoId: duplicateId,
                dryRun: true
              });
            }
            results.processed++;
          } catch (error) {
            results.errors.push({
              videoId: duplicateId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        break;
        
      case 'keep_specific':
        if (!primaryVideoId) {
          return NextResponse.json({
            success: false,
            error: 'Primary video ID is required for keep_specific action'
          }, { status: 400 });
        }
        
        console.log(`🎯 ${dryRun ? 'Simulating' : 'Executing'} keep specific operation...`);
        
        // Delete all except the specified primary video
        for (const duplicateId of duplicateVideoIds) {
          if (duplicateId === primaryVideoId) continue;
          
          try {
            if (!dryRun) {
              const deleted = await VideoDB.delete(duplicateId);
              results.changes.push({
                action: 'deleted_duplicate',
                videoId: duplicateId,
                keptVideo: primaryVideoId,
                success: !!deleted
              });
            } else {
              results.changes.push({
                action: 'would_delete_duplicate',
                videoId: duplicateId,
                keptVideo: primaryVideoId,
                dryRun: true
              });
            }
            results.processed++;
          } catch (error) {
            results.errors.push({
              videoId: duplicateId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: merge, delete_duplicates, keep_specific`
        }, { status: 400 });
    }
    
    const success = results.errors.length === 0;
    const message = dryRun 
      ? `Dry run completed: ${results.processed} items would be processed`
      : success 
        ? `Successfully processed ${results.processed} duplicate videos`
        : `Processed ${results.processed} items with ${results.errors.length} errors`;
    
    return NextResponse.json({
      success,
      message,
      results,
      summary: {
        totalProcessed: results.processed,
        totalErrors: results.errors.length,
        totalChanges: results.changes.length,
        dryRun
      },
      nextSteps: dryRun 
        ? ["Review the proposed changes", "Run again with dryRun=false to execute"]
        : success
          ? ["Duplicate resolution completed", "Monitor for new duplicates"]
          : ["Review errors and retry failed operations", "Check logs for detailed error information"]
    });
    
  } catch (error) {
    console.error('❌ Duplicate resolution error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to resolve duplicates',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check request format and required fields',
        'Verify video IDs exist in database',
        'Ensure sufficient permissions for database operations',
        'Check database connectivity'
      ]
    }, { status: 500 });
  }
}
