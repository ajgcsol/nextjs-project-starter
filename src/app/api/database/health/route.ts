import { NextRequest, NextResponse } from 'next/server';
import { query, healthCheck } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Check basic database connection
    const health = await healthCheck();
    
    // Check if video tables exist
    let videoTableExists = false;
    let videoCount = 0;
    
    try {
      const result = await query('SELECT COUNT(*) as count FROM videos');
      videoTableExists = true;
      videoCount = parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Video table check failed:', error);
    }
    
    // Check if users table exists (for foreign key relationships)
    let usersTableExists = false;
    let userCount = 0;
    
    try {
      const result = await query('SELECT COUNT(*) as count FROM users');
      usersTableExists = true;
      userCount = parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Users table check failed:', error);
    }
    
    return NextResponse.json({
      database: health,
      tables: {
        videos: {
          exists: videoTableExists,
          count: videoCount
        },
        users: {
          exists: usersTableExists,
          count: userCount
        }
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      { 
        error: 'Database health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        environment: process.env.NODE_ENV
      },
      { status: 500 }
    );
  }
}
