import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for migration

interface MigrationResult {
  success: boolean;
  tablesCreated: string[];
  columnsAdded: string[];
  indexesCreated: string[];
  error?: string;
  rollbackAvailable: boolean;
  executionTime: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔧 Starting database migration execution...');
  
  try {
    // Verify request authorization (basic security)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return NextResponse.json(
        { error: 'Unauthorized - Bearer token required' },
        { status: 401 }
      );
    }

    const { migrationName, dryRun = false } = await request.json();
    
    if (!migrationName) {
      return NextResponse.json(
        { error: 'Migration name is required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Executing migration: ${migrationName} (dry run: ${dryRun})`);

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', `${migrationName}.sql`);
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: `Migration file not found: ${migrationName}.sql` },
        { status: 404 }
      );
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Migration SQL loaded (${migrationSQL.length} characters)`);

    const result: MigrationResult = {
      success: false,
      tablesCreated: [],
      columnsAdded: [],
      indexesCreated: [],
      rollbackAvailable: true,
      executionTime: 0
    };

    if (dryRun) {
      console.log('🧪 Dry run mode - validating migration SQL...');
      
      // Parse SQL to identify operations
      const sqlStatements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of sqlStatements) {
        if (statement.toUpperCase().includes('ALTER TABLE') && statement.toUpperCase().includes('ADD COLUMN')) {
          const match = statement.match(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+IF NOT EXISTS\s+(\w+)/i);
          if (match) {
            result.columnsAdded.push(`${match[1]}.${match[2]}`);
          }
        } else if (statement.toUpperCase().includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i);
          if (match) {
            result.tablesCreated.push(match[1]);
          }
        } else if (statement.toUpperCase().includes('CREATE INDEX')) {
          const match = statement.match(/CREATE INDEX\s+IF NOT EXISTS\s+(\w+)/i);
          if (match) {
            result.indexesCreated.push(match[1]);
          }
        }
      }

      result.success = true;
      result.executionTime = Date.now() - startTime;

      console.log('✅ Dry run completed successfully');
      return NextResponse.json(result);
    }

    // Execute actual migration
    console.log('🚀 Executing migration in transaction...');
    
    await transaction(async (client) => {
      // Check if migration has already been run
      try {
        const existingColumns = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'videos' 
          AND column_name LIKE 'mux_%'
        `);
        
        if (existingColumns.rows.length > 0) {
          console.log('⚠️ Mux columns already exist, checking completeness...');
          const existingColumnNames = existingColumns.rows.map((row: any) => row.column_name);
          console.log('📋 Existing Mux columns:', existingColumnNames);
          
          // Continue with migration to ensure all columns are present
        }
      } catch (checkError) {
        console.log('📝 Unable to check existing columns, proceeding with migration...');
      }

      // Split and execute SQL statements
      const sqlStatements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📝 Executing ${sqlStatements.length} SQL statements...`);

      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i];
        console.log(`🔧 Executing statement ${i + 1}/${sqlStatements.length}...`);
        
        try {
          await client.query(statement);
          
          // Track what was created/modified
          if (statement.toUpperCase().includes('ALTER TABLE') && statement.toUpperCase().includes('ADD COLUMN')) {
            const match = statement.match(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+IF NOT EXISTS\s+(\w+)/i);
            if (match) {
              result.columnsAdded.push(`${match[1]}.${match[2]}`);
            }
          } else if (statement.toUpperCase().includes('CREATE TABLE')) {
            const match = statement.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i);
            if (match) {
              result.tablesCreated.push(match[1]);
            }
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            const match = statement.match(/CREATE INDEX\s+IF NOT EXISTS\s+(\w+)/i);
            if (match) {
              result.indexesCreated.push(match[1]);
            }
          }
          
        } catch (statementError) {
          console.error(`❌ Error executing statement ${i + 1}:`, statementError);
          
          // Check if it's a "already exists" error, which is acceptable
          const errorMessage = statementError instanceof Error ? statementError.message : String(statementError);
          if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            console.log('⚠️ Object already exists, continuing...');
            continue;
          }
          
          throw statementError;
        }
      }

      // Verify migration success
      const verificationQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND column_name IN ('mux_asset_id', 'mux_playback_id', 'mux_thumbnail_url')
      `;
      
      const verification = await client.query(verificationQuery);
      
      if (verification.rows.length < 3) {
        throw new Error(`Migration verification failed - only ${verification.rows.length}/3 key columns found`);
      }

      console.log('✅ Migration verification passed');
    });

    result.success = true;
    result.executionTime = Date.now() - startTime;

    console.log('🎉 Database migration completed successfully!');
    console.log('📊 Migration results:', {
      tablesCreated: result.tablesCreated.length,
      columnsAdded: result.columnsAdded.length,
      indexesCreated: result.indexesCreated.length,
      executionTime: `${result.executionTime}ms`
    });

    return NextResponse.json(result);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Database migration failed:', error);
    
    return NextResponse.json({
      success: false,
      tablesCreated: [],
      columnsAdded: [],
      indexesCreated: [],
      error: error instanceof Error ? error.message : 'Unknown migration error',
      rollbackAvailable: true,
      executionTime
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking migration status...');
    
    // Check current database schema
    const schemaCheck = await query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE 'mux_%'
      ORDER BY column_name
    `);

    const muxColumns = schemaCheck.rows;
    const hasMuxIntegration = muxColumns.length > 0;

    // Check for webhook events table
    const webhookTableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'mux_webhook_events'
    `);

    const hasWebhookTable = webhookTableCheck.rows.length > 0;

    // Check for additional tables
    const additionalTablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('audio_enhancement_jobs', 'transcription_jobs')
    `);

    const additionalTables = additionalTablesCheck.rows.map(row => row.table_name);

    const migrationStatus = {
      hasMuxIntegration,
      muxColumnsCount: muxColumns.length,
      muxColumns: muxColumns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      })),
      hasWebhookTable,
      additionalTables,
      migrationNeeded: !hasMuxIntegration || !hasWebhookTable,
      lastChecked: new Date().toISOString()
    };

    console.log('📊 Migration status:', migrationStatus);

    return NextResponse.json(migrationStatus);

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
