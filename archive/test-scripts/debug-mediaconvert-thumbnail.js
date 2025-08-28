#!/usr/bin/env node

/**
 * Debug MediaConvert Thumbnail Generation
 * This script will help identify why MediaConvert jobs aren't being created
 */

const https = require('https');

const BASE_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function debugMediaConvertThumbnails() {
  console.log('🔍 DEBUG: MediaConvert Thumbnail Generation');
  console.log('==========================================');
  
  try {
    // Step 1: Get a video with S3 key for testing
    console.log('\n📋 Step 1: Finding video with S3 key...');
    const videosResponse = await makeRequest(`${BASE_URL}/api/videos`);
    
    if (videosResponse.status !== 200) {
      console.error('❌ Failed to fetch videos:', videosResponse.data);
      return;
    }
    
    const videos = videosResponse.data.videos || [];
    const videoWithS3Key = videos.find(v => v.s3_key);
    
    if (!videoWithS3Key) {
      console.log('❌ No videos found with S3 keys');
      console.log('📋 Available videos:', videos.map(v => ({
        id: v.id,
        title: v.title,
        hasS3Key: !!v.s3_key,
        s3Key: v.s3_key
      })));
      return;
    }
    
    console.log('✅ Found video with S3 key:', {
      id: videoWithS3Key.id,
      title: videoWithS3Key.title,
      s3Key: videoWithS3Key.s3_key
    });
    
    // Step 2: Test MediaConvert configuration endpoint
    console.log('\n🔧 Step 2: Checking MediaConvert configuration...');
    const configResponse = await makeRequest(`${BASE_URL}/api/mediaconvert/setup`);
    
    console.log('MediaConvert setup response:', {
      status: configResponse.status,
      data: configResponse.data
    });
    
    // Step 3: Test direct thumbnail generation with detailed logging
    console.log('\n🖼️ Step 3: Testing direct thumbnail generation...');
    const thumbnailResponse = await makeRequest(`${BASE_URL}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: videoWithS3Key.id,
        forceRegenerate: true,
        debug: true
      })
    });
    
    console.log('Thumbnail generation response:', {
      status: thumbnailResponse.status,
      success: thumbnailResponse.data.success,
      method: thumbnailResponse.data.method,
      error: thumbnailResponse.data.error,
      jobId: thumbnailResponse.data.jobId,
      thumbnailUrl: thumbnailResponse.data.thumbnailUrl ? 'Generated' : 'None'
    });
    
    // Step 4: Test AWS credentials and permissions
    console.log('\n🔐 Step 4: Testing AWS credentials...');
    const awsHealthResponse = await makeRequest(`${BASE_URL}/api/aws/health`);
    
    console.log('AWS health check:', {
      status: awsHealthResponse.status,
      data: awsHealthResponse.data
    });
    
    // Step 5: Test S3 access specifically
    console.log('\n📦 Step 5: Testing S3 access...');
    const s3TestResponse = await makeRequest(`${BASE_URL}/api/aws/test-s3`);
    
    console.log('S3 test response:', {
      status: s3TestResponse.status,
      data: s3TestResponse.data
    });
    
    // Step 6: Analyze the issue
    console.log('\n🔍 Step 6: Issue Analysis');
    console.log('========================');
    
    if (thumbnailResponse.data.method === 'enhanced_svg') {
      console.log('❌ ISSUE IDENTIFIED: MediaConvert is not being used');
      console.log('📋 Possible causes:');
      console.log('   1. MediaConvert environment variables not set in production');
      console.log('   2. MediaConvert permissions insufficient');
      console.log('   3. Video S3 key not accessible');
      console.log('   4. MediaConvert endpoint incorrect');
      console.log('   5. AWS credentials not working in production');
      
      // Check specific conditions
      if (configResponse.status !== 200) {
        console.log('🔧 MediaConvert setup endpoint failed - check environment variables');
      }
      
      if (awsHealthResponse.status !== 200) {
        console.log('🔐 AWS credentials test failed - check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
      }
      
      if (s3TestResponse.status !== 200) {
        console.log('📦 S3 access test failed - check S3 permissions');
      }
    } else if (thumbnailResponse.data.method === 'mediaconvert') {
      console.log('✅ SUCCESS: MediaConvert job created!');
      console.log('📸 Job ID:', thumbnailResponse.data.jobId);
    }
    
    // Step 7: Test with a specific video that we know has issues
    console.log('\n🎯 Step 7: Testing specific problematic video...');
    const specificVideoId = '70411f16-e11f-4314-b04e-7ee606dc5e2f';
    const specificResponse = await makeRequest(`${BASE_URL}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: specificVideoId,
        forceRegenerate: true,
        debug: true
      })
    });
    
    console.log('Specific video test:', {
      videoId: specificVideoId,
      status: specificResponse.status,
      method: specificResponse.data.method,
      success: specificResponse.data.success,
      error: specificResponse.data.error
    });
    
    console.log('\n📊 DEBUGGING COMPLETE');
    console.log('====================');
    console.log('Review the output above to identify the root cause.');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugMediaConvertThumbnails();
