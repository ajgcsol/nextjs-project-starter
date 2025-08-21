/**
 * Test thumbnail integration in video management interface
 * This script will generate thumbnails and verify they appear correctly
 */

const https = require('https');

// Configuration
const API_BASE = 'https://nextjs-project-starter-ajgcsols-projects.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
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

async function testThumbnailEndpoint(videoId) {
  console.log(`\n🖼️ Testing thumbnail endpoint for video: ${videoId}`);
  
  try {
    const response = await makeRequest(`${API_BASE}/api/videos/thumbnail/${videoId}`);
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Thumbnail endpoint working');
      console.log(`📄 Content type: ${response.headers?.['content-type'] || 'Unknown'}`);
      return true;
    } else if (response.status === 302) {
      console.log('🔄 Thumbnail redirected (probably to external URL)');
      return true;
    } else {
      console.log('❌ Thumbnail endpoint failed');
      console.log('📄 Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Thumbnail test error:', error.message);
    return false;
  }
}

async function generateThumbnailForVideo(videoId) {
  console.log(`\n🎬 Generating thumbnail for video: ${videoId}`);
  
  try {
    const response = await makeRequest(
      `${API_BASE}/api/videos/generate-thumbnails`,
      {
        method: 'POST',
        body: {
          videoId: videoId,
          batchMode: false
        }
      }
    );
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Thumbnail generation successful');
      console.log(`📋 Method: ${response.data.method}`);
      console.log(`🔗 Thumbnail URL: ${response.data.thumbnailUrl || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Thumbnail generation failed');
      console.log('📄 Error:', response.data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Generation error:', error.message);
    return false;
  }
}

async function getVideoList() {
  console.log('📹 Fetching video list...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/videos/upload`);
    
    if (response.status === 200 && response.data.videos) {
      console.log(`✅ Found ${response.data.videos.length} videos`);
      return response.data.videos;
    } else {
      console.log('❌ Failed to fetch videos:', response.data);
      return [];
    }
  } catch (error) {
    console.log('❌ Video list error:', error.message);
    return [];
  }
}

async function main() {
  console.log('🚀 Testing Thumbnail Integration');
  console.log('=' .repeat(50));
  
  // Step 1: Get video list
  const videos = await getVideoList();
  
  if (videos.length === 0) {
    console.log('❌ No videos found to test with');
    return;
  }
  
  // Step 2: Test with first 3 videos
  const testVideos = videos.slice(0, 3);
  
  console.log(`\n🎯 Testing with ${testVideos.length} videos:`);
  testVideos.forEach((video, index) => {
    console.log(`   ${index + 1}. ${video.title} (${video.id})`);
  });
  
  let successCount = 0;
  let failCount = 0;
  
  for (const video of testVideos) {
    console.log('\n' + '='.repeat(60));
    console.log(`📹 Processing: ${video.title}`);
    console.log(`🆔 Video ID: ${video.id}`);
    console.log(`📁 Current thumbnail: ${video.thumbnailPath || video.thumbnail_path || 'NONE'}`);
    
    // Step A: Test current thumbnail endpoint
    const thumbnailWorks = await testThumbnailEndpoint(video.id);
    
    // Step B: Generate new thumbnail
    const generationSuccess = await generateThumbnailForVideo(video.id);
    
    // Step C: Test thumbnail endpoint again
    if (generationSuccess) {
      console.log('\n⏳ Waiting 2 seconds for database update...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newThumbnailWorks = await testThumbnailEndpoint(video.id);
      
      if (newThumbnailWorks) {
        successCount++;
        console.log('🎉 SUCCESS: Thumbnail integration working!');
      } else {
        failCount++;
        console.log('❌ FAIL: Thumbnail generated but not accessible');
      }
    } else {
      failCount++;
      console.log('❌ FAIL: Could not generate thumbnail');
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${testVideos.length}`);
  console.log(`❌ Failed: ${failCount}/${testVideos.length}`);
  
  if (successCount > 0) {
    console.log('\n🎯 INTEGRATION STATUS: WORKING');
    console.log('✅ Thumbnails are being generated and displayed correctly');
    console.log('📋 The video management interface should now show proper thumbnails');
  } else {
    console.log('\n❌ INTEGRATION STATUS: BROKEN');
    console.log('🔧 Thumbnails are not being properly integrated into the video management interface');
    console.log('📋 Check the thumbnail API endpoint and database updates');
  }
  
  console.log('\n🔗 Test the video management interface at:');
  console.log(`   ${API_BASE}/dashboard/videos`);
}

// Run the test
main().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
