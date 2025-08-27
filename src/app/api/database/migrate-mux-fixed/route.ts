import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

// Direct SQL migration - no external files needed
const MUX_MIGRATION_SQL = `
-- Migration: Add Mux integration fields to videos table
-- This migration adds fields to store Mux asset information for video processing

-- Add Mux-related columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT,
ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT,
ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS mux_aspect_ratio VARCHAR(20),
ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS mux_ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS audio_enhancement_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT,
ADD COLUMN IF NOT EXISTS captions_srt_url TEXT,
ADD COLUMN IF NOT EXISTS transcript_text TEXT,
ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2);

-- Create index on mux_asset_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status);

-- Create table for tracking Mux webhook events
CREATE TABLE IF NOT EXISTS mux_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    mux_asset_id VARCHAR(255),
    mux_upload_id VARCHAR(255),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    event_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Create index on webhook events for processing
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_processed ON mux_webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_asset_id ON mux_webhook_events(mux_asset_id);

-- Create table for audio enhancement jobs
CREATE TABLE IF NOT EXISTS audio_enhancement_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    input_audio_url TEXT,
    output_audio_url TEXT,
    enhancement_options JSONB,
    processing_method VARCHAR(50),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create table for transcription jobs
CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    language VARCHAR(10) DEFAULT 'en-US',
    transcript_text TEXT,
    confidence DECIMAL(3,2),
    word_count INTEGER,
    webvtt_url TEXT,
    srt_url TEXT,
    transcription_options JSONB,
    processing_method VARCHAR(50),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for job tracking
CREATE INDEX IF NOT EXISTS idx_audio_jobs_video_id ON audio_enhancement_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_enhancement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_video_id ON transcription_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
`;

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Mux database migration (fixed version)...');
    
    // Split the migration into individual statements
    const statements = MUX_MIGRATION_SQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} migration statements to execute`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        const result = await query(statement);
        
        results.push({
          statement: i + 1,
          success: true,
          rowsAffected: result.rowCount,
          preview: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
        });
        
        successCount++;
        console.log(`✅ Statement ${i + 1} executed successfully`);
        
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error);
        
        results.push({
          statement: i + 1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          preview: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
        });
        
        errorCount++;
        
        // Continue with other statements even if one fails
      }
    }
    
    console.log(`🎯 Migration completed: ${successCount} successful, ${errorCount} failed`);
    
    // Verify the migration by checking if new columns exist
    try {
      const verificationResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND column_name IN ('mux_asset_id', 'mux_playback_id', 'mux_status', 'audio_enhanced', 'transcript_text')
        ORDER BY column_name
      `);
      
      const addedColumns = verificationResult.rows.map(row => row.column_name);
      console.log('✅ Verified new columns:', addedColumns);
      
      return NextResponse.json({
        success: successCount > 0,
        message: `Migration completed: ${successCount} successful, ${errorCount} failed`,
        results,
        verification: {
          newColumnsAdded: addedColumns,
          expectedColumns: ['audio_enhanced', 'mux_asset_id', 'mux_playback_id', 'mux_status', 'transcript_text'],
          migrationComplete: addedColumns.length >= 5
        },
        summary: {
          totalStatements: statements.length,
          successful: successCount,
          failed: errorCount,
          successRate: `${Math.round((successCount / statements.length) * 100)}%`
        }
      });
      
    } catch (verificationError) {
      console.error('❌ Migration verification failed:', verificationError);
      
      return NextResponse.json({
        success: successCount > 0,
        message: `Migration completed but verification failed: ${successCount} successful, ${errorCount} failed`,
        results,
        verification: {
          error: verificationError instanceof Error ? verificationError.message : 'Unknown verification error'
        },
        summary: {
          totalStatements: statements.length,
          successful: successCount,
          failed: errorCount,
          successRate: `${Math.round((successCount / statements.length) * 100)}%`
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking Mux migration status...');
    
    // Check if Mux columns exist
    const columnCheck = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND (column_name LIKE 'mux_%' OR column_name IN ('audio_enhanced', 'transcript_text', 'captions_webvtt_url'))
      ORDER BY column_name
    `);
    
    const existingColumns = columnCheck.rows;
    
    // Check if new tables exist
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('mux_webhook_events', 'audio_enhancement_jobs', 'transcription_jobs')
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    
    const expectedColumns = [
      'mux_asset_id', 'mux_playback_id', 'mux_upload_id', 'mux_status', 
      'mux_thumbnail_url', 'mux_streaming_url', 'audio_enhanced', 'transcript_text'
    ];
    
    const expectedTables = ['mux_webhook_events', 'audio_enhancement_jobs', 'transcription_jobs'];
    
    const migrationComplete = 
      existingColumns.length >= expectedColumns.length * 0.8 && // At least 80% of columns
      existingTables.length >= expectedTables.length * 0.8;     // At least 80% of tables
    
    return NextResponse.json({
      migrationStatus: migrationComplete ? 'complete' : 'pending',
      existingColumns: existingColumns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      })),
      existingTables,
      expectedColumns,
      expectedTables,
      summary: {
        columnsFound: existingColumns.length,
        columnsExpected: expectedColumns.length,
        tablesFound: existingTables.length,
        tablesExpected: expectedTables.length,
        migrationComplete
      },
      nextSteps: migrationComplete ? [
        'Migration appears complete',
        'Ready to integrate Mux into upload process',
        'Can start using Mux asset creation'
      ] : [
        'Run POST /api/database/migrate-mux-fixed to execute migration',
        'Verify database permissions',
        'Check database connectivity'
      ]
    });
    
  } catch (error) {
    console.error('❌ Migration status check failed:', error);
    
    return NextResponse.json({
      migrationStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check database connectivity and permissions'
    }, { status: 500 });
  }
}
