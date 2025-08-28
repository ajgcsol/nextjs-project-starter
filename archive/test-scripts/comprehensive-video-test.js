#!/usr/bin/env node

/**
 * Comprehensive Video System Test
 * Tests both thumbnail generation and video playback functionality
 */

const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://law-school-repository-aumvefigg-andrew-j-gregwares-projects.vercel.app';

// Test configuration
const TEST_CONFIG = {
  maxVideosToTest: 5,
  timeoutMs: 30000,
  testThumbnails: true,
  testVideoStreaming: true,
  testVideoPlayback: true
};

console.log('🧪 Starting Comprehensive Video System Test...\n');

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
        'User-Agent': 'Video-Test-Script/1.0',
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
          data: data,
          url: url
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
 * Test 1: Get list of videos
 */
async function testVideoList() {
  console.log('📋 Test 1: Fetching video list...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/videos`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      console.log(`✅ Video API working - Found ${data.videos?.length || 0} videos`);
      return data.videos || [];
    } else {
      console.log(`❌ Video API failed - Status: ${response.statusCode}`);
      return [];
    }
  } catch (error) {
    console.log(`❌ Video API error: ${error.message}`);
    return [];
  }
}

/**
 * Test 2: Test thumbnail endpoints
 */
async function testThumbnails(videos) {
  if (!TEST_CONFIG.testThumbnails || videos.length === 0) {
    console.log('⏭️ Skipping thumbnail tests');
    return;
  }

  console.log('\n🖼️ Test 2: Testing thumbnail generation...');
  
  const testVideos = videos.slice(0, TEST_CONFIG.maxVideosToTest);
  let thumbnailResults = {
    working: 0,
    broken: 0,
    errors: []
  };

  for (const video of testVideos) {
    try {
      console.log(`  Testing thumbnail for: ${video.title} (ID: ${video.id})`);
      
      // Test thumbnail endpoint
      const thumbnailResponse = await makeRequest(`${BASE_URL}/api/videos/thumbnail/${video.id}`);
      
      if (thumbnailResponse.statusCode === 200 || thumbnailResponse.statusCode === 302) {
        console.log(`    ✅ Thumbnail endpoint working (${thumbnailResponse.statusCode})`);
        thumbnailResults.working++;
        
        // Check if it's a redirect to actual image
        if (thumbnailResponse.statusCode === 302) {
          const redirectUrl = thumbnailResponse.headers.location;
          console.log(`    🔗 Redirects to: ${redirectUrl}`);
          
          // Test the redirected URL
          try {
            const imageResponse = await makeRequest(redirectUrl);
            if (imageResponse.statusCode === 200) {
              console.log(`    ✅ Thumbnail image accessible`);
            } else {
              console.log(`    ⚠️ Thumbnail image not accessible (${imageResponse.statusCode})`);
            }
          } catch (imgError) {
            console.log(`    ⚠️ Thumbnail image error: ${imgError.message}`);
          }
        }
      } else {
        console.log(`    ❌ Thumbnail endpoint failed (${thumbnailResponse.statusCode})`);
        thumbnailResults.broken++;
        thumbnailResults.errors.push(`${video.id}: ${thumbnailResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`    ❌ Thumbnail error: ${error.message}`);
      thumbnailResults.broken++;
      thumbnailResults.errors.push(`${video.id}: ${error.message}`);
    }
  }

  console.log(`\n📊 Thumbnail Results: ${thumbnailResults.working} working, ${thumbnailResults.broken} broken`);
  if (thumbnailResults.errors.length > 0) {
    console.log('❌ Thumbnail Errors:');
    thumbnailResults.errors.forEach(error => console.log(`  - ${error}`));
  }
}

/**
 * Test 3: Test video streaming endpoints
 */
async function testVideoStreaming(videos) {
  if (!TEST_CONFIG.testVideoStreaming || videos.length === 0) {
    console.log('⏭️ Skipping video streaming tests');
    return;
  }

  console.log('\n🎬 Test 3: Testing video streaming...');
  
  const testVideos = videos.slice(0, TEST_CONFIG.maxVideosToTest);
  let streamResults = {
    working: 0,
    broken: 0,
    errors: []
  };

  for (const video of testVideos) {
    try {
      console.log(`  Testing stream for: ${video.title} (ID: ${video.id})`);
      
      // Test stream endpoint
      const streamResponse = await makeRequest(`${BASE_URL}/api/videos/stream/${video.id}`);
      
      if (streamResponse.statusCode === 302) {
        const redirectUrl = streamResponse.headers.location;
        console.log(`    ✅ Stream endpoint working - Redirects to: ${redirectUrl}`);
        streamResults.working++;
        
        // Test the actual video URL with HEAD request
        try {
          const videoResponse = await makeRequest(redirectUrl, { method: 'HEAD' });
          console.log(`    📊 Video file status: ${videoResponse.statusCode}`);
          
          // Check for range request support (critical for video streaming)
          if (videoResponse.headers['accept-ranges'] === 'bytes') {
            console.log(`    ✅ Range requests supported (good for streaming)`);
          } else {
            console.log(`    ⚠️ Range requests not supported (may affect playback)`);
          }
          
          // Check content type
          const contentType = videoResponse.headers['content-type'];
          if (contentType && contentType.includes('video')) {
            console.log(`    ✅ Correct content type: ${contentType}`);
          } else {
            console.log(`    ⚠️ Unexpected content type: ${contentType}`);
          }
          
        } catch (videoError) {
          console.log(`    ❌ Video file error: ${videoError.message}`);
        }
      } else {
        console.log(`    ❌ Stream endpoint failed (${streamResponse.statusCode})`);
        streamResults.broken++;
        streamResults.errors.push(`${video.id}: ${streamResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`    ❌ Stream error: ${error.message}`);
      streamResults.broken++;
      streamResults.errors.push(`${video.id}: ${error.message}`);
    }
  }

  console.log(`\n📊 Streaming Results: ${streamResults.working} working, ${streamResults.broken} broken`);
  if (streamResults.errors.length > 0) {
    console.log('❌ Streaming Errors:');
    streamResults.errors.forEach(error => console.log(`  - ${error}`));
  }
}

/**
 * Test 4: Test thumbnail generation API
 */
async function testThumbnailGeneration() {
  if (!TEST_CONFIG.testThumbnails) {
    console.log('⏭️ Skipping thumbnail generation tests');
    return;
  }

  console.log('\n🔧 Test 4: Testing thumbnail generation API...');
  
  try {
    // Test batch thumbnail generation endpoint
    const batchResponse = await makeRequest(`${BASE_URL}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchMode: true,
        limit: 2
      })
    });
    
    if (batchResponse.statusCode === 200) {
      const data = JSON.parse(batchResponse.data);
      console.log(`✅ Batch thumbnail generation API working`);
      console.log(`   Processed: ${data.processed || 0}, Successful: ${data.successful || 0}, Failed: ${data.failed || 0}`);
    } else {
      console.log(`❌ Batch thumbnail generation failed (${batchResponse.statusCode})`);
      console.log(`   Response: ${batchResponse.data}`);
    }
  } catch (error) {
    console.log(`❌ Thumbnail generation error: ${error.message}`);
  }
}

/**
 * Test 5: Check for common video playback issues
 */
async function testVideoPlaybackIssues(videos) {
  if (!TEST_CONFIG.testVideoPlayback || videos.length === 0) {
    console.log('⏭️ Skipping video playback issue tests');
    return;
  }

  console.log('\n🎯 Test 5: Checking for video playback issues...');
  
  const largeVideos = videos.filter(v => v.size > 100 * 1024 * 1024); // > 100MB
  const veryLargeVideos = videos.filter(v => v.size > 1024 * 1024 * 1024); // > 1GB
  
  console.log(`📊 Video size analysis:`);
  console.log(`   Total videos: ${videos.length}`);
  console.log(`   Large videos (>100MB): ${largeVideos.length}`);
  console.log(`   Very large videos (>1GB): ${veryLargeVideos.length}`);
  
  if (veryLargeVideos.length > 0) {
    console.log(`⚠️ Very large videos detected - these may have playback issues:`);
    veryLargeVideos.slice(0, 3).forEach(video => {
      const sizeMB = Math.round(video.size / (1024 * 1024));
      console.log(`   - ${video.title}: ${sizeMB}MB`);
    });
    
    console.log(`💡 Recommendations for large video playback:`);
    console.log(`   - Ensure CloudFront is properly configured`);
    console.log(`   - Check browser network throttling`);
    console.log(`   - Consider video compression/optimization`);
    console.log(`   - Test with different browsers`);
  }
  
  // Check for problematic video formats
  const problematicFormats = videos.filter(v => 
    v.filename && (
      v.filename.toLowerCase().includes('.wmv') ||
      v.filename.toLowerCase().includes('.avi') ||
      v.filename.toLowerCase().includes('.mov')
    )
  );
  
  if (problematicFormats.length > 0) {
    console.log(`⚠️ Videos with potentially problematic formats:`);
    problematicFormats.slice(0, 3).forEach(video => {
      console.log(`   - ${video.filename}`);
    });
    console.log(`💡 These formats may need conversion for web playback`);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  try {
    // Test 1: Get video list
    const videos = await testVideoList();
    
    if (videos.length === 0) {
      console.log('❌ No videos found - cannot continue with tests');
      return;
    }
    
    // Test 2: Thumbnails
    await testThumbnails(videos);
    
    // Test 3: Video streaming
    await testVideoStreaming(videos);
    
    // Test 4: Thumbnail generation
    await testThumbnailGeneration();
    
    // Test 5: Playback issues
    await testVideoPlaybackIssues(videos);
    
    console.log('\n🏁 Comprehensive test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Check thumbnail display in video management interface');
    console.log('   - Test video playback with different file sizes');
    console.log('   - Monitor browser console for playback errors');
    console.log('   - Consider video format conversion if needed');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the tests
runTests();
