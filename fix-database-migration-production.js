#!/usr/bin/env node

/**
 * Fix Database Migration for Production
 * This script applies the Mux integration fields to the production database
 * and fixes the duration field type issue
 */

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-3w058uf8w-andrew-j-gregwares-projects.vercel.app';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Database-Migration-Script/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runDatabaseMigration() {
  console.log('🔧 Starting Production Database Migration...');
  console.log('🌐 Production URL:', PRODUCTION_URL);
  
  try {
    // Step 1: Check database health
    console.log('\n📊 Step 1: Checking database health...');
    const healthCheck = await makeRequest('/api/database/health');
    console.log('Health Status:', healthCheck.status);
    console.log('Health Data:', JSON.stringify(healthCheck.data, null, 2));
    
    // Step 2: Run the Mux migration
    console.log('\n🎬 Step 2: Running Mux database migration...');
    const migrationResult = await makeRequest('/api/database/migrate-mux-fixed', 'POST');
    console.log('Migration Status:', migrationResult.status);
    console.log('Migration Result:', JSON.stringify(migrationResult.data, null, 2));
    
    // Step 3: Test video upload to verify fix
    console.log('\n🧪 Step 3: Testing video upload functionality...');
    
    // Create a test video upload payload
    const testVideoData = {
      title: 'Database Migration Test',
      description: 'Testing database after migration',
      category: 'Test',
      tags: 'test,migration',
      visibility: 'private',
      s3Key: 'test/migration-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/migration-test.mp4',
      filename: 'migration-test.mp4',
      size: 1000000, // 1MB
      mimeType: 'video/mp4',
      autoThumbnail: null
    };
    
    const uploadTest = await makeRequest('/api/videos/upload', 'POST', testVideoData);
    console.log('Upload Test Status:', uploadTest.status);
    console.log('Upload Test Result:', JSON.stringify(uploadTest.data, null, 2));
    
    // Step 4: Summary
    console.log('\n📋 Migration Summary:');
    console.log('='.repeat(50));
    
    if (healthCheck.status === 200) {
      console.log('✅ Database connection: WORKING');
    } else {
      console.log('❌ Database connection: FAILED');
    }
    
    if (migrationResult.status === 200 && migrationResult.data.success) {
      console.log('✅ Mux migration: COMPLETED');
    } else {
      console.log('❌ Mux migration: FAILED');
    }
    
    if (uploadTest.status === 200 && uploadTest.data.success) {
      console.log('✅ Video upload: WORKING');
      console.log('🎉 DATABASE MIGRATION SUCCESSFUL!');
    } else {
      console.log('❌ Video upload: STILL FAILING');
      console.log('🔧 Additional fixes needed');
      
      // Show specific error details
      if (uploadTest.data && uploadTest.data.error) {
        console.log('\n🚨 Upload Error Details:');
        console.log(uploadTest.data.error);
        if (uploadTest.data.details) {
          console.log('Details:', uploadTest.data.details);
        }
      }
    }
    
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the migration
runDatabaseMigration().then(() => {
  console.log('\n✅ Migration script completed');
}).catch((error) => {
  console.error('❌ Migration script error:', error);
  process.exit(1);
});
