/**
 * Debug video playback issues for specific video ID
 */

const https = require('https');

// Configuration
const API_BASE = 'https://law-school-repository-aumvefigg-andrew-j-gregwares-projects.vercel.app';
const VIDEO_ID = '16d9cec1-b61d-4cd0-a998-29f874635893'; // The failing video

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data: data,
          redirectLocation: res.headers.location
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

async function testVideoAPI() {
  console.log('🎥 Testing video API endpoint...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/videos/${VIDEO_ID}`);
    
    console.log(`📊 Video API Status: ${response.status}`);
    
    if (response.status === 200) {
      const videoData = JSON.parse(response.data);
      console.log('✅ Video data retrieved:');
      console.log(`   Title: ${videoData.video?.title}`);
      console.log(`   Size: ${videoData.video?.size ? Math.round(videoData.video.size / 1024 / 1024) + 'MB' : 'Unknown'}`);
      console.log(`   S3 Key: ${videoData.video?.s3Key || 'None'}`);
      console.log(`   Stream URL: ${videoData.video?.streamUrl || 'None'}`);
      return videoData.video;
    } else {
      console.log('❌ Video API failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Video API error:', error.message);
    return null;
  }
}

async function testStreamEndpoint() {
  console.log('\n🎬 Testing stream endpoint...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/videos/stream/${VIDEO_ID}`);
    
    console.log(`📊 Stream Status: ${response.status}`);
    console.log(`🔄 Redirect Location: ${response.redirectLocation || 'None'}`);
    
    if (response.status === 302 && response.redirectLocation) {
      console.log('✅ Stream endpoint redirecting to:', response.redirectLocation);
      return response.redirectLocation;
    } else if (response.status === 200) {
      console.log('✅ Stream endpoint serving directly');
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📏 Content-Length: ${response.headers['content-length']}`);
      return `${API_BASE}/api/videos/stream/${VIDEO_ID}`;
    } else {
      console.log('❌ Stream endpoint failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Stream endpoint error:', error.message);
    return null;
  }
}

async function testDirectVideoURL(videoUrl) {
  if (!videoUrl) return false;
  
  console.log('\n📹 Testing direct video URL...');
  console.log(`🔗 URL: ${videoUrl}`);
  
  try {
    // Test with HEAD request first
    const headResponse = await makeRequest(videoUrl, { method: 'HEAD' });
    
    console.log(`📊 Direct URL Status: ${headResponse.status}`);
    console.log(`📄 Content-Type: ${headResponse.headers['content-type']}`);
    console.log(`📏 Content-Length: ${headResponse.headers['content-length']}`);
    console.log(`🎯 Accept-Ranges: ${headResponse.headers['accept-ranges']}`);
    
    if (headResponse.status === 200) {
      console.log('✅ Direct video URL is accessible');
      
      // Test range request (important for video streaming)
      console.log('\n🎯 Testing range request...');
      const rangeResponse = await makeRequest(videoUrl, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-1023'
        }
      });
      
      console.log(`📊 Range Request Status: ${rangeResponse.status}`);
      console.log(`📏 Content-Range: ${rangeResponse.headers['content-range']}`);
      
      if (rangeResponse.status === 206) {
        console.log('✅ Range requests supported - video should stream properly');
        return true;
      } else {
        console.log('⚠️ Range requests not supported - may cause playback issues');
        return false;
      }
    } else {
      console.log('❌ Direct video URL not accessible');
      return false;
    }
  } catch (error) {
    console.log('❌ Direct URL test error:', error.message);
    return false;
  }
}

async function testThumbnail() {
  console.log('\n🖼️ Testing thumbnail endpoint...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/videos/thumbnail/${VIDEO_ID}`);
    
    console.log(`📊 Thumbnail Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Thumbnail served directly');
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    } else if (response.status === 302) {
      console.log('🔄 Thumbnail redirected to:', response.redirectLocation);
    } else {
      console.log('❌ Thumbnail failed');
    }
  } catch (error) {
    console.log('❌ Thumbnail error:', error.message);
  }
}

async function main() {
  console.log('🚀 Video Playback Diagnostics');
  console.log(`🎯 Testing Video ID: ${VIDEO_ID}`);
  console.log('=' .repeat(60));
  
  // Step 1: Test video API
  const videoData = await testVideoAPI();
  
  // Step 2: Test stream endpoint
  const streamUrl = await testStreamEndpoint();
  
  // Step 3: Test direct video URL
  const directUrlWorks = await testDirectVideoURL(streamUrl);
  
  // Step 4: Test thumbnail
  await testThumbnail();
  
  // Final diagnosis
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DIAGNOSIS');
  console.log('='.repeat(60));
  
  if (videoData && streamUrl && directUrlWorks) {
    console.log('✅ ALL TESTS PASSED');
    console.log('🎯 Video should play correctly');
    console.log('📋 If video still won\'t play, the issue is likely:');
    console.log('   - Browser compatibility');
    console.log('   - Network connectivity');
    console.log('   - Video codec issues');
  } else {
    console.log('❌ ISSUES FOUND');
    
    if (!videoData) {
      console.log('🔧 FIX: Video API endpoint not working');
    }
    
    if (!streamUrl) {
      console.log('🔧 FIX: Stream endpoint not redirecting properly');
    }
    
    if (streamUrl && !directUrlWorks) {
      console.log('🔧 FIX: Direct video URL not accessible or missing range support');
      console.log('   - Check CloudFront configuration');
      console.log('   - Verify S3 bucket permissions');
      console.log('   - Ensure video file exists in S3');
    }
  }
  
  console.log('\n🔗 Manual Test URLs:');
  console.log(`   Video API: ${API_BASE}/api/videos/${VIDEO_ID}`);
  console.log(`   Stream: ${API_BASE}/api/videos/stream/${VIDEO_ID}`);
  console.log(`   Thumbnail: ${API_BASE}/api/videos/thumbnail/${VIDEO_ID}`);
  console.log(`   Player: ${API_BASE}/dashboard/videos/${VIDEO_ID}`);
}

// Run the diagnostics
main().catch(error => {
  console.error('💥 Diagnostics failed:', error);
  process.exit(1);
});
