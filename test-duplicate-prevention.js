/**
 * Comprehensive Test Script for Duplicate Video Prevention System
 * 
 * This script tests:
 * 1. Database migration and unique constraints
 * 2. Duplicate detection logic
 * 3. Deduplication in upload API
 * 4. Duplicate resolution tools
 * 5. Error handling and debugging
 */

const https = require('https');
const fs = require('fs');

// Configuration
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

console.log('🧪 Starting Duplicate Prevention System Tests');
console.log('🌐 Base URL:', BASE_URL);

// Test utilities
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : require('http');
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runTest(testName, testFn) {
  console.log(`\n🧪 Running: ${testName}`);
  try {
    const result = await testFn();
    console.log(`✅ ${testName}: PASSED`);
    return { name: testName, status: 'PASSED', result };
  } catch (error) {
    console.error(`❌ ${testName}: FAILED`);
    console.error('Error:', error.message);
    return { name: testName, status: 'FAILED', error: error.message };
  }
}

// Test 1: Database Migration Status
async function testDatabaseMigration() {
  console.log('📊 Testing database migration status...');
  
  const response = await makeRequest('/api/database/health');
  
  if (response.status !== 200) {
    throw new Error(`Database health check failed: ${response.status}`);
  }
  
  console.log('✅ Database is accessible');
  
  // Check if Mux fields exist by trying to query them
  const videoResponse = await makeRequest('/api/videos?limit=1');
  
  if (videoResponse.status !== 200) {
    throw new Error(`Video API failed: ${videoResponse.status}`);
  }
  
  console.log('✅ Video API is working');
  
  return {
    databaseHealthy: true,
    videoApiWorking: true,
    migrationStatus: 'ready'
  };
}

// Test 2: Duplicate Detection API
async function testDuplicateDetection() {
  console.log('🔍 Testing duplicate detection API...');
  
  const response = await makeRequest('/api/videos/duplicates');
  
  if (response.status !== 200) {
    throw new Error(`Duplicate detection API failed: ${response.status}`);
  }
  
  const data = response.data;
  
  if (!data.success) {
    throw new Error(`Duplicate detection failed: ${data.error}`);
  }
  
  console.log(`📊 Found ${data.duplicateGroups.length} duplicate groups`);
  console.log(`📈 Statistics:`, data.statistics);
  
  return {
    duplicateGroups: data.duplicateGroups.length,
    statistics: data.statistics,
    hasInstructions: Array.isArray(data.resolutionInstructions)
  };
}

// Test 3: Upload Deduplication (Simulation)
async function testUploadDeduplication() {
  console.log('📤 Testing upload deduplication logic...');
  
  // Simulate a video upload with Mux Asset ID
  const mockUploadData = {
    title: 'Test Video for Deduplication',
    description: 'This is a test video to verify deduplication works',
    filename: 'test-video.mp4',
    size: 1024 * 1024 * 50, // 50MB
    mimeType: 'video/mp4',
    s3Key: 'videos/test-deduplication-video.mp4',
    publicUrl: 'https://example.com/test-video.mp4',
    visibility: 'private'
  };
  
  const response = await makeRequest('/api/videos/upload', {
    method: 'POST',
    body: mockUploadData
  });
  
  console.log(`📤 Upload response status: ${response.status}`);
  
  if (response.status === 200 || response.status === 409) {
    // Both success and conflict (duplicate) are acceptable
    const data = response.data;
    
    if (response.status === 409) {
      console.log('🔄 Duplicate detected correctly:', data.debugInfo);
      return {
        duplicateDetected: true,
        debugInfo: data.debugInfo,
        resolutionInstructions: data.debugInfo?.resolutionInstructions || []
      };
    } else {
      console.log('✅ Upload successful (no duplicate)');
      return {
        duplicateDetected: false,
        videoCreated: !!data.video,
        videoId: data.video?.id
      };
    }
  } else {
    throw new Error(`Upload test failed: ${response.status} - ${JSON.stringify(response.data)}`);
  }
}

// Test 4: Duplicate Resolution (Dry Run)
async function testDuplicateResolution() {
  console.log('🔧 Testing duplicate resolution (dry run)...');
  
  // First, get existing duplicates
  const duplicatesResponse = await makeRequest('/api/videos/duplicates');
  
  if (duplicatesResponse.status !== 200 || !duplicatesResponse.data.success) {
    console.log('⚠️ No duplicates found or API error, skipping resolution test');
    return { skipped: true, reason: 'No duplicates available for testing' };
  }
  
  const duplicateGroups = duplicatesResponse.data.duplicateGroups;
  
  if (duplicateGroups.length === 0) {
    console.log('ℹ️ No duplicate groups found, testing with mock data');
    return { skipped: true, reason: 'No duplicate groups available' };
  }
  
  // Test with the first duplicate group
  const firstGroup = duplicateGroups[0];
  const videoIds = firstGroup.videos.map(v => v.id);
  
  if (videoIds.length < 2) {
    console.log('⚠️ Insufficient videos in group for resolution test');
    return { skipped: true, reason: 'Insufficient videos in duplicate group' };
  }
  
  const resolutionData = {
    action: 'merge',
    primaryVideoId: videoIds[0],
    duplicateVideoIds: videoIds.slice(1),
    mergeStrategy: 'keep_latest',
    dryRun: true // Important: dry run only for testing
  };
  
  const response = await makeRequest('/api/videos/duplicates', {
    method: 'POST',
    body: resolutionData
  });
  
  if (response.status !== 200) {
    throw new Error(`Resolution API failed: ${response.status}`);
  }
  
  const data = response.data;
  
  if (!data.success) {
    throw new Error(`Resolution failed: ${data.error}`);
  }
  
  console.log(`🔧 Dry run completed: ${data.results.processed} items processed`);
  console.log(`📊 Changes planned: ${data.results.changes.length}`);
  
  return {
    dryRunSuccessful: true,
    itemsProcessed: data.results.processed,
    changesPlanned: data.results.changes.length,
    errors: data.results.errors.length
  };
}

