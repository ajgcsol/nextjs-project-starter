import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    console.log('📈 Calculating processing statistics...');

    // Get current processing counts
    const [processingStats] = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as total_processing,
        COUNT(CASE WHEN processing_status = 'failed' OR transcript_status = 'failed' OR captions_status = 'failed' THEN 1 END) as total_errors,
        COUNT(CASE WHEN processing_status = 'completed' AND transcript_status = 'completed' AND captions_status = 'ready' THEN 1 END) as total_completed,
        COUNT(*) as total_videos
      FROM videos 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;

    // Get debug log statistics
    const [debugStats] = await sql`
      SELECT 
        COUNT(CASE WHEN level = 'error' THEN 1 END) as debug_errors,
        COUNT(CASE WHEN level = 'warning' THEN 1 END) as debug_warnings,
        COUNT(CASE WHEN level = 'error' AND resolved = false THEN 1 END) as unresolved_errors
      FROM debug_logs 
      WHERE timestamp > NOW() - INTERVAL '7 days'
    `;

    // Calculate average processing time for completed videos
    const avgProcessingResult = await sql`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_seconds
      FROM videos 
      WHERE 
        status = 'published' 
        AND processing_status = 'completed'
        AND created_at > NOW() - INTERVAL '7 days'
        AND updated_at > created_at
    `;

    const avgProcessingTime = avgProcessingResult[0]?.avg_processing_seconds 
      ? Math.round(parseFloat(avgProcessingResult[0].avg_processing_seconds))
      : 0;

    // Calculate success rate
    const successRate = processingStats.total_videos > 0 
      ? Math.round((processingStats.total_completed / processingStats.total_videos) * 100)
      : 0;

    // Get recent activity (last 1 hour)
    const [recentActivity] = await sql`
      SELECT COUNT(*) as recent_count
      FROM videos 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `;

    // Get processing pipeline breakdown
    const pipelineStats = await sql`
      SELECT 
        processing_status,
        COUNT(*) as count
      FROM videos 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY processing_status
    `;

    // Get error breakdown by category
    const errorBreakdown = await sql`
      SELECT 
        category,
        level,
        COUNT(*) as count
      FROM debug_logs 
      WHERE 
        timestamp > NOW() - INTERVAL '7 days'
        AND level IN ('error', 'warning')
      GROUP BY category, level
      ORDER BY count DESC
    `;

    // Get hourly activity for the last 24 hours
    const hourlyActivity = await sql`
      SELECT 
        date_trunc('hour', created_at) as hour,
        COUNT(*) as uploads,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as completed,
        COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed
      FROM videos 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour DESC
    `;

    const stats = {
      totalProcessing: parseInt(processingStats.total_processing) || 0,
      totalErrors: parseInt(processingStats.total_errors) + parseInt(debugStats.debug_errors || 0),
      totalWarnings: parseInt(debugStats.debug_warnings || 0),
      avgProcessingTime,
      successRate,
      recentActivity: parseInt(recentActivity.recent_count) || 0,
      totalVideos: parseInt(processingStats.total_videos) || 0,
      totalCompleted: parseInt(processingStats.total_completed) || 0,
      unresolvedErrors: parseInt(debugStats.unresolved_errors || 0)
    };

    console.log('📈 Processing statistics calculated:', stats);

    return NextResponse.json({
      success: true,
      stats,
      breakdown: {
        pipeline: pipelineStats,
        errors: errorBreakdown,
        hourlyActivity
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        timeWindow: '7 days',
        recentActivityWindow: '1 hour'
      }
    });

  } catch (error) {
    console.error('❌ Failed to calculate processing statistics:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error calculating statistics'
    }, { status: 500 });
  }
}