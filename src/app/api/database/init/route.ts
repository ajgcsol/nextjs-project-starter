import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Check if this is authorized (in production, you'd want proper auth)
    const { authorization } = await request.json();
    
    if (authorization !== 'init-database-schema') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Initializing database schema...');

    // Create videos table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        duration INTEGER,
        thumbnail_path TEXT,
        video_quality VARCHAR(20) DEFAULT 'HD',
        is_processed BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        uploaded_by VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE,
        mediaconvert_job_id VARCHAR(255),
        hls_manifest_path TEXT,
        course_id UUID,
        
        -- Additional fields for compatibility
        category VARCHAR(100),
        tags TEXT[],
        visibility VARCHAR(20) DEFAULT 'private',
        status VARCHAR(20) DEFAULT 'draft',
        original_filename VARCHAR(255),
        stored_filename VARCHAR(255),
        width INTEGER,
        height INTEGER,
        bitrate INTEGER,
        created_by VARCHAR(255),
        stream_url TEXT,
        metadata JSONB
      )
    `);

    // Create users table if it doesn't exist (simplified version)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create a default user for video uploads
    await query(`
      INSERT INTO users (id, email, name) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'system@lawschool.edu', 'System User')
      ON CONFLICT (email) DO NOTHING
    `);

    // Insert sample videos
    await query(`
      INSERT INTO videos (
        id, title, description, filename, file_path, file_size, duration,
        video_quality, is_processed, is_public, uploaded_by, category,
        tags, visibility, status, original_filename, stored_filename,
        width, height, bitrate, created_by, stream_url
      ) VALUES 
      (
        '11111111-1111-1111-1111-111111111111',
        'Constitutional Law: Introduction to Civil Rights',
        'Comprehensive overview of civil rights law and constitutional interpretation',
        'civil-rights-intro.mp4',
        '/api/videos/stream/sample-1',
        262144000,
        3600,
        '1080p',
        true,
        true,
        '00000000-0000-0000-0000-000000000001',
        'Constitutional Law',
        ARRAY['civil rights', 'constitution', 'lecture'],
        'public',
        'ready',
        'civil-rights-intro.mp4',
        'sample-1_original.mp4',
        1920,
        1080,
        5000000,
        'Prof. Sarah Johnson',
        '/api/videos/stream/sample-1'
      ),
      (
        '22222222-2222-2222-2222-222222222222',
        'Contract Formation Principles',
        'Essential principles of contract formation including offer, acceptance, and consideration',
        'contract-formation.mp4',
        '/api/videos/stream/sample-2',
        188743680,
        2700,
        '1080p',
        true,
        true,
        '00000000-0000-0000-0000-000000000001',
        'Contract Law',
        ARRAY['contracts', 'formation', 'consideration'],
        'public',
        'ready',
        'contract-formation.mp4',
        'sample-2_original.mp4',
        1920,
        1080,
        4000000,
        'Prof. Michael Chen',
        '/api/videos/stream/sample-2'
      )
      ON CONFLICT (id) DO NOTHING
    `);

    // Create indexes for performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
      CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
      CREATE INDEX IF NOT EXISTS idx_videos_uploaded_at ON videos(uploaded_at);
    `);

    console.log('Database schema initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
      tables: ['videos', 'users'],
      sampleData: 'inserted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'Database initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
