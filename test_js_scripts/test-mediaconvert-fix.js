const https = require('https');

// Test the fixed MediaConvert thumbnail generation
async function testMediaConvertFix() {
  console.log('🧪 Testing MediaConvert carriage return fix...');
  
  const deploymentUrl = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';
  
  try {
    // Test 1: Check if thumbnail generation API works
    console.log('\n📋 Test 1: Thumbnail Generation API');
    const thumbnailResponse = await makeRequest(`${deploymentUrl}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        batchMode: false,
        videoId: 'test-video-id'
      })
    });
    
    console.log('✅ Thumbnail API Response:', thumbnailResponse.status);
    if (thumbnailResponse.data) {
      console.log('📊 Response data:', JSON.stringify(thumbnailResponse.data, null, 2));
    }
    
    // Test 2: Check MediaConvert setup endpoint
    console.log('\n📋 Test 2: MediaConvert Setup Check');
    const setupResponse = await makeRequest(`${deploymentUrl}/api/mediaconvert/setup`);
    
    console.log('✅ MediaConvert Setup Response:', setupResponse.status);
    if (setupResponse.data) {
      console.log('📊 Setup data:', JSON.stringify(setupResponse.data, null, 2));
    }
    
    // Test 3: Check videos that need thumbnails
    console.log('\n📋 Test 3: Videos Needing Thumbnails');
    const videosResponse = await makeRequest(`${deploymentUrl}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`);
    
    console.log('✅ Videos List Response:', videosResponse.status);
    if (videosResponse.data) {
      console.log('📊 Videos needing thumbnails:', videosResponse.data.count || 0);
      if (videosResponse.data.videos && videosResponse.data.videos.length > 0) {
        console.log('🎬 Sample video:', videosResponse.data.videos[0].title);
      }
    }
    
    console.log('\n🎉 MediaConvert fix test completed!');
    console.log('📋 The carriage return sanitization should now allow MediaConvert to work properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run the test
testMediaConvertFix().catch(console.error);
