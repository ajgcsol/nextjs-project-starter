import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    console.log('🧹 Cleaning up old debug log entries...');

    // Delete resolved entries older than 30 days
    const resolvedCleanup = await sql`
      DELETE FROM debug_logs 
      WHERE 
        resolved = true 
        AND timestamp < NOW() - INTERVAL '30 days'
    `;

    // Delete debug/info entries older than 7 days
    const debugCleanup = await sql`
      DELETE FROM debug_logs 
      WHERE 
        level IN ('debug', 'info')
        AND timestamp < NOW() - INTERVAL '7 days'
    `;

    // Keep errors and warnings for longer (90 days) but delete very old ones
    const oldErrorCleanup = await sql`
      DELETE FROM debug_logs 
      WHERE 
        level IN ('error', 'warning')
        AND timestamp < NOW() - INTERVAL '90 days'
    `;

    const totalDeleted = (resolvedCleanup.length || 0) + (debugCleanup.length || 0) + (oldErrorCleanup.length || 0);

    console.log(`🧹 Cleaned up ${totalDeleted} debug log entries`);

    // Get current counts for response
    const [currentStats] = await sql`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as errors,
        COUNT(CASE WHEN level = 'warning' THEN 1 END) as warnings,
        COUNT(CASE WHEN resolved = false AND level = 'error' THEN 1 END) as unresolved_errors
      FROM debug_logs
    `;

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${totalDeleted} old debug entries`,
      deletedCounts: {
        resolvedEntries: resolvedCleanup.length || 0,
        debugEntries: debugCleanup.length || 0,
        oldErrors: oldErrorCleanup.length || 0,
        total: totalDeleted
      },
      remaining: {
        totalEntries: parseInt(currentStats.total_entries) || 0,
        errors: parseInt(currentStats.errors) || 0,
        warnings: parseInt(currentStats.warnings) || 0,
        unresolvedErrors: parseInt(currentStats.unresolved_errors) || 0
      }
    });

  } catch (error) {
    console.error('❌ Failed to cleanup debug logs:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error cleaning up debug logs'
    }, { status: 500 });
  }
}