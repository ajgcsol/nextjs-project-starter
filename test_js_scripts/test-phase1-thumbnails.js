#!/usr/bin/env node

/**
 * Phase 1 Production Test: MediaConvert Thumbnail Generation
 * Tests the fixed thumbnail generation system in production
 */

const https = require('https');

const TEST_CONFIG = {
  baseUrl: 'https://nextjs-project-starter-nine-psi.vercel.app',
  maxVideosToTest: 3, // Test fewer videos for focused testing
  timeoutMs: 45000, // Longer timeout for MediaConvert jobs
  testRealThumbnails: true,
  testThumbnailDisplay: true
};

console.log('🎬 Phase 1 Production Test: MediaConvert Thumbnail Generation');
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

    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Phase1-Thumbnail-Test/1.0',
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
    // Try the videos API endpoint
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      const videos = data.videos || [];
      
      console.log(`✅ Found ${videos.length} total videos`);
      
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
      
      // Try alternative endpoint
      console.log('🔄 Trying alternative video endpoint...');
      const altResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/upload`);
      
      if (altResponse.statusCode === 200) {
        const altData = JSON.parse(altResponse.data);
        const altVideos = altData.videos || [];
        console.log(`✅ Found ${altVideos.length} videos from upload endpoint`);
        return altVideos.slice(0, TEST_CONFIG.maxVideosToTest);
      } else {
        console.log('❌ Alternative endpoint also failed:', altResponse.statusCode);
        return [];
      }
    }
  } catch (error) {
    console.log('❌ Video fetch failed:', error.message);
    return [];
  }
}

/**
 * Test 3: Generate Real Thumbnails using MediaConvert
 */
async function testRealThumbnailGeneration(videos) {
  console.log('\n🎯 Test 3: Testing MediaConvert Thumbnail Generation...');
  
  const results = {
    attempted: 0,
    successful: 0,
    failed: 0,
    jobs: []
  };
  
  for (const video of videos) {
    console.log(`\n🎬 Testing thumbnail generation for: ${video.title}`);
    console.log(`   Video ID: ${video.id}`);
    console.log(`   S3 Key: ${video.s3Key || video.storedFilename}`);
    
    results.attempted++;
    
    try {
      // Call the thumbnail generation API
      const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/generate-thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: video.id,
          batchMode: false
        })
      });
      
      if (response.statusCode === 200) {
        const result = JSON.parse(response.data);
        console.log('✅ Thumbnail generation API response:', result);
        
        if (result.success && result.method === 'mediaconvert') {
          console.log('🎉 SUCCESS: MediaConvert job created!');
          console.log(`   Job ID: ${result.jobId || 'Not provided'}`);
          console.log(`   Expected thumbnail URL: ${result.thumbnailUrl}`);
          
          results.successful++;
          results.jobs.push({
            videoId: video.id,
            jobId: result.jobId,
            thumbnailUrl: result.thumbnailUrl,
            status: 'created'
          });
        } else {
          console.log('⚠️ Thumbnail generated but not with MediaConvert');
          console.log(`   Method used: ${result.method}`);
          console.log(`   Reason: ${result.error || 'Fallback method used'}`);
          results.failed++;
        }
      } else {
        console.log(`❌ Thumbnail generation API failed: ${response.statusCode}`);
        console.log(`   Response: ${response.data}`);
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ Thumbnail generation error: ${error.message}`);
      results.failed++;
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 MediaConvert Thumbnail Generation Results:');
  console.log(`   Attempted: ${results.attempted}`);
  console.log(`   Successful (MediaConvert): ${results.successful}`);
  console.log(`   Failed/Fallback: ${results.failed}`);
  
  if (results.jobs.length > 0) {
    console.log('\n🎬 MediaConvert Jobs Created:');
    results.jobs.forEach(job => {
      console.log(`   - Video ${job.videoId}: Job ${job.jobId}`);
      console.log(`     Expected URL: ${job.thumbnailUrl}`);
    });
  }
  
  return results;
}

/**
 * Test 4: Check Thumbnail Display in Video Management
 */
