import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting enhanced transcription database migration...');

    // Enhanced transcription fields migration
    const migrationSQL = `
      -- Add enhanced transcription fields to videos table
      ALTER TABLE videos 
        ADD COLUMN IF NOT EXISTS speaker_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS transcript_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS captions_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(5,4),
        ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS transcription_method VARCHAR(50) DEFAULT 'enhanced',
        ADD COLUMN IF NOT EXISTS entities_extracted JSONB,
        ADD COLUMN IF NOT EXISTS content_summary TEXT,
        ADD COLUMN IF NOT EXISTS content_sentiment VARCHAR(20),
        ADD COLUMN IF NOT EXISTS captions_srt_url TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_timestamp INTEGER,
        ADD COLUMN IF NOT EXISTS thumbnail_method VARCHAR(50) DEFAULT 'auto';

      -- Create speaker_segments table for detailed speaker information
      CREATE TABLE IF NOT EXISTS speaker_segments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        speaker_label VARCHAR(50) NOT NULL,
        start_time DECIMAL(10,3) NOT NULL,
        end_time DECIMAL(10,3) NOT NULL,
        text TEXT NOT NULL,
        confidence DECIMAL(5,4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_speaker_segments_video_id ON speaker_segments(video_id);
      CREATE INDEX IF NOT EXISTS idx_speaker_segments_time ON speaker_segments(start_time, end_time);
      CREATE INDEX IF NOT EXISTS idx_videos_transcript_status ON videos(transcript_status);
      CREATE INDEX IF NOT EXISTS idx_videos_captions_status ON videos(captions_status);
      CREATE INDEX IF NOT EXISTS idx_videos_speaker_count ON videos(speaker_count);

      -- Create extracted_entities table for AI enhancement results
      CREATE TABLE IF NOT EXISTS extracted_entities (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL, -- PERSON, ORGANIZATION, LOCATION, TOPIC, etc.
        entity_text VARCHAR(255) NOT NULL,
        confidence DECIMAL(5,4),
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_extracted_entities_video_id ON extracted_entities(video_id);
      CREATE INDEX IF NOT EXISTS idx_extracted_entities_type ON extracted_entities(entity_type);
    `;

    console.log('🗃️ Executing enhanced transcription migration SQL...');
    await pool.query(migrationSQL);

    // Check what fields exist now
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE ANY(ARRAY['%speaker%', '%transcript%', '%caption%', '%transcription%'])
      ORDER BY column_name;
    `);

    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('speaker_segments', 'extracted_entities') 
      AND table_schema = 'public';
    `);

    console.log('✅ Enhanced transcription migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Enhanced transcription database migration completed',
      addedColumns: columnsResult.rows,
      addedTables: tablesResult.rows,
      features: {
        speakerDetection: 'Enhanced with speaker_count and speaker_segments table',
        transcriptionTracking: 'Status tracking with transcript_status and captions_status',
        aiEnhancement: 'Entity extraction with extracted_entities table',
        confidenceScoring: 'Transcript confidence and speaker confidence tracking',
        detailedSegments: 'Granular speaker segment storage with timing'
      },
      speakerLimits: {
        maxSpeakers: 4,
        minSpeechDuration: 'AWS handles automatically (~2-3 seconds)',
        confidenceThreshold: 'Configurable per transcription service'
      }
    });

  } catch (error) {
    console.error('❌ Enhanced transcription migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Enhanced transcription migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check DATABASE_URL environment variable',
        'Verify database permissions for ALTER TABLE and CREATE TABLE',
        'Ensure PostgreSQL version supports JSONB and gen_random_uuid()',
        'Check database connectivity'
      ]
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current enhanced transcription schema status
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE ANY(ARRAY['%speaker%', '%transcript%', '%caption%', '%transcription%'])
      ORDER BY column_name;
    `);

    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('speaker_segments', 'extracted_entities') 
      AND table_schema = 'public';
    `);

    const expectedColumns = [
      'speaker_count', 'transcript_status', 'captions_status', 
      'transcript_confidence', 'transcription_job_id', 'transcription_method',
      'entities_extracted', 'content_summary', 'content_sentiment'
    ];

    const existingColumns = columnsResult.rows.map(row => row.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

    return NextResponse.json({
      status: missingColumns.length === 0 ? 'ready' : 'needs_migration',
      existingColumns: columnsResult.rows,
      existingTables: tablesResult.rows.map(row => row.table_name),
      missingColumns,
      speakerConfiguration: {
        maxSpeakers: 4,
        speakerDetectionMethod: 'AWS Transcribe ML + Whisper AI fallback',
        minimumSpeechDuration: 'Automatic (AWS handles ~2-3 second segments)',
        confidenceScoring: 'Per-segment and overall transcript confidence'
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}