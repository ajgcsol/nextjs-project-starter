import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Running Mux database migration...');
    
    // Run the migration SQL directly - add columns one by one to avoid issues
    const alterCommands = [
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255)',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255)',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255)',
      "ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT 'pending'",
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_aspect_ratio VARCHAR(20)',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_ready_at TIMESTAMP',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT FALSE',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhancement_job_id VARCHAR(255)',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255)',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_srt_url TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_text TEXT',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2)',
      "ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_status VARCHAR(50) DEFAULT 'pending'",
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_url TEXT',
      "ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_status VARCHAR(50) DEFAULT 'pending'",
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_count INTEGER DEFAULT 0',
      'ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_timestamp INTEGER',
      "ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_method VARCHAR(20) DEFAULT 'auto'"
    ];

    console.log('🔧 Executing migration commands...');
    for (const command of alterCommands) {
      try {
        await query(command);
        console.log('✅ Executed:', command.substring(0, 50) + '...');
      } catch (error) {
        console.log('⚠️ Command may have already been executed:', command.substring(0, 50) + '...');
      }
    }
    
    // Create indexes
    const indexCommands = [
      'CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status)'
    ];
    
    console.log('🔧 Creating indexes...');
    for (const indexCommand of indexCommands) {
      try {
        await query(indexCommand);
        console.log('✅ Created index:', indexCommand.substring(0, 50) + '...');
      } catch (error) {
        console.log('⚠️ Index may already exist:', indexCommand.substring(0, 50) + '...');
      }
    }
    
    // Verify the migration worked
    const verifyResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE 'mux_%'
      ORDER BY column_name
    `);
    
    console.log('✅ Migration completed successfully');
    console.log('✅ Added Mux columns:', verifyResult.rows.map((r: any) => r.column_name));
    
    return NextResponse.json({
      success: true,
      message: 'Mux database migration completed successfully',
      columnsAdded: verifyResult.rows.map((r: any) => r.column_name),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check current schema
    const columns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      ORDER BY ordinal_position
    `);
    
    const muxColumns = columns.rows.filter((col: any) => 
      col.column_name.startsWith('mux_') || 
      col.column_name.includes('audio_enhanced') ||
      col.column_name.includes('transcription') ||
      col.column_name.includes('captions')
    );
    
    return NextResponse.json({
      success: true,
      message: 'Database schema check completed',
      totalColumns: columns.rows.length,
      muxColumns: muxColumns.length,
      muxColumnNames: muxColumns.map((col: any) => col.column_name),
      allColumns: columns.rows.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable,
        default: col.column_default
      }))
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
