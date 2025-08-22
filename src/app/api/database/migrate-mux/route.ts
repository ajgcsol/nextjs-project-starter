import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Mux integration database migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', '002_add_mux_integration_fields.sql');
    
    let migrationSQL: string;
    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log('✅ Migration file loaded successfully');
    } catch (fileError) {
      console.error('❌ Failed to read migration file:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Migration file not found',
        details: 'Could not read 002_add_mux_integration_fields.sql'
      }, { status: 500 });
    }
    
    // Split the migration into individual statements
    const statements = migrationSQL
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
      AND column_name LIKE 'mux_%' OR column_name IN ('audio_enhanced', 'transcript_text', 'captions_webvtt_url')
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
        'Run POST /api/database/migrate-mux to execute migration',
        'Verify database permissions',
        'Check migration file exists'
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
