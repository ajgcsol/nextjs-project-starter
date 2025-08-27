#!/usr/bin/env node

/**
 * Test Database Migration Fix
 * Tests the new migrate-mux-fixed endpoint to resolve thumbnail/transcript storage issues
 */

const https = require('https');

console.log('🔧 Testing Database Migration Fix');
console.log('=================================');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : require('http');
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DatabaseMigrationTest/1.0',
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

async function testMigrationEndpoint() {
  console.log('\n🗄️  Testing Fixed Migration Endpoint');
  console.log('===================================');
  
  const url = 'https://law-school-repository.vercel.app/api/database/migrate-mux-fixed';
  
  try {
    console.log('📤 Running database migration...');
    const response = await makeRequest(url, { method: 'POST' });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        
        if (result.success) {
          console.log('✅ Migration successful!');
          console.log(`   Statements executed: ${result.summary?.totalStatements || 'N/A'}`);
          console.log(`   Successful: ${result.summary?.successful || 'N/A'}`);
          console.log(`   Failed: ${result.summary?.failed || 'N/A'}`);
          console.log(`   Success rate: ${result.summary?.successRate || 'N/A'}`);
          
          if (result.verification) {
            console.log('\n📊 Verification Results:');
            console.log(`   Columns added: ${result.verification.newColumnsAdded?.length || 0}`);
            console.log(`   Migration complete: ${result.verification.migrationComplete ? '✅' : '❌'}`);
            
            if (result.verification.newColumnsAdded) {
              console.log(`   New columns: ${result.verification.newColumnsAdded.join(', ')}`);
            }
          }
          
          return true;
        } else {
          console.log(`❌ Migration failed: ${result.error}`);
          if (result.details) {
            console.log(`   Details: ${result.details}`);
          }
          return false;
        }
      } catch (e) {
        console.log('❌ Failed to parse migration response');
        console.log('Raw response:', response.data.substring(0, 500));
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Migration request failed: ${error.message}`);
    return false;
  }
}

async function testMigrationStatus() {
  console.log('\n🔍 Testing Migration Status Check');
  console.log('=================================');
  
  const url = 'https://law-school-repository.vercel.app/api/database/migrate-mux-fixed';
  
  try {
    console.log('📤 Checking migration status...');
    const response = await makeRequest(url, { method: 'GET' });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        
        console.log(`Migration Status: ${result.migrationStatus}`);
        
        if (result.summary) {
          console.log('\n📊 Database Summary:');
          console.log(`   Columns found: ${result.summary.columnsFound}/${result.summary.columnsExpected}`);
          console.log(`   Tables found: ${result.summary.tablesFound}/${result.summary.tablesExpected}`);
          console.log(`   Migration complete: ${result.summary.migrationComplete ? '✅' : '❌'}`);
        }
        
        if (result.existingColumns && result.existingColumns.length > 0) {
          console.log('\n📋 Existing Mux Columns:');
          result.existingColumns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
          });
        }
        
        if (result.existingTables && result.existingTables.length > 0) {
          console.log('\n📋 Existing Mux Tables:');
          result.existingTables.forEach(table => {
            console.log(`   - ${table}`);
          });
        }
        
        return result.migrationStatus === 'complete';
      } catch (e) {
        console.log('❌ Failed to parse status response');
        console.log('Raw response:', response.data.substring(0, 500));
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Status check failed: ${error.message}`);
    return false;
  }
}

async function testSyncProcessingAfterMigration() {
  console.log('\n🎬 Testing Sync Processing After Migration');
  console.log('=========================================');
  
  const url = 'https://law-school-repository.vercel.app/api/videos/upload-with-sync-processing';
  
  const testData = {
    title: 'Post-Migration Test Video',
    filename: 'test-post-migration.mp4',
    size: 20000000, // 20MB - should trigger sync processing
    s3Key: 'test-videos/post-migration-' + Date.now() + '.mp4',
    publicUrl: 'https://example.com/test-video.mp4',
    mimeType: 'video/mp4',
    syncProcessing: true
  };
  
  try {
    console.log('📤 Testing sync processing with migrated database...');
    const response = await makeRequest(url, {
      method: 'POST',
      body: testData
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        
        if (result.success) {
          console.log('✅ Sync processing working after migration!');
          
          if (result.processing) {
            console.log(`   Synchronous: ${result.processing.synchronous ? '✅' : '❌'}`);
            console.log(`   Thumbnail Ready: ${result.processing.thumbnailReady ? '✅' : '❌'}`);
            console.log(`   Transcript Ready: ${result.processing.transcriptReady ? '✅' : '❌'}`);
            console.log(`   Status: ${result.processing.status}`);
          }
          
          if (result.video) {
            console.log(`   Video ID: ${result.video.id}`);
            console.log(`   Thumbnail: ${result.video.thumbnailPath}`);
          }
          
          return true;
        } else {
          console.log(`❌ Sync processing failed: ${result.error}`);
          return false;
        }
      } catch (e) {
        console.log('❌ Failed to parse sync processing response');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Sync processing test failed: ${error.message}`);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Running Comprehensive Database Migration Test');
  console.log('================================================');
  console.log(`🌐 Testing on: law-school-repository.vercel.app`);
  console.log(`📅 Test time: ${new Date().toISOString()}\n`);
  
  let allTestsPassed = true;
  
  // Step 1: Run the migration
  console.log('Step 1: Execute Database Migration');
  const migrationSuccess = await testMigrationEndpoint();
  if (!migrationSuccess) {
    console.log('⚠️  Migration failed, but continuing with tests...');
  }
  allTestsPassed = allTestsPassed && migrationSuccess;
  
  // Step 2: Check migration status
  console.log('\nStep 2: Verify Migration Status');
  const statusSuccess = await testMigrationStatus();
  allTestsPassed = allTestsPassed && statusSuccess;
  
  // Step 3: Test sync processing with migrated database
  console.log('\nStep 3: Test Sync Processing Integration');
  const syncSuccess = await testSyncProcessingAfterMigration();
  allTestsPassed = allTestsPassed && syncSuccess;
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Migration executed: ${migrationSuccess ? '✅' : '❌'}`);
  console.log(`Database schema ready: ${statusSuccess ? '✅' : '❌'}`);
  console.log(`Sync processing working: ${syncSuccess ? '✅' : '❌'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All tests passed! Database migration fix is working correctly.');
    console.log('\n✅ The thumbnail and transcript storage issues should now be resolved:');
    console.log('   - Database has all required Mux fields');
    console.log('   - Webhook processing can now store thumbnail URLs');
    console.log('   - Synchronous processing is functional');
    console.log('   - Video records will be created before Mux asset creation');
  } else {
    console.log('\n⚠️  Some tests failed. Issues may still exist:');
    console.log('   - Check database connectivity');
    console.log('   - Verify Mux credentials');
    console.log('   - Review error logs in Vercel');
  }
  
  console.log('\n🔗 Production URL: https://law-school-repository.vercel.app');
  console.log('🔧 Migration endpoint: /api/database/migrate-mux-fixed');
  console.log('🎬 Sync processing endpoint: /api/videos/upload-with-sync-processing');
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);