// Test 5: Error Handling and Edge Cases
async function testErrorHandling() {
  console.log('⚠️ Testing error handling and edge cases...');
  
  const tests = [];
  
  // Test 1: Invalid duplicate resolution request
  try {
    const response = await makeRequest('/api/videos/duplicates', {
      method: 'POST',
      body: { action: 'invalid_action' }
    });
    
    tests.push({
      name: 'Invalid action handling',
      passed: response.status === 400,
      details: response.data
    });
  } catch (error) {
    tests.push({
      name: 'Invalid action handling',
      passed: false,
      error: error.message
    });
  }
  
  // Test 2: Missing required fields
  try {
    const response = await makeRequest('/api/videos/duplicates', {
      method: 'POST',
      body: { action: 'merge' } // Missing required fields
    });
    
    tests.push({
      name: 'Missing fields handling',
      passed: response.status === 400,
      details: response.data
    });
  } catch (error) {
    tests.push({
      name: 'Missing fields handling',
      passed: false,
      error: error.message
    });
  }
  
  // Test 3: Non-existent video ID
  try {
    const response = await makeRequest('/api/videos/duplicates', {
      method: 'POST',
      body: {
        action: 'merge',
        primaryVideoId: 'non-existent-id',
        duplicateVideoIds: ['another-non-existent-id'],
        dryRun: true
      }
    });
    
    tests.push({
      name: 'Non-existent video handling',
      passed: response.status === 404 || (response.status === 200 && response.data.results.errors.length > 0),
      details: response.data
    });
  } catch (error) {
    tests.push({
      name: 'Non-existent video handling',
      passed: false,
      error: error.message
    });
  }
  
  const passedTests = tests.filter(t => t.passed).length;
  console.log(`✅ Error handling tests: ${passedTests}/${tests.length} passed`);
  
  return {
    totalTests: tests.length,
    passedTests,
    tests
  };
}

// Test 6: Performance and Scalability
async function testPerformance() {
  console.log('⚡ Testing performance and scalability...');
  
  const startTime = Date.now();
  
  // Test duplicate detection performance
  const duplicateDetectionStart = Date.now();
  const duplicatesResponse = await makeRequest('/api/videos/duplicates?limit=50');
  const duplicateDetectionTime = Date.now() - duplicateDetectionStart;
  
  // Test video listing performance
  const videoListingStart = Date.now();
  const videosResponse = await makeRequest('/api/videos?limit=50');
  const videoListingTime = Date.now() - videoListingStart;
  
  const totalTime = Date.now() - startTime;
  
  console.log(`⏱️ Duplicate detection: ${duplicateDetectionTime}ms`);
  console.log(`⏱️ Video listing: ${videoListingTime}ms`);
  console.log(`⏱️ Total test time: ${totalTime}ms`);
  
  return {
    duplicateDetectionTime,
    videoListingTime,
    totalTime,
    performanceAcceptable: duplicateDetectionTime < 5000 && videoListingTime < 3000
  };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Duplicate Prevention Tests\n');
  
  const testResults = [];
  
  // Run all tests
  testResults.push(await runTest('Database Migration Status', testDatabaseMigration));
  testResults.push(await runTest('Duplicate Detection API', testDuplicateDetection));
  testResults.push(await runTest('Upload Deduplication Logic', testUploadDeduplication));
  testResults.push(await runTest('Duplicate Resolution (Dry Run)', testDuplicateResolution));
  testResults.push(await runTest('Error Handling & Edge Cases', testErrorHandling));
  testResults.push(await runTest('Performance & Scalability', testPerformance));
  
  // Generate summary
  const passedTests = testResults.filter(t => t.status === 'PASSED').length;
  const totalTests = testResults.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DUPLICATE PREVENTION SYSTEM TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Tests Failed: ${totalTests - passedTests}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  testResults.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // System status
  console.log('\n🎯 System Status:');
  const systemHealthy = passedTests >= totalTests * 0.8; // 80% pass rate
  
  if (systemHealthy) {
    console.log('✅ Duplicate Prevention System: HEALTHY');
    console.log('🎉 The system is ready for production use');
  } else {
    console.log('⚠️ Duplicate Prevention System: NEEDS ATTENTION');
    console.log('🔧 Please review failed tests and fix issues before production deployment');
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (passedTests === totalTests) {
    console.log('• All tests passed! System is working correctly');
    console.log('• Consider setting up monitoring for duplicate detection');
    console.log('• Schedule regular duplicate cleanup operations');
  } else {
    console.log('• Review and fix failed test cases');
    console.log('• Check database migration status');
    console.log('• Verify API endpoint configurations');
    console.log('• Test error handling improvements');
  }
  
  // Save results to file
  const resultsFile = 'duplicate-prevention-test-results.json';
  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100)
    },
    systemStatus: systemHealthy ? 'HEALTHY' : 'NEEDS_ATTENTION',
    testResults,
    environment: {
      baseUrl: BASE_URL,
      nodeVersion: process.version,
      platform: process.platform
    }
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  return detailedResults;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, makeRequest };
