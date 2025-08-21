#!/usr/bin/env node

/**
 * Test CORS Fix for Video Playback
 * Verifies that the video streaming endpoint now has correct CORS headers
 */

const https = require('https');

const NEW_PRODUCTION_URL = 'https://law-school-repository-dxdaqiyaa-andrew-j-gregwares-projects.vercel.app';
const TEST_VIDEO_ID = 'bd8369d3-b0ca-48af-9454-ae4ff91e466a';

console.log('🔧 Testing CORS Fix for Video Playback');
console.log('=' .repeat(50));
console.log(`🌐 Production URL: ${NEW_PRODUCTION_URL}`);
console.log(`🎬 Test Video ID: ${TEST_VIDEO_ID}`);
console.log('');

/**
 * Make HTTPS request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout after 30s'));
    }, 30000);

    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'CORS-Fix-Test/1.0',
        'Origin': NEW_PRODUCTION_URL,
        'Referer': `${NEW_PRODUCTION_URL}/dashboard/videos/${TEST_VIDEO_ID}`,
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
 * Test 1: Check if deployment is ready
 */
async function testDeploymentReady() {
  console.log('🎯 Test 1: Checking if new deployment is ready...');
  
  try {
    const response = await makeRequest(`${NEW_PRODUCTION_URL}/api/videos`);
    
    if (response.statusCode === 200) {
      console.log('✅ New deployment is ready and responding');
      return true;
    } else {
      console.log(`❌ Deployment not ready: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Deployment check failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Test video streaming endpoint CORS headers
 */
async function testStreamingCORS() {
  console.log('\n🎯 Test 2: Testing Video Streaming CORS Headers...');
  
  try {
    const streamUrl = `${NEW_PRODUCTION_URL}/api/videos/stream/${TEST_VIDEO_ID}`;
    console.log(`📹 Testing: ${streamUrl}`);
    
    const response = await makeRequest(streamUrl, {
      method: 'HEAD',
      headers: {
        'Origin': NEW_PRODUCTION_URL,
        'Referer': `${NEW_PRODUCTION_URL}/dashboard/videos/${TEST_VIDEO_ID}`
      }
    });
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log(`📊 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers['access-control-allow-methods']}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers['access-control-allow-headers']}`);
    console.log(`   Access-Control-Expose-Headers: ${response.headers['access-control-expose-headers']}`);
    
    if (response.statusCode === 302) {
      const location = response.headers.location;
      console.log(`📍 Redirects to: ${location}`);
      
      // Check if CORS headers are set correctly
      const corsOrigin = response.headers['access-control-allow-origin'];
      
      if (corsOrigin === NEW_PRODUCTION_URL || corsOrigin === '*') {
        console.log('✅ CORS headers are correctly configured!');
        return { success: true, redirectUrl: location };
      } else {
        console.log(`❌ CORS origin mismatch. Expected: ${NEW_PRODUCTION_URL}, Got: ${corsOrigin}`);
        return { success: false, redirectUrl: location };
      }
    } else {
      console.log(`⚠️ Unexpected response status: ${response.statusCode}`);
      return { success: false };
    }
    
  } catch (error) {
    console.log('❌ Streaming CORS test failed:', error.message);
    return { success: false };
  }
}

/**
 * Test 3: Test direct CloudFront URL (if available)
 */
async function testCloudFrontAccess(redirectUrl) {
  if (!redirectUrl) {
    console.log('\n⚠️ Test 3: Skipped - No redirect URL available');
    return false;
  }
  
  console.log('\n🎯 Test 3: Testing Direct CloudFront Access...');
  console.log(`🌐 CloudFront URL: ${redirectUrl}`);
  
  try {
    const response = await makeRequest(redirectUrl, {
      method: 'HEAD',
      headers: {
        'Origin': NEW_PRODUCTION_URL,
        'Referer': `${NEW_PRODUCTION_URL}/dashboard/videos/${TEST_VIDEO_ID}`
      }
    });
    
    console.log(`📊 CloudFront Response: ${response.statusCode}`);
    console.log(`📊 CloudFront CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin']}`);
    console.log(`   Content-Length: ${response.headers['content-length']}`);
    console.log(`   Accept-Ranges: ${response.headers['accept-ranges']}`);
    
    if (response.statusCode === 200) {
      const corsOrigin = response.headers['access-control-allow-origin'];
      
      if (corsOrigin === NEW_PRODUCTION_URL || corsOrigin === '*') {
        console.log('✅ CloudFront CORS is working correctly!');
        return true;
      } else {
        console.log(`❌ CloudFront CORS issue. Expected: ${NEW_PRODUCTION_URL}, Got: ${corsOrigin}`);
        return false;
      }
    } else {
      console.log(`❌ CloudFront access failed: ${response.statusCode}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ CloudFront test failed:', error.message);
    return false;
  }
}

/**
 * Main test execution
 */
async function testCORSFix() {
  try {
    console.log('🚀 Starting CORS Fix Tests...\n');
    
    // Test 1: Check deployment
    const deploymentReady = await testDeploymentReady();
    
    if (!deploymentReady) {
      console.log('\n❌ CRITICAL: New deployment is not ready yet');
      console.log('🔄 Please wait for deployment to complete and try again');
      return;
    }
    
    // Test 2: Test streaming CORS
    const streamingResult = await testStreamingCORS();
    
    // Test 3: Test CloudFront access
    const cloudFrontWorking = await testCloudFrontAccess(streamingResult.redirectUrl);
    
    // Final Results
    console.log('\n🎉 CORS Fix Test Results');
    console.log('=' .repeat(50));
    console.log(`✅ Deployment Ready: ${deploymentReady ? 'Yes' : 'No'}`);
    console.log(`✅ Streaming CORS Fixed: ${streamingResult.success ? 'Yes' : 'No'}`);
    console.log(`✅ CloudFront Access: ${cloudFrontWorking ? 'Yes' : 'No'}`);
    console.log('');
    
    if (deploymentReady && streamingResult.success) {
      console.log('🎊 SUCCESS: CORS fix is working!');
      console.log('🎬 Video playback should now work correctly');
      console.log(`🔗 Test URL: ${NEW_PRODUCTION_URL}/dashboard/videos/${TEST_VIDEO_ID}`);
      console.log('');
      console.log('🔄 Next Steps:');
      console.log('   1. Open the test URL in your browser');
      console.log('   2. Try playing the video');
      console.log('   3. Check browser console for any remaining errors');
    } else {
      console.log('⚠️ Some issues remain:');
      if (!deploymentReady) {
        console.log('   - Deployment not ready yet');
      }
      if (!streamingResult.success) {
        console.log('   - CORS headers still not correct');
      }
      if (!cloudFrontWorking) {
        console.log('   - CloudFront CORS configuration may need manual update');
      }
    }
    
  } catch (error) {
    console.error('❌ CORS fix test failed:', error);
  }
}

// Run the test
testCORSFix();