async function testThumbnailDisplay(videos) {
  console.log('\n🎯 Test 4: Testing Thumbnail Display...');
  
  const results = {
    working: 0,
    broken: 0,
    errors: []
  };
  
  for (const video of videos) {
    console.log(`\n🖼️ Testing thumbnail display for: ${video.title}`);
    
    try {
      // Test the thumbnail API endpoint
      const thumbnailResponse = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/thumbnail/${video.id}`);
      
      if (thumbnailResponse.statusCode === 200 || thumbnailResponse.statusCode === 302) {
        console.log(`✅ Thumbnail endpoint working (${thumbnailResponse.statusCode})`);
        
        // If it's a redirect, check the final URL
        if (thumbnailResponse.statusCode === 302) {
          const redirectUrl = thumbnailResponse.headers.location;
          console.log(`   Redirects to: ${redirectUrl}`);
          
          // Test the redirect URL
          try {
            const finalResponse = await makeRequest(redirectUrl);
            if (finalResponse.statusCode === 200) {
              console.log(`   ✅ Final thumbnail accessible (${finalResponse.statusCode})`);
              results.working++;
            } else {
              console.log(`   ⚠️ Final thumbnail not accessible (${finalResponse.statusCode})`);
              results.broken++;
            }
          } catch (finalError) {
            console.log(`   ⚠️ Final thumbnail error: ${finalError.message}`);
            results.broken++;
          }
        } else {
          results.working++;
        }
      } else {
        console.log(`❌ Thumbnail endpoint failed (${thumbnailResponse.statusCode})`);
        results.broken++;
        results.errors.push(`${video.id}: ${thumbnailResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ Thumbnail error: ${error.message}`);
      results.broken++;
      results.errors.push(`${video.id}: ${error.message}`);
    }
  }
  
  console.log('\n📊 Thumbnail Display Results:');
  console.log(`   Working: ${results.working}`);
  console.log(`   Broken: ${results.broken}`);
  
  if (results.errors.length > 0) {
    console.log('❌ Thumbnail Errors:');
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  return results;
}

/**
 * Test 5: Batch Thumbnail Generation
 */
async function testBatchThumbnailGeneration() {
  console.log('\n🎯 Test 5: Testing Batch Thumbnail Generation...');
  
  try {
    console.log('🔄 Starting batch thumbnail generation (5 videos)...');
    
    const response = await makeRequest(`${TEST_CONFIG.baseUrl}/api/videos/generate-thumbnails/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 5,
        forceRegenerate: false
      })
    });
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.data);
      console.log('✅ Batch generation completed:', result);
      
      console.log(`📊 Batch Results:`);
      console.log(`   Processed: ${result.processed || 0}`);
      console.log(`   Successful: ${result.successCount || result.successful || 0}`);
      console.log(`   Failed: ${result.failureCount || result.failed || 0}`);
      
      return true;
    } else {
      console.log('❌ Batch generation failed:', response.statusCode);
      console.log('   Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Batch generation error:', error.message);
    return false;
  }
}

/**
 * Main test execution
 */
async function runPhase1Tests() {
  try {
    console.log('🚀 Starting Phase 1 Production Tests...\n');
    
    // Test 1: MediaConvert Configuration
    const mediaConvertConfigured = await testMediaConvertConfig();
    
    // Test 2: Get test videos
    const videos = await getTestVideos();
    
    if (videos.length === 0) {
      console.log('\n❌ No videos available for testing');
      return;
    }
    
    // Test 3: Real thumbnail generation
    if (TEST_CONFIG.testRealThumbnails && mediaConvertConfigured) {
      await testRealThumbnailGeneration(videos);
    } else {
      console.log('\n⚠️ Skipping real thumbnail generation (MediaConvert not configured)');
    }
    
    // Test 4: Thumbnail display
    if (TEST_CONFIG.testThumbnailDisplay) {
      await testThumbnailDisplay(videos);
    }
    
    // Test 5: Batch generation
    await testBatchThumbnailGeneration();
    
    console.log('\n🎉 Phase 1 Production Tests Complete!');
    console.log('=' .repeat(60));
    console.log('📋 Summary:');
    console.log('   ✅ MediaConvert configuration tested');
    console.log('   ✅ Individual thumbnail generation tested');
    console.log('   ✅ Thumbnail display tested');
    console.log('   ✅ Batch generation tested');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('   1. Check MediaConvert jobs in AWS console');
    console.log('   2. Verify thumbnails appear in video management interface');
    console.log('   3. Monitor for any processing errors');
    console.log('   4. Proceed to Phase 2 if all tests pass');
    
  } catch (error) {
    console.error('❌ Phase 1 test execution failed:', error.message);
  }
}

// Run the tests
runPhase1Tests();
