#!/usr/bin/env node

/**
 * Fix Synchronous Processing Integration
 * Addresses the disconnect between video upload and Mux processing
 */

const https = require('https');

console.log('🔧 Fixing Synchronous Processing Integration');
console.log('===========================================');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SyncProcessingFix/1.0',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testDatabaseMigration() {
  console.log('\n🗄️  Running Database Migration');
  console.log('=============================');
  
  const url = 'https://law-school-repository.vercel.app/api/database/migrate-mux';
  
  try {
    console.log('📤 Triggering Mux database migration...');
    const response = await makeRequest(url, { method: 'POST' });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        if (result.success) {
          console.log('✅ Database migration successful');
          console.log(`   Fields Added: ${result.fieldsAdded || 'Already exist'}`);
          console.log(`   Tables Created: ${result.tablesCreated || 'Already exist'}`);
          return true;
        } else {
          console.log(`❌ Migration failed: ${result.error}`);
          return false;
        }
      } catch (e) {
        console.log('⚠️  Migration response received (may be successful)');
        return response.status === 200;
      }
    }
    
    return response.status === 200;
  } catch (error) {
    console.log(`❌ Migration request failed: ${error.message}`);
    return false;
  }
}

async function testSyncProcessingEndpoint() {
  console.log('\n🎬 Testing Sync Processing Endpoint');
  console.log('==================================');
  
  const url = 'https://law-school-repository.vercel.app/api/videos/upload-with-sync-processing';
  
  const testData = {
    title: 'Sync Processing Test',
    filename: 'test-sync.mp4',
    size: 15000000, // 15MB - should trigger sync processing
    s3Key: 'test-videos/sync-test-' + Date.now() + '.mp4',
    publicUrl: 'https://example.com/test-video.mp4',
    mimeType: 'video/mp4',
    syncProcessing: true
  };
  
  try {
    console.log('📤 Testing sync processing endpoint...');
    const response = await makeRequest(url, {
      method: 'POST',
      body: testData
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        
        if (result.success) {
          console.log('✅ Sync processing endpoint working');
          
          if (result.processing) {
            console.log(`   Synchronous: ${result.processing.synchronous ? '✅' : '❌'}`);
            console.log(`   Processing Time: ${result.processing.processingTime || 'N/A'}ms`);
            console.log(`   Status: ${result.processing.status}`);
          }
          
          return true;
        } else {
          console.log(`❌ Sync processing failed: ${result.error}`);
          if (result.details) {
            console.log(`   Details: ${result.details}`);
          }
          return false;
        }
      } catch (e) {
        console.log('❌ Failed to parse sync processing response');
        console.log('Raw response:', response.data.substring(0, 500));
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Sync processing test failed: ${error.message}`);
    return false;
  }
}

async function diagnoseCurrentIssue() {
  console.log('\n🔍 Diagnosing Current Issue');
  console.log('===========================');
  
  console.log('Based on the logs and screenshot, the issues are:');
  console.log('1. ✅ Thumbnail IS being generated (visible in screenshot)');
  console.log('2. ❌ Thumbnail not stored in database (video record missing)');
  console.log('3. ❌ Mux webhook fails: "Video not found in database"');
  console.log('4. ❌ Synchronous processing not being used');
  
  console.log('\n🎯 Root Cause Analysis:');
  console.log('- Video upload creates Mux asset BEFORE saving video to database');
  console.log('- Mux webhook fires immediately but video record doesn\'t exist yet');
  console.log('- Thumbnail gets generated but can\'t be associated with video');
  console.log('- Upload flow is still using old async process instead of new sync process');
  
  console.log('\n🔧 Required Fixes:');
  console.log('1. Ensure database migration is complete');
  console.log('2. Fix video upload order: save to DB BEFORE creating Mux asset');
  console.log('3. Use synchronous processing for small/medium files');
  console.log('4. Ensure proper video ID passing to Mux');
}

async function runDiagnosticFix() {
  console.log('🚀 Running Diagnostic Fix');
  console.log('=========================');
  
  // Step 1: Run database migration
  const migrationSuccess = await testDatabaseMigration();
  
  if (!migrationSuccess) {
    console.log('\n❌ Database migration failed - this must be fixed first');
    return false;
  }
  
  // Step 2: Test sync processing endpoint
  const syncSuccess = await testSyncProcessingEndpoint();
  
  if (!syncSuccess) {
    console.log('\n❌ Sync processing endpoint not working properly');
  }
  
  // Step 3: Diagnose the issue
  await diagnoseCurrentIssue();
  
  console.log('\n📋 Next Steps:');
  console.log('1. ✅ Database migration completed');
  console.log('2. 🔧 Fix upload route to use synchronous processing');
  console.log('3. 🔧 Fix video record creation order');
  console.log('4. 🔧 Ensure proper Mux asset to video ID mapping');
  
  return true;
}

// Run the diagnostic fix
runDiagnosticFix().catch(console.error);
