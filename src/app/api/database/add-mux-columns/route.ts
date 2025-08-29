import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding Mux columns to production database...');
    
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      console.log('📝 Adding missing Mux columns...');
      
      // Add all Mux columns that might be missing
      const muxColumns = [
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255);',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255);', 
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255);',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT \'pending\';',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_aspect_ratio VARCHAR(20);',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_ready_at TIMESTAMP;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT FALSE;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhancement_job_id VARCHAR(255);',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255);',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_srt_url TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_text TEXT;',
        'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2);'
      ];
      
      for (const sql of muxColumns) {
        console.log('📝 Executing:', sql);
        await client.query(sql);
      }
      
      // Add indexes
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);',
        'CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status);'
      ];
      
      for (const sql of indexes) {
        console.log('📝 Creating index:', sql);
        await client.query(sql);
      }
      
      // Test that columns exist by checking a sample
      const testResult = await client.query(`
        SELECT mux_asset_id, mux_playback_id, mux_thumbnail_url 
        FROM videos 
        LIMIT 1
      `);
      
      console.log('✅ Mux columns verified - sample result:', testResult.rows[0] || 'No videos in database');
      
      // Commit transaction
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Mux columns added successfully',
        columnsAdded: muxColumns.length,
        indexesAdded: indexes.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Failed to add Mux columns:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to add Mux columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}