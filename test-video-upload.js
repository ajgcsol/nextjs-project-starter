const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const BASE_URL = 'https://law-school-repository-4jpn3ffuc-andrew-j-gregwares-projects.vercel.app';
const VIDEO_FILE_PATH = '.claude/Favorites in Edge.mp4';

async function testVideoUpload() {
  console.log('🎬 Starting comprehensive video upload test...');
  
  try {
    // Step 1: Check if video file exists
    if (!fs.existsSync(VIDEO_FILE_PATH)) {
      throw new Error(`Video file not found: ${VIDEO_FILE_PATH}`);
    }
    
    const fileStats = fs.statSync(VIDEO_FILE_PATH);
    console.log(`📁 Video file found: ${VIDEO_FILE_PATH}`);
    console.log(`📊 File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Step 2: Test presigned URL generation
    console.log('\n🔗 Testing presigned URL generation...');
    const presignedResponse = await fetch(`${BASE_URL}/api/videos/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'Favorites in Edge.mp4',
        contentType: 'video/mp4',
        fileSize: fileStats.size,
      }),
    });
    
    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json();
      throw new Error(`Presigned URL failed: ${errorData.error}`);
    }
    
    const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();
    console.log('✅ Presigned URL generated successfully');
    console.log(`🔑 S3 Key: ${s3Key}`);
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    // Step 3: Upload file to S3
    console.log('\n📤 Uploading file to S3...');
    const fileBuffer = fs.readFileSync(VIDEO_FILE_PATH);
    
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: fileBuffer,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    console.log('✅ File uploaded to S3 successfully');
    
    // Step 4: Save video metadata
    console.log('\n💾 Saving video metadata...');
    const metadataPayload = {
      title: 'Test Video - Favorites in Edge',
      description: 'Test video upload to verify video playback functionality',
      category: 'Tutorial',
      tags: 'test, upload, verification',
      visibility: 'public',
      s3Key,
      publicUrl,
      filename: 'Favorites in Edge.mp4',
      size: fileStats.size,
      mimeType: 'video/mp4',
    };
    
    const videoResponse = await fetch(`${BASE_URL}/api/videos/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadataPayload),
    });
    
    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      throw new Error(`Video metadata save failed: ${videoResponse.status} - ${errorText}`);
    }
    
    const videoData = await videoResponse.json();
    console.log('✅ Video metadata saved successfully');
    console.log(`🎬 Video ID: ${videoData.video.id}`);
    console.log(`🎬 Video Title: ${videoData.video.title}`);
    console.log(`🎬 Stream URL: ${videoData.video.streamUrl}`);
    
    // Step 5: Test video streaming endpoint
    console.log('\n🎥 Testing video streaming endpoint...');
    const streamResponse = await fetch(`${BASE_URL}/api/videos/stream/${videoData.video.id}`, {
      method: 'HEAD', // Use HEAD to check if endpoint exists without downloading
    });
    
    console.log(`📡 Stream endpoint status: ${streamResponse.status}`);
    console.log(`📡 Stream endpoint headers:`, Object.fromEntries(streamResponse.headers.entries()));
    
    if (streamResponse.ok) {
      console.log('✅ Video streaming endpoint is accessible');
    } else {
      console.log('⚠️ Video streaming endpoint may have issues');
    }
    
    // Step 6: Test thumbnail endpoint
    console.log('\n🖼️ Testing thumbnail endpoint...');
    const thumbnailResponse = await fetch(`${BASE_URL}/api/videos/thumbnail/${videoData.video.id}`, {
      method: 'HEAD',
    });
    
    console.log(`🖼️ Thumbnail endpoint status: ${thumbnailResponse.status}`);
    
    if (thumbnailResponse.ok) {
      console.log('✅ Thumbnail endpoint is accessible');
    } else {
      console.log('⚠️ Thumbnail endpoint may have issues');
    }
    
    // Step 7: Verify video appears in video list
    console.log('\n📋 Verifying video appears in video list...');
    const videosResponse = await fetch(`${BASE_URL}/api/videos/upload`);
    
    if (videosResponse.ok) {
      const videosData = await videosResponse.json();
      const uploadedVideo = videosData.videos?.find(v => v.id === videoData.video.id);
      
      if (uploadedVideo) {
        console.log('✅ Video found in video list');
        console.log(`📊 Total videos in system: ${videosData.videos.length}`);
      } else {
        console.log('⚠️ Video not found in video list');
      }
    } else {
      console.log('⚠️ Could not fetch video list');
    }
    
    console.log('\n🎉 Video upload test completed successfully!');
    console.log('\n📋 Test Results Summary:');
    console.log(`✅ Presigned URL generation: Working`);
    console.log(`✅ S3 file upload: Working`);
    console.log(`✅ Video metadata save: Working`);
    console.log(`✅ Video streaming endpoint: ${streamResponse.ok ? 'Working' : 'Needs attention'}`);
    console.log(`✅ Thumbnail endpoint: ${thumbnailResponse.ok ? 'Working' : 'Needs attention'}`);
    
    return {
      success: true,
      videoId: videoData.video.id,
      streamUrl: `${BASE_URL}/api/videos/stream/${videoData.video.id}`,
      thumbnailUrl: `${BASE_URL}/api/videos/thumbnail/${videoData.video.id}`,
      dashboardUrl: `${BASE_URL}/dashboard/videos`,
    };
    
  } catch (error) {
    console.error('❌ Video upload test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
testVideoUpload().then(result => {
  if (result.success) {
    console.log('\n🎬 Next steps for manual verification:');
    console.log(`1. Visit: ${result.dashboardUrl}`);
    console.log(`2. Find the uploaded video: "Test Video - Favorites in Edge"`);
    console.log(`3. Click on the video to test playback`);
    console.log(`4. Verify video plays without "Video error: Event"`);
    console.log(`5. Check thumbnail displays correctly`);
  } else {
    console.log('\n❌ Upload test failed. Check the error details above.');
    process.exit(1);
  }
});
