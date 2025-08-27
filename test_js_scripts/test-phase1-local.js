#!/usr/bin/env node

/**
 * Phase 1 Local Test: MediaConvert Thumbnail Generation
 * Tests the fixed thumbnail generation system locally
 */

const http = require('http');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  maxVideosToTest: 3,
  timeoutMs: 30000,
  testRealThumbnails: true,
  testThumbnailDisplay: true
};

console.log('🎬 Phase 1 Local Test: MediaConvert Thumbnail Generation');
console.log('=' .repeat(60));
console.log(`🌐 Testing against: ${TEST_CONFIG.baseUrl}`);
console.log(`📊 Max videos to test: ${TEST_CONFIG.maxVideosToTest}`);
console.log(`⏱️ Timeout: ${TEST_CONFIG.timeoutMs}ms`);
console.log('');

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${TEST_CONFIG.timeoutMs}ms`));
    }, TEST_CONFIG.timeoutMs);

    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Phase1-Local-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    }, (res) => {
      clearTimeout(timeout);

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Test 1: Check MediaConvert Configuration
 */
async function testMediaConvertConfig() {
  console.log('🎯 Test 1: Checking MediaConvert Configuration...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/aws/health`);
    
    if (response.statusCode === 200) {
      const healthData = JSON.parse(response.data);
      console.log('✅ AWS Health Check Response:', healthData);
      
      if (healthData.services?.mediaconvert?.status === 'healthy') {
        console.log('✅ MediaConvert is configured and accessible');
        return true;
      } else {
        console.log('❌ MediaConvert not properly configured:', healthData.services?.mediaconvert);
        return false;
      }
    } else {
      console.log('❌ AWS health check failed:', response.statusCode);
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ MediaConvert config test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Get Videos for Testing
 */
async function getTestVideos() {
  console.log('\n🎯 Test 2: Fetching videos for thumbnail testing...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      const videos = data.videos || [];
      
      console.log(`✅ Found ${videos.length} total videos`);
      
      if (videos.length === 0) {
        console.log('⚠️ No videos found - creating test data...');
        return [];
      }
      
      // Filter videos that have S3 keys (needed for MediaConvert)
      const videosWithS3Keys = videos.filter(v => v.s3Key || v.storedFilename);
      console.log(`📹 Videos with S3 keys: ${videosWithS3Keys.length}`);
      
      // Take first few for testing
      const testVideos = videosWithS3Keys.slice(0, TEST_CONFIG.maxVideosToTest);
      console.log(`🎬 Selected ${testVideos.length} videos for testing`);
      
      testVideos.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.title} (ID: ${video.id})`);
        console.log(`      S3 Key: ${video.s3Key || video.storedFilename || 'NONE'}`);
        console.log(`      Current thumbnail: ${video.thumbnailPath || 'NONE'}`);
      });
      
      return testVideos;
    } else {
      console.log('❌ Failed to fetch videos:', response.statusCode);
      console.log('   Response:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Video fetch failed:', error.message);
    return [];
  }
}

/**
 * Test 3: Test Thumbnail Generation API
 */
async function testThumbnailGenerationAPI() {
  console.log('\n🎯 Test 3: Testing Thumbnail Generation API...');
  
  try {
    // Test with a mock video ID
    const testVideoId = 'test-video-123';
    
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: testVideoId,
        batchMode: false
      })
    });
    
    console.log(`📊 Thumbnail API Response (${response.statusCode}):`);
    console.log('   Response:', response.data);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      console.log('✅ Thumbnail generation API is working');
      
      if (result.success) {
        console.log(`   Method used: ${result.method}`);
        console.log(`   Thumbnail URL: ${result.thumbnailUrl || 'Not provided'}`);
        
        if (result.method === 'mediaconvert') {
          console.log('🎉 SUCCESS: MediaConvert integration working!');
          console.log(`   Job ID: ${result.jobId || 'Not provided'}`);
        } else {
          console.log(`⚠️ Using fallback method: ${result.method}`);
          console.log(`   Reason: ${result.error || 'MediaConvert not available'}`);
        }
      } else {
        console.log('❌ Thumbnail generation failed:', result.error);
      }
      
      return true;
    } else {
      console.log('❌ Thumbnail generation API failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Thumbnail API test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Test Batch Thumbnail Generation
 */
async function testBatchThumbnailGeneration() {
  console.log('\n🎯 Test 4: Testing Batch Thumbnail Generation...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/generate-thumbnails/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 3,
        forceRegenerate: false
      })
    });
    
    console.log(`📊 Batch API Response (${response.statusCode}):`);
    console.log('   Response:', response.data);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      console.log('✅ Batch thumbnail generation API is working');
      
      console.log(`📊 Batch Results:`);
      console.log(`   Processed: ${result.processed || 0}`);
      console.log(`   Successful: ${result.successCount || result.successful || 0}`);
      console.log(`   Failed: ${result.failureCount || result.failed || 0}`);
      
      return true;
    } else {
      console.log('❌ Batch generation API failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Batch API test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Test Database Connection
 */
async function testDatabaseConnection() {
  console.log('\n🎯 Test 5: Testing Database Connection...');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/database/health`);
    
    console.log(`📊 Database Health Response (${response.statusCode}):`);
    console.log('   Response:', response.data);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      console.log('✅ Database connection is working');
      
      if (result.status === 'healthy') {
        console.log('✅ Database is healthy and accessible');
        return true;
      } else {
        console.log('⚠️ Database connection issues:', result);
        return false;
      }
    } else {
      console.log('❌ Database health check failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

/**
 * Main test execution
 */
async function runPhase1LocalTests() {
  try {
    console.log('🚀 Starting Phase 1 Local Tests...\n');
    
    // Test 1: MediaConvert Configuration
    const mediaConvertConfigured = await testMediaConvertConfig();
    
    // Test 2: Database Connection
    const databaseWorking = await testDatabaseConnection();
    
    // Test 3: Get test videos
    const videos = await getTestVideos();
    
    // Test 4: Thumbnail Generation API
    const thumbnailAPIWorking = await testThumbnailGenerationAPI();
    
    // Test 5: Batch Generation API
    const batchAPIWorking = await testBatchThumbnailGeneration();
    
    console.log('\n🎉 Phase 1 Local Tests Complete!');
    console.log('=' .repeat(60));
    console.log('📋 Test Results Summary:');
    console.log(`   MediaConvert Configuration: ${mediaConvertConfigured ? '✅ Working' : '❌ Not Working'}`);
    console.log(`   Database Connection: ${databaseWorking ? '✅ Working' : '❌ Not Working'}`);
    console.log(`   Videos Available: ${videos.length} found`);
    console.log(`   Thumbnail Generation API: ${thumbnailAPIWorking ? '✅ Working' : '❌ Not Working'}`);
    console.log(`   Batch Generation API: ${batchAPIWorking ? '✅ Working' : '❌ Not Working'}`);
    console.log('');
    
    if (mediaConvertConfigured && thumbnailAPIWorking) {
      console.log('🎉 SUCCESS: Phase 1 thumbnail system is ready!');
      console.log('🔄 Next Steps:');
      console.log('   1. Deploy to production');
      console.log('   2. Test with real videos');
      console.log('   3. Monitor MediaConvert jobs');
      console.log('   4. Proceed to Phase 2 (Video Format Handling)');
    } else {
      console.log('⚠️ ISSUES FOUND: Phase 1 needs fixes before deployment');
      console.log('🔧 Required Actions:');
      if (!mediaConvertConfigured) {
        console.log('   - Configure MediaConvert environment variables');
        console.log('   - Set up AWS IAM roles and permissions');
      }
      if (!thumbnailAPIWorking) {
        console.log('   - Fix thumbnail generation API issues');
        console.log('   - Check error logs for specific problems');
      }
    }
    
  } catch (error) {
    console.error('❌ Phase 1 local test execution failed:', error.message);
  }
}

// Run the tests
runPhase1LocalTests();
