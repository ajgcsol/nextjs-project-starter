#!/usr/bin/env node

/**
 * Immediate Thumbnail Fix
 * This script addresses the thumbnail issue by ensuring proper Mux asset creation
 */

const https = require('https');

const BASE_URL = 'https://law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app';

console.log('🖼️ Starting immediate thumbnail fix...');
console.log('🌐 Target URL:', BASE_URL);

/**
 * Make HTTP request
 */
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('application/json') ? 
              JSON.parse(body) : body
          };
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Test current video upload and check for thumbnail generation
 */
async function testCurrentVideoUpload() {
  console.log('📤 Testing current video upload process...');
  
  try {
    const url = new URL('/api/videos/upload', BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Test upload with mock data
    const uploadData = {
      title: 'Test Video - Thumbnail Fix',
      description: 'Testing thumbnail generation fix',
      category: 'Test',
      tags: 'test,thumbnail,fix',
      visibility: 'private',
      s3Key: 'test-videos/thumbnail-fix-test-' + Date.now() + '.mp4',
      publicUrl: 'https://test-bucket.s3.amazonaws.com/test-video.mp4',
      filename: 'thumbnail-fix-test.mp4',
      size: 10485760, // 10MB
      mimeType: 'video/mp4'
    };

    const response = await makeRequest(options, uploadData);
    
    console.log('📊 Upload test response:', {
      status: response.statusCode,
      success: response.body?.success,
      videoId: response.body?.video?.id,
      hasThumbnail: !!response.body?.video?.thumbnailPath,
      thumbnailPath: response.body?.video?.thumbnailPath,
      message: response.body?.message
    });

    if (response.statusCode === 200 && response.body?.success) {
      console.log('✅ Video upload is working');
      
      if (response.body.video?.thumbnailPath) {
        console.log('🖼️ Thumbnail path generated:', response.body.video.thumbnailPath);
        
        // Check if it's a Mux thumbnail
        if (response.body.video.thumbnailPath.includes('mux.com')) {
          console.log('🎭 Mux thumbnail detected - integration is working!');
        } else {
          console.log('⚠️ Non-Mux thumbnail - fallback thumbnail system active');
        }
      } else {
        console.log('❌ No thumbnail path generated - this is the issue');
      }
      
      return { success: true, data: response.body };
    } else {
      console.error('❌ Video upload failed:', response.body?.error);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check existing videos for thumbnail status
 */
async function checkExistingVideos() {
  console.log('📋 Checking existing videos...');
  
  try {
    const url = new URL('/api/videos', BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200 && response.body?.videos) {
      const videos = response.body.videos;
      console.log(`📊 Found ${videos.length} existing videos`);
      
      let withThumbnails = 0;
      let withoutThumbnails = 0;
      let muxThumbnails = 0;
      
      videos.forEach(video => {
        if (video.thumbnailPath) {
          withThumbnails++;
          if (video.thumbnailPath.includes('mux.com')) {
            muxThumbnails++;
          }
        } else {
          withoutThumbnails++;
        }
      });
      
      console.log('📈 Thumbnail statistics:');
      console.log(`  ✅ With thumbnails: ${withThumbnails}`);
      console.log(`  ❌ Without thumbnails: ${withoutThumbnails}`);
      console.log(`  🎭 Mux thumbnails: ${muxThumbnails}`);
      
      if (withoutThumbnails > 0) {
        console.log('\n🔧 Videos without thumbnails need processing:');
        videos.filter(v => !v.thumbnailPath).slice(0, 5).forEach(video => {
          console.log(`  - ${video.title} (ID: ${video.id})`);
        });
      }
      
      return {
        success: true,
        total: videos.length,
        withThumbnails,
        withoutThumbnails,
        muxThumbnails
      };
    } else {
      console.error('❌ Failed to fetch videos:', response.statusCode);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Error checking videos:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Provide recommendations based on findings
 */
function provideRecommendations(uploadResult, videoResult) {
  console.log('\n🎯 Recommendations:');
  console.log('==================');
  
  if (!uploadResult.success) {
    console.log('❌ CRITICAL: Video upload is not working');
    console.log('   → Deploy the new Mux integration code first');
    console.log('   → Check environment variables (MUX_TOKEN_ID, MUX_TOKEN_SECRET)');
    return;
  }
  
  if (videoResult.success && videoResult.withoutThumbnails > 0) {
    console.log(`⚠️ ISSUE: ${videoResult.withoutThumbnails} videos missing thumbnails`);
    console.log('   → Run database migration to add Mux columns');
    console.log('   → Deploy new webhook handler');
    console.log('   → Process existing videos through batch script');
  }
  
  if (videoResult.success && videoResult.muxThumbnails === 0) {
    console.log('🔧 ACTION NEEDED: No Mux thumbnails detected');
    console.log('   → Mux integration is not active');
    console.log('   → Deploy the new Mux integration code');
    console.log('   → Configure Mux webhook URL');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy the new code to Vercel');
  console.log('2. Run database migration: POST /api/database/execute-migration');
  console.log('3. Configure Mux webhook: https://your-domain.vercel.app/api/mux/webhook');
  console.log('4. Process existing videos: node scripts/batch-process-existing-videos.js');
  console.log('5. Test new video upload to verify thumbnail generation');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Running immediate thumbnail fix analysis...\n');
  
  // Test current upload process
  const uploadResult = await testCurrentVideoUpload();
  console.log('');
  
  // Check existing videos
  const videoResult = await checkExistingVideos();
  console.log('');
  
  // Provide recommendations
  provideRecommendations(uploadResult, videoResult);
  
  console.log('\n✅ Analysis complete!');
  
  return {
    uploadWorking: uploadResult.success,
    videosNeedingThumbnails: videoResult.success ? videoResult.withoutThumbnails : 0,
    muxActive: videoResult.success ? videoResult.muxThumbnails > 0 : false
  };
}

// Run if called directly
if (require.main === module) {
  main()
    .then(result => {
      console.log('\n📊 Final Status:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
