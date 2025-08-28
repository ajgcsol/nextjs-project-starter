import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Create debug_logs table if it doesn't exist
async function ensureDebugLogsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS debug_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        level VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        video_id UUID NULL,
        video_title TEXT NULL,
        details JSONB NULL,
        stack_trace TEXT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    
    // Add index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_debug_logs_timestamp ON debug_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON debug_logs(level);
      CREATE INDEX IF NOT EXISTS idx_debug_logs_resolved ON debug_logs(resolved);
    `;
    
    console.log('✅ Debug logs table ensured');
  } catch (error) {
    console.error('❌ Error ensuring debug_logs table:', error);
  }
}

export async function GET() {
  try {
    console.log('📊 Fetching processing debug logs...');
    
    // Ensure table exists
    await ensureDebugLogsTable();

    // Get debug logs from the last 7 days, ordered by most recent first
    const logs = await sql`
      SELECT 
        id,
        timestamp,
        level,
        category,
        message,
        video_id,
        video_title,
        details,
        stack_trace,
        resolved
      FROM debug_logs 
      WHERE timestamp > NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 500
    `;

    // Transform to match frontend interface
    const entries = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      category: log.category,
      message: log.message,
      videoId: log.video_id,
      videoTitle: log.video_title,
      details: log.details,
      stackTrace: log.stack_trace,
      resolved: log.resolved
    }));

    console.log(`📊 Found ${entries.length} debug entries`);

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length,
      summary: {
        errors: entries.filter(e => e.level === 'error').length,
        warnings: entries.filter(e => e.level === 'warning').length,
        unresolved: entries.filter(e => !e.resolved && e.level === 'error').length
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch debug logs:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching debug logs'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { level, category, message, videoId, videoTitle, details, stackTrace } = body;

    console.log(`🐛 Logging debug entry: [${level.toUpperCase()}] ${category} - ${message}`);

    // Ensure table exists
    await ensureDebugLogsTable();

    // Insert debug log entry
    const result = await sql`
      INSERT INTO debug_logs (
        level, category, message, video_id, video_title, details, stack_trace
      ) VALUES (
        ${level}, ${category}, ${message}, ${videoId || null}, 
        ${videoTitle || null}, ${details || null}, ${stackTrace || null}
      )
      RETURNING id, timestamp
    `;

    const logEntry = result[0];

    console.log(`✅ Debug entry logged: ${logEntry.id}`);

    return NextResponse.json({
      success: true,
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      message: 'Debug entry logged successfully'
    });

  } catch (error) {
    console.error('❌ Failed to log debug entry:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error logging debug entry'
    }, { status: 500 });
  }
}