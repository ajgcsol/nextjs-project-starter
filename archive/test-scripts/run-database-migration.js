#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs the Mux integration database migration directly
 */

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app';

console.log('🔧 Starting Mux Database Migration...');
console.log('🌐 Target URL:', PRODUCTION_URL);

// Check migration status first
async function checkMigrationStatus() {
  console.log('🔍 Checking current migration status...');
  
  const options = {
    hostname: 'law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app',
    port: 443,
    path: '/api/database/execute-migration',
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Try to run migration with simple auth
async function runMigrationWithAuth() {
  const data = JSON.stringify({
    migrationName: '002_add_mux_integration_fields',
    dryRun: false
  });

  const options = {
    hostname: 'law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app',
    port: 443,
    path: '/api/database/execute-migration',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer migration-token',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: result });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    // Step 1: Check current status
    console.log('\n📊 Step 1: Checking migration status...');
    const statusResult = await checkMigrationStatus();
    
    if (statusResult.status === 200 && statusResult.data.hasMuxIntegration) {
      console.log('✅ Mux integration already exists!');
      console.log('📋 Existing Mux columns:', statusResult.data.muxColumnsCount);
      console.log('🎯 Migration may not be needed, but continuing to ensure completeness...');
    } else {
      console.log('📝 Mux integration not detected, migration needed');
    }

    // Step 2: Try authenticated migration
    console.log('\n🔧 Step 2: Attempting migration...');
    try {
      const migrationResult = await runMigrationWithAuth();
      
      if (migrationResult.status === 200 && migrationResult.data.success) {
        console.log('🎉 Migration completed successfully!');
        console.log('📊 Results:', {
          tablesCreated: migrationResult.data.tablesCreated?.length || 0,
          columnsAdded: migrationResult.data.columnsAdded?.length || 0,
          indexesCreated: migrationResult.data.indexesCreated?.length || 0,
          executionTime: migrationResult.data.executionTime + 'ms'
        });
        return true;
      } else if (migrationResult.status === 401) {
        console.log('⚠️ Authentication required');
        console.log('📋 Manual Migration Instructions:');
        console.log('The migration endpoint requires authentication.');
        console.log('You can either:');
        console.log('1. Remove the auth check from the migration endpoint temporarily');
        console.log('2. Or run the SQL migration directly in your database');
        console.log('3. The migration file is at: database/migrations/002_add_mux_integration_fields.sql');
        return false;
      } else {
        console.log('❌ Migration failed:', migrationResult.data);
        return false;
      }
    } catch (error) {
      console.log('⚠️ Migration failed:', error.message);
      return false;
    }

  } catch (error) {
    console.error('❌ Migration script failed:', error);
    return false;
  }
}

// Run the migration
main().then(success => {
  if (success) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ Your database now has Mux integration fields');
    console.log('🚀 You can now upload videos and they will have thumbnails!');
  } else {
    console.log('\n⚠️ Migration needs manual intervention');
    console.log('📖 Check the deployment guide for manual steps');
  }
  process.exit(success ? 0 : 1);
});
