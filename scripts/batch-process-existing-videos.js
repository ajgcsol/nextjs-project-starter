#!/usr/bin/env node

/**
 * Batch Process Existing Videos Through Mux
 * Creates Mux assets for existing videos that don't have Mux integration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}` : 
  'https://nextjs-project-starter-nine-psi.vercel.app';

const BATCH_CONFIG = {
  baseUrl: BASE_URL,
  batchSize: 5, // Process 5 videos at a time
  delayBetweenBatches: 10000, // 10 seconds between batches
  timeout: 60000, // 1 minute timeout per request
  maxRetries: 3
};

console.log('🎬 Starting Batch Processing of Existing Videos');
console.log('🌐 Base URL:', BATCH_CONFIG.baseUrl);
console.log('📦 Batch Size:', BATCH_CONFIG.batchSize);
console.log('⏱️ Delay Between Batches:', BATCH_CONFIG.delayBetweenBatches, 'ms');
console.log('');

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(options, data = null, retries = BATCH_CONFIG.maxRetries) {
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

    req.on('error', (error) => {
      if (retries > 0) {
        console.log(`⚠️ Request failed, retrying... (${retries} attempts left)`);
        setTimeout(() => {
          makeRequest(options, data, retries - 1).then(resolve).catch(reject);
        }, 2000);
      } else {
        reject(error);
      }
    });

    req.setTimeout(BATCH_CONFIG.timeout, () => {
      req.destroy();
      if (retries > 0) {
        console.log(`⚠️ Request timeout, retrying... (${retries} attempts left)`);
        setTimeout(() => {
          makeRequest(options, data, retries - 1).then(resolve).catch(reject);
        }, 2000);
      } else {
        reject(new Error('Request timeout'));
      }
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Get all existing videos
 */
async function getExistingVideos() {
  console.log('📋 Fetching existing videos...');
  
  try {
    const url = new URL('/api/videos', BATCH_CONFIG.baseUrl);
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
      console.log(`✅ Found ${videos.length} existing videos`);
      
      // Filter videos that need Mux processing
      const videosNeedingMux = videos.filter(video => {
        // Check if video has S3 key but no Mux data
        const hasS3Key = video.metadata?.s3Key || video.metadata?.directUrl;
        const hasMuxData = video.metadata?.muxAssetId || video.thumbnailPath?.includes('mux.com');
        
        return hasS3Key && !hasMuxData;
      });
      
      console.log(`🎯 ${videosNeedingMux.length} videos need Mux processing`);
      
      return {
        success: true,
        allVideos: videos,
        videosNeedingMux: videosNeedingMux
      };
    } else {
      console.error('❌ Failed to fetch videos:', response.statusCode);
      return {
        success: false,
        error: response.body?.error || 'Failed to fetch videos'
      };
    }

  } catch (error) {
    console.error('❌ Error fetching videos:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create Mux asset for a video
 */
async function createMuxAssetForVideo(video) {
  console.log(`🎬 Creating Mux asset for video: ${video.title} (${video.id})`);
  
  try {
    // Extract S3 key from video metadata
    const s3Key = video.metadata?.s3Key;
    const directUrl = video.metadata?.directUrl;
    
    if (!s3Key && !directUrl) {
      console.log('⚠️ No S3 key or direct URL found, skipping...');
      return {
        success: false,
        videoId: video.id,
        error: 'No S3 key or direct URL available'
      };
    }

    // Simulate Mux asset creation by updating the video with mock Mux data
    // In a real implementation, this would call the Mux API
    const url = new URL('/api/videos/upload', BATCH_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const muxData = {
      title: video.title,
      description: video.description || '',
      category: video.category || 'General',
      tags: Array.isArray(video.tags) ? video.tags.join(',') : '',
      visibility: video.visibility || 'private',
      s3Key: s3Key || `extracted/${video.id}.mp4`,
      publicUrl: directUrl || `https://example.com/${video.id}.mp4`,
      filename: video.originalFilename || `${video.title}.mp4`,
      size: video.size || 10485760,
      mimeType: 'video/mp4',
      existingVideoId: video.id, // Flag to update existing video
      processMux: true // Flag to enable Mux processing
    };

    const response = await makeRequest(options, muxData);
    
    if (response.statusCode === 200 && response.body?.success) {
      console.log(`✅ Mux asset created for video: ${video.title}`);
      return {
        success: true,
        videoId: video.id,
        muxAssetId: response.body.video?.metadata?.muxAssetId,
        thumbnailUrl: response.body.video?.thumbnailPath
      };
    } else {
      console.error(`❌ Failed to create Mux asset for video: ${video.title}`, response.body?.error);
      return {
        success: false,
        videoId: video.id,
        error: response.body?.error || 'Unknown error'
      };
    }

  } catch (error) {
    console.error(`❌ Error creating Mux asset for video: ${video.title}`, error.message);
    return {
      success: false,
      videoId: video.id,
      error: error.message
    };
  }
}

/**
 * Process videos in batches
 */
async function processBatch(videos, batchIndex) {
  console.log(`\n📦 Processing batch ${batchIndex + 1} (${videos.length} videos)...`);
  
  const results = [];
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    console.log(`\n🎬 Processing video ${i + 1}/${videos.length}: ${video.title}`);
    
    const result = await createMuxAssetForVideo(video);
    results.push(result);
    
    // Small delay between individual video processing
    if (i < videos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Batch ${batchIndex + 1} completed: ${successful} successful, ${failed} failed`);
  
  return results;
}

/**
 * Save processing results to file
 */
function saveResults(results, summary) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch-processing-results-${timestamp}.json`;
  const filepath = path.join(process.cwd(), filename);
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    results,
    config: BATCH_CONFIG
  };
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));
    console.log(`📄 Results saved to: ${filename}`);
  } catch (error) {
    console.error('❌ Failed to save results:', error.message);
  }
}

