#!/usr/bin/env node

/**
 * Database Migration Script for Law School Repository
 * 
 * This script runs database migrations in order
 * Run with: node scripts/migrate-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL environment variable not found', 'red');
    log('   Please set DATABASE_URL in your .env.local file', 'yellow');
    process.exit(1);
  }

  return {
    connectionString: process.env.DATABASE_URL
  };
}

async function createMigrationsTable(pool) {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS database_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(createTableSQL);
}

async function getAppliedMigrations(pool) {
  try {
    const result = await pool.query('SELECT filename FROM database_migrations ORDER BY id');
    return result.rows.map(row => row.filename);
  } catch (error) {
    return [];
  }
}

async function applyMigration(pool, filename, content) {
  log(`   Applying migration: ${filename}`, 'blue');
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Split content into individual statements
    const statements = content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement + ';');
      }
    }
    
    // Record migration as applied
    await pool.query('INSERT INTO database_migrations (filename) VALUES ($1)', [filename]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    log(`   ✅ Migration ${filename} applied successfully`, 'green');
    
  } catch (error) {
    // Rollback transaction
    await pool.query('ROLLBACK');
    log(`   ❌ Migration ${filename} failed: ${error.message}`, 'red');
    throw error;
  }
}

async function runMigrations() {
  log('\n🔄 Running database migrations...', 'cyan');
  log('====================================\n', 'cyan');
  
  const config = await getDatabaseConfig();
  const pool = new Pool({
    connectionString: config.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Test connection
    await pool.connect();
    log('✅ Database connection established', 'green');
    
    // Create migrations table
    await createMigrationsTable(pool);
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    log(`📋 Found ${appliedMigrations.length} previously applied migrations`, 'blue');
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      log('📁 No migrations directory found, creating it...', 'yellow');
      fs.mkdirSync(migrationsDir, { recursive: true });
      log('✅ No migrations to run', 'green');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    log(`📁 Found ${migrationFiles.length} migration files`, 'blue');
    
    if (migrationFiles.length === 0) {
      log('✅ No migrations to run', 'green');
      return;
    }
    
    // Apply pending migrations
    let appliedCount = 0;
    
    for (const filename of migrationFiles) {
      if (appliedMigrations.includes(filename)) {
        log(`   ⏭️  Skipping ${filename} (already applied)`, 'yellow');
        continue;
      }
      
      const filePath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      
      await applyMigration(pool, filename, content);
      appliedCount++;
    }
    
    log(`\n🎉 Migration complete! Applied ${appliedCount} new migrations`, 'green');
    
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'red');
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    await runMigrations();
  } catch (error) {
    log(`\n💥 Migration process failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' });
  main();
}

module.exports = { runMigrations };