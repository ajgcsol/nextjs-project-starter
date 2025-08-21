import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database schema initialization...');
    
    // Create videos table with S3 support (the main table we need)
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        duration INTEGER,
        thumbnail_path VARCHAR(500),
        video_quality VARCHAR(20) DEFAULT 'HD',
        uploaded_by VARCHAR(255) NOT NULL,
        course_id UUID,
        s3_key VARCHAR(500),
        s3_bucket VARCHAR(100),
        is_processed BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        mediaconvert_job_id VARCHAR(255),
        hls_manifest_path VARCHAR(500),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
      CREATE INDEX IF NOT EXISTS idx_videos_s3_key ON videos(s3_key);
    `);
    
    // Test the table by counting rows
    const result = await query('SELECT COUNT(*) as video_count FROM videos');
    const videoCount = result.rows[0].video_count;
    
    console.log('✅ Database schema initialized successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
      tables_created: ['videos'],
      video_count: parseInt(videoCount),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
