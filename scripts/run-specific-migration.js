#!/usr/bin/env node

/**
 * Run specific migration script
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runSpecificMigration(migrationFile) {
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable not found', 'red');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    log(`🔄 Running migration: ${migrationFile}`, 'cyan');
    
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      log(`❌ Migration file not found: ${migrationPath}`, 'red');
      process.exit(1);
    }
    
    const content = fs.readFileSync(migrationPath, 'utf8');
    
    // Split content into individual statements
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    log(`📋 Found ${statements.length} SQL statements to execute`, 'blue');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        log(`🔄 Executing statement ${i + 1}/${statements.length}...`, 'blue');
        await pool.query(statement + ';');
        successCount++;
        log(`✅ Statement ${i + 1} executed successfully`, 'green');
        
      } catch (error) {
        errorCount++;
        log(`❌ Statement ${i + 1} failed: ${error.message}`, 'red');
        log(`   Statement: ${statement.substring(0, 100)}...`, 'yellow');
        
        // Continue with other statements
      }
    }
    
    log(`\n🎯 Migration completed: ${successCount} successful, ${errorCount} failed`, 
        successCount > errorCount ? 'green' : 'yellow');
    
    // Verify some key columns were added
    try {
      const verifyResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND column_name IN ('thumbnail_timestamp', 'streaming_url', 'mux_asset_id', 's3_key')
        ORDER BY column_name
      `);
      
      const addedColumns = verifyResult.rows.map(row => row.column_name);
      log(`✅ Verified columns added: ${addedColumns.join(', ')}`, 'green');
      
    } catch (verifyError) {
      log(`⚠️  Verification failed: ${verifyError.message}`, 'yellow');
    }
    
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  log('❌ Please provide migration file name', 'red');
  log('Usage: node scripts/run-specific-migration.js <migration-file.sql>', 'yellow');
  process.exit(1);
}

runSpecificMigration(migrationFile);