/**
 * Main batch processing function
 */
async function runBatchProcessing() {
  console.log('🚀 Starting batch processing of existing videos...\n');
  
  // Get existing videos
  const videosResult = await getExistingVideos();
  
  if (!videosResult.success) {
    console.error('❌ Failed to fetch videos:', videosResult.error);
    return { success: false, error: videosResult.error };
  }
  
  const { videosNeedingMux } = videosResult;
  
  if (videosNeedingMux.length === 0) {
    console.log('✅ No videos need Mux processing. All done!');
    return { success: true, processed: 0, message: 'No videos needed processing' };
  }
  
  // Split videos into batches
  const batches = [];
  for (let i = 0; i < videosNeedingMux.length; i += BATCH_CONFIG.batchSize) {
    batches.push(videosNeedingMux.slice(i, i + BATCH_CONFIG.batchSize));
  }
  
  console.log(`📦 Processing ${videosNeedingMux.length} videos in ${batches.length} batches`);
  
  const allResults = [];
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i);
    allResults.push(...batchResults);
    
    // Delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      console.log(`\n⏱️ Waiting ${BATCH_CONFIG.delayBetweenBatches / 1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_CONFIG.delayBetweenBatches));
    }
  }
  
  // Calculate summary
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  
  const summary = {
    totalVideos: videosNeedingMux.length,
    successful,
    failed,
    successRate: ((successful / videosNeedingMux.length) * 100).toFixed(1) + '%',
    batches: batches.length,
    batchSize: BATCH_CONFIG.batchSize
  };
  
  // Save results
  saveResults(allResults, summary);
  
  // Final summary
  console.log('\n🎉 Batch Processing Complete!');
  console.log('================================');
  console.log(`📊 Total Videos: ${summary.totalVideos}`);
  console.log(`✅ Successful: ${summary.successful}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📈 Success Rate: ${summary.successRate}`);
  console.log(`📦 Batches Processed: ${summary.batches}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Videos:');
    allResults.filter(r => !r.success).forEach(result => {
      console.log(`   - Video ID: ${result.videoId}, Error: ${result.error}`);
    });
  }
  
  return {
    success: failed === 0,
    summary,
    results: allResults
  };
}

// Run batch processing if called directly
if (require.main === module) {
  runBatchProcessing()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Batch processing failed:', error);
      process.exit(1);
    });
}

module.exports = { runBatchProcessing, getExistingVideos };
