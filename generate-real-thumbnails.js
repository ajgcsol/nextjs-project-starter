/**
 * Generate REAL thumbnails from video frames using AWS MediaConvert
 * This script processes videos one by one to ensure each gets a proper thumbnail
 */

const https = require('https');

// Configuration
const API_BASE = 'https://nextjs-project-starter-ajgcsols-projects.vercel.app';
const BATCH_SIZE = 1; // Process one video at a time
const DELAY_BETWEEN_VIDEOS = 5000; // 5 seconds between videos

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

async function getVideosNeedingThumbnails() {
  console.log('🔍 Fetching videos that need real thumbnails...');
  
  const response = await makeRequest(
    `${API_BASE}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=50`
  );
  
  if (response.status === 200 && response.data.success) {
    console.log(`📹 Found ${response.data.videos.length} videos needing thumbnails`);
    return response.data.videos;
  } else {
    console.error('❌ Failed to fetch videos:', response.data);
    return [];
  }
}

async function generateThumbnailForVideo(video) {
  console.log(`\n🎬 Processing: ${video.title}`);
  console.log(`📋 Video ID: ${video.id}`);
  console.log(`📁 S3 Key: ${video.s3_key || 'NONE'}`);
  console.log(`🔗 File Path: ${video.file_path || 'NONE'}`);
  
  try {
    const response = await makeRequest(
      `${API_BASE}/api/videos/generate-thumbnails`,
      {
        method: 'POST',
        body: {
          videoId: video.id,
          batchMode: false
        }
      }
    );
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ SUCCESS: ${response.data.method.toUpperCase()} thumbnail generated`);
      console.log(`🖼️ Thumbnail URL: ${response.data.thumbnailUrl || 'N/A'}`);
      
      if (response.data.jobId) {
        console.log(`🔄 MediaConvert Job ID: ${response.data.jobId}`);
        console.log(`⏳ Real thumbnail will be available after processing completes`);
      }
      
      return {
        success: true,
        method: response.data.method,
        thumbnailUrl: response.data.thumbnailUrl,
        jobId: response.data.jobId
      };
    } else {
      console.log(`❌ FAILED: ${response.data.error || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.error || 'Unknown error'
      };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkMediaConvertJobStatus(jobId, videoId) {
  try {
    const response = await makeRequest(
      `${API_BASE}/api/videos/generate-thumbnails?action=check-job-status&jobId=${jobId}&videoId=${videoId}`
    );
    
    if (response.status === 200 && response.data.success) {
      return {
        complete: response.data.isComplete,
        message: response.data.message
      };
    }
    
    return { complete: false, message: 'Status check failed' };
  } catch (error) {
    return { complete: false, message: error.message };
  }
}

async function waitForDelay(ms) {
  console.log(`⏳ Waiting ${ms/1000} seconds before next video...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting REAL thumbnail generation process...');
  console.log('📋 This will process videos one by one using AWS MediaConvert');
  console.log('🎯 Goal: Extract actual video frames as thumbnails\n');
  
  // Get videos that need thumbnails
  const videos = await getVideosNeedingThumbnails();
  
  if (videos.length === 0) {
    console.log('✅ No videos need thumbnail generation!');
    return;
  }
  
  console.log(`\n📊 Processing ${videos.length} videos individually...\n`);
  
  const results = {
    total: videos.length,
    successful: 0,
    failed: 0,
    mediaConvertJobs: [],
    errors: []
  };
  
  // Process each video individually
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    
    console.log(`\n📹 [${i + 1}/${videos.length}] Processing video...`);
    console.log('═'.repeat(60));
    
    const result = await generateThumbnailForVideo(video);
    
    if (result.success) {
      results.successful++;
      
      if (result.jobId) {
        results.mediaConvertJobs.push({
          videoId: video.id,
          videoTitle: video.title,
          jobId: result.jobId
        });
      }
    } else {
      results.failed++;
      results.errors.push({
        videoId: video.id,
        videoTitle: video.title,
        error: result.error
      });
    }
    
    // Wait between videos to avoid overwhelming the system
    if (i < videos.length - 1) {
      await waitForDelay(DELAY_BETWEEN_VIDEOS);
    }
  }
  
  // Final summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL RESULTS');
  console.log('═'.repeat(80));
  console.log(`✅ Successful: ${results.successful}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`🎬 MediaConvert Jobs: ${results.mediaConvertJobs.length}`);
  
  if (results.mediaConvertJobs.length > 0) {
    console.log('\n🔄 MediaConvert Jobs Created:');
    results.mediaConvertJobs.forEach(job => {
      console.log(`  📹 ${job.videoTitle} (${job.videoId})`);
      console.log(`     Job ID: ${job.jobId}`);
    });
    
    console.log('\n⏳ Note: MediaConvert jobs are processing in the background.');
    console.log('   Real thumbnails will be available once jobs complete (usually 2-5 minutes).');
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => {
      console.log(`  📹 ${error.videoTitle} (${error.videoId}): ${error.error}`);
    });
  }
  
  console.log('\n🎯 Process complete! Check your video management interface for updated thumbnails.');
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
