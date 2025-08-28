#!/usr/bin/env node

/**
 * Test Synchronous Mux Processing Deployment
 * Tests the newly deployed synchronous thumbnail and transcript generation
 */

const https = require('https');
const http = require('http');

// Test configuration
const PRODUCTION_DOMAIN = 'law-school-repository.vercel.app';
const TEST_ENDPOINTS = [
  '/api/videos/upload',
  '/api/videos/upload-with-sync-processing',
  '/api/database/health',
  '/api/mux/webhook'
];

console.log('🚀 Testing Synchronous Mux Processing Deployment');
console.log('================================================');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SynchronousMuxTest/1.0',
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

async function testEndpoint(endpoint) {
  const url = `https://${PRODUCTION_DOMAIN}${endpoint}`;
  console.log(`\n🔍 Testing: ${endpoint}`);
  
  try {
    const response = await makeRequest(url);
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ Endpoint accessible');
      
      // Try to parse JSON response
      try {
        const jsonData = JSON.parse(response.data);
        if (jsonData.error) {
          console.log(`   ⚠️  API Error: ${jsonData.error}`);
        } else {
          console.log('   ✅ Valid JSON response');
        }
      } catch (e) {
        console.log('   ℹ️  Non-JSON response (may be normal for some endpoints)');
      }
    } else if (response.status === 405) {
      console.log('   ✅ Method not allowed (endpoint exists)');
    } else if (response.status === 404) {
      console.log('   ❌ Endpoint not found');
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }
    
    return response.status;
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return null;
  }
}

async function testSynchronousProcessing() {
  console.log('\n🎬 Testing Synchronous Processing Logic');
  console.log('=====================================');
  
  const testData = {
    title: 'Test Video - Sync Processing',
    filename: 'test-small-video.mp4',
    size: 15000000, // 15MB - should trigger sync processing
    s3Key: 'test-videos/sync-test.mp4',
    publicUrl: 'https://example.com/test-video.mp4',
    syncProcessing: true
  };
  
  const url = `https://${PRODUCTION_DOMAIN}/api/videos/upload-with-sync-processing`;
  
  try {
    console.log('📤 Sending test upload request...');
    const response = await makeRequest(url, {
      method: 'POST',
      body: testData
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        console.log('\n📋 Response Analysis:');
        
        if (result.success) {
          console.log('✅ Upload request successful');
          
          if (result.processing) {
            console.log(`   Sync Processing: ${result.processing.synchronous ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`   Processing Time: ${result.processing.processingTime || 'N/A'}ms`);
            console.log(`   Thumbnail Ready: ${result.processing.thumbnailReady ? '✅ Yes' : '❌ No'}`);
            console.log(`   Transcript Ready: ${result.processing.transcriptReady ? '✅ Yes' : '❌ No'}`);
            console.log(`   Status: ${result.processing.status}`);
          }
          
          if (result.video) {
            console.log(`   Video ID: ${result.video.id}`);
            console.log(`   Title: ${result.video.title}`);
            console.log(`   Status: ${result.video.status}`);
            console.log(`   Thumbnail: ${result.video.thumbnailPath}`);
          }
        } else {
          console.log(`❌ Upload failed: ${result.error}`);
          if (result.details) {
            console.log(`   Details: ${result.details}`);
          }
        }
      } catch (e) {
        console.log('❌ Failed to parse response JSON');
        console.log('Raw response:', response.data.substring(0, 500));
      }
    }
    
  } catch (error) {
    console.log(`❌ Test request failed: ${error.message}`);
  }
}

async function testDatabaseMigration() {
  console.log('\n🗄️  Testing Database Migration Status');
  console.log('===================================');
  
  const url = `https://${PRODUCTION_DOMAIN}/api/database/migrate-mux`;
  
  try {
    const response = await makeRequest(url, { method: 'POST' });
    console.log(`Migration Status: ${response.status}`);
    
    if (response.data) {
      try {
        const result = JSON.parse(response.data);
        if (result.success) {
          console.log('✅ Database migration successful');
          console.log(`   Fields Added: ${result.fieldsAdded || 'N/A'}`);
        } else {
          console.log(`⚠️  Migration issue: ${result.error}`);
        }
      } catch (e) {
        console.log('ℹ️  Migration response received');
      }
    }
  } catch (error) {
    console.log(`⚠️  Migration test failed: ${error.message}`);
  }
}

async function runTests() {
  console.log(`🌐 Testing deployment on: ${PRODUCTION_DOMAIN}`);
  console.log(`📅 Test time: ${new Date().toISOString()}\n`);
  
  // Test basic endpoints
  console.log('📡 Testing API Endpoints');
  console.log('========================');
  
  const results = [];
  for (const endpoint of TEST_ENDPOINTS) {
    const status = await testEndpoint(endpoint);
    results.push({ endpoint, status });
  }
  
  // Test database migration
  await testDatabaseMigration();
  
  // Test synchronous processing (this will likely fail without proper Mux credentials, but we can see the logic)
  await testSynchronousProcessing();
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const accessible = results.filter(r => r.status === 200 || r.status === 405).length;
  const total = results.length;
  
  console.log(`Endpoints accessible: ${accessible}/${total}`);
  
  if (accessible === total) {
    console.log('✅ All endpoints are accessible - deployment successful!');
  } else {
    console.log('⚠️  Some endpoints may need attention');
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('- Verify Mux credentials are configured in Vercel');
  console.log('- Run database migration if needed');
  console.log('- Test with actual video uploads');
  console.log('- Monitor synchronous processing performance');
  
  console.log('\n🔗 Production URL: https://' + PRODUCTION_DOMAIN);
}

// Run the tests
runTests().catch(console.error);
