#!/usr/bin/env node

// Standalone database migration script for Mux integration
// This script runs the Mux database migration without Next.js dependencies

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('🔧 Starting Mux Database Migration...');
console.log('=====================================');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Checking database connection...');
    
    // Test connection
    const { rows: testRows } = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', testRows[0].current_time);
    
    console.log('📋 Checking current database schema...');
    
    // Check if Mux columns already exist
    const { rows: columnCheck } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE 'mux_%'
      ORDER BY column_name
    `);
    
    if (columnCheck.length > 0) {
      console.log('✅ Mux columns already exist:', columnCheck.map(r => r.column_name).join(', '));
      console.log('⚠️ Migration may have already been run');
    } else {
      console.log('📝 No Mux columns found, proceeding with migration...');
    }
    
    console.log('🔧 Running Mux integration migration...');
    
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, 'database', 'migrations', '002_add_mux_integration_fields.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration SQL loaded, executing...');
    
    // Execute migration in a transaction
    await client.query('BEGIN');
    
    try {
      // Split SQL by semicolons and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Migration completed successfully!');
      
    } catch (migrationError) {
      await client.query('ROLLBACK');
      throw migrationError;
    }
    
    console.log('🔍 Verifying migration results...');
    
    // Verify the migration worked
    const { rows: newColumnCheck } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE 'mux_%'
      ORDER BY column_name
    `);
    
    console.log('📊 Mux columns now in database:');
    newColumnCheck.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Check for new tables
    const { rows: tableCheck } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('mux_webhook_events', 'audio_enhancement_jobs', 'transcription_jobs')
      ORDER BY table_name
    `);
    
    console.log('📊 New tables created:');
    tableCheck.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Check indexes
    const { rows: indexCheck } = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'videos' 
      AND indexname LIKE '%mux%'
      ORDER BY indexname
    `);
    
    console.log('📊 Mux indexes created:');
    indexCheck.forEach(index => {
      console.log(`   - ${index.indexname}`);
    });
    
    console.log('');
    console.log('🎉 Mux Database Migration Complete!');
    console.log('=====================================');
    console.log('✅ All Mux integration fields have been added to the database');
    console.log('✅ Webhook processing should now work correctly');
    console.log('✅ Video uploads can now store Mux asset information');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test video upload with Mux integration');
    console.log('2. Verify webhook delivery from Mux dashboard');
    console.log('3. Check that thumbnails are generated automatically');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Check DATABASE_URL environment variable');
    console.error('2. Ensure database server is accessible');
    console.error('3. Verify database user has CREATE/ALTER permissions');
    console.error('4. Check migration SQL file exists and is valid');
    
    process.exit(1);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runMigration();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
main();
