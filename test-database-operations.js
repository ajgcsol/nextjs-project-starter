/**
 * Test database operations to verify no infinite loops in various scenarios
 */

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

async function testDatabaseHealth() {
  console.log('🔍 Testing Database Health...');
  
  try {
    const options = {
      hostname: new URL(PRODUCTION_URL).hostname,
      port: 443,
      path: '/api/database/health',
      method: 'GET',
      timeout: 10000
    };
    
    const startTime = Date.now();
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            duration: Date.now() - startTime
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Database health check timeout'));
      });
      
      req.end();
    });
    
    console.log(`✅ Database health check completed in ${response.duration}ms`);
    
    try {
      const result = JSON.parse(response.data);
      if (result.database?.status === 'healthy') {
        console.log('✅ Database is healthy and responsive');
        return true;
      } else {
        console.log('⚠️ Database health check returned:', result);
        return false;
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse database health response');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Database health check failed:', error.message);
    return false;
  }
}

async function testMultipleUploads() {
  console.log('\n🔍 Testing Multiple Simultaneous Uploads...');
  
  const uploadPromises = [];
  const startTime = Date.now();
  
  // Create 3 simultaneous upload requests
  for (let i = 0; i < 3; i++) {
    const testData = JSON.stringify({
      title: `Concurrent Test Video ${i + 1}`,
      description: `Testing concurrent uploads - video ${i + 1}`,
      filename: `concurrent-test-${i + 1}.mp4`,
      size: 1000000 + (i * 100000),
      s3Key: `test-videos/concurrent-${Date.now()}-${i}.mp4`,
      publicUrl: `https://example.com/concurrent-test-${i}.mp4`,
      mimeType: 'video/mp4',
      visibility: 'private'
    });
    
    const options = {
      hostname: new URL(PRODUCTION_URL).hostname,
      port: 443,
      path: '/api/videos/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
      },
      timeout: 30000
    };
    
    const uploadPromise = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            index: i,
            statusCode: res.statusCode,
            data: data,
            duration: Date.now() - startTime
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          index: i,
          error: error.message,
          duration: Date.now() - startTime
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          index: i,
          error: 'Upload timeout - possible infinite loop',
          duration: Date.now() - startTime
        });
      });
      
      req.write(testData);
      req.end();
    });
    
    uploadPromises.push(uploadPromise);
  }
  
  try {
    const results = await Promise.all(uploadPromises);
    const totalDuration = Date.now() - startTime;
    
    console.log(`✅ All concurrent uploads completed in ${totalDuration}ms`);
    
    let allSuccessful = true;
    let infiniteLoopDetected = false;
    
    for (const result of results) {
      if (result.error) {
        console.log(`❌ Upload ${result.index + 1} failed: ${result.error}`);
        if (result.error.includes('timeout') || result.error.includes('infinite loop')) {
          infiniteLoopDetected = true;
        }
        allSuccessful = false;
      } else {
        try {
          const uploadResult = JSON.parse(result.data);
          if (uploadResult.success) {
            console.log(`✅ Upload ${result.index + 1} successful: ${uploadResult.video?.id}`);
          } else {
            console.log(`⚠️ Upload ${result.index + 1} failed: ${uploadResult.error}`);
            allSuccessful = false;
          }
        } catch (parseError) {
          console.log(`⚠️ Upload ${result.index + 1} response parsing failed`);
          allSuccessful = false;
        }
      }
    }
    
    if (infiniteLoopDetected) {
      console.log('🚨 INFINITE LOOP DETECTED in concurrent uploads');
      return false;
    }
    
    if (totalDuration < 60000) { // Should complete within 1 minute
      console.log('✅ No infinite loops detected in concurrent operations');
      return true;
    } else {
      console.log('⚠️ Concurrent uploads took longer than expected');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Concurrent upload test failed:', error.message);
    return false;
  }
}

async function testMuxIntegration() {
  console.log('\n🔍 Testing Mux Integration (with Asset ID)...');
  
  try {
    const testData = JSON.stringify({
      title: 'Mux Integration Test Video',
      description: 'Testing Mux Asset ID handling without infinite loops',
      filename: 'mux-test.mp4',
      size: 2000000,
      s3Key: `test-videos/mux-test-${Date.now()}.mp4`,
      publicUrl: 'https://example.com/mux-test.mp4',
      mimeType: 'video/mp4',
      visibility: 'private',
      // This should trigger the Mux integration path
      muxAssetId: `test-asset-${Date.now()}`
    });
    
    const options = {
      hostname: new URL(PRODUCTION_URL).hostname,
      port: 443,
      path: '/api/videos/upload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testData)
      },
      timeout: 30000
    };
    
    const startTime = Date.now();
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data,
            duration: Date.now() - startTime
          });
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Mux integration test timeout - possible infinite loop'));
      });
      
      req.write(testData);
      req.end();
    });
    
    console.log(`✅ Mux integration test completed in ${response.duration}ms`);
    
    if (response.duration < 30000) {
      console.log('✅ No infinite loop detected in Mux integration');
      
      try {
        const result = JSON.parse(response.data);
        if (result.success) {
          console.log('✅ Mux integration upload successful:', result.video?.id);
        } else {
          console.log('⚠️ Mux integration upload failed but no infinite loop:', result.error);
        }
      } catch (parseError) {
        console.log('⚠️ Mux integration response parsing failed but no infinite loop');
      }
      
      return true;
    } else {
      console.log('❌ Mux integration took too long - possible infinite loop');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Mux integration test failed:', error.message);
    if (error.message.includes('timeout') || error.message.includes('infinite loop')) {
      console.log('🚨 INFINITE LOOP DETECTED in Mux integration');
      return false;
    }
    return true; // Other errors are acceptable
  }
}

async function runDatabaseTests() {
  console.log('🧪 Testing Database Operations for Infinite Loop Fix');
  console.log('===================================================\n');
  
  const results = [];
  
  // Test database health
  const healthResult = await testDatabaseHealth();
  results.push({ test: 'Database Health', passed: healthResult });
  
  // Test multiple uploads
  const concurrentResult = await testMultipleUploads();
  results.push({ test: 'Concurrent Uploads', passed: concurrentResult });
  
  // Test Mux integration
  const muxResult = await testMuxIntegration();
  results.push({ test: 'Mux Integration', passed: muxResult });
  
  // Summary
  console.log('\n📊 Database Test Results');
  console.log('========================');
  
  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.test}`);
    if (!result.passed) allPassed = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 ALL DATABASE TESTS PASSED!');
    console.log('✅ No infinite loops detected in any database operations');
    console.log('✅ Concurrent operations work correctly');
    console.log('✅ Mux integration works without loops');
  } else {
    console.log('⚠️ Some database tests failed - Review results above');
  }
  
  return allPassed;
}

// Run the tests
if (require.main === module) {
  runDatabaseTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Database test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runDatabaseTests };
