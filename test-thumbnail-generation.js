/**
 * Test script for thumbnail generation functionality
 * Run with: node test-thumbnail-generation.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testThumbnailGeneration() {
  console.log('🧪 Testing Thumbnail Generation System');
  console.log('=====================================\n');

  try {
    // Test 1: Check configuration
    console.log('1. Checking system configuration...');
    const configResponse = await fetch(`${BASE_URL}/api/videos/test-thumbnail?action=check-config`);
    const configData = await configResponse.json();
    
    if (configData.success) {
      console.log('✅ Configuration loaded successfully');
      console.log('   MediaConvert Available:', configData.config.mediaconvert.available);
      console.log('   AWS Configured:', configData.config.aws.access_key === 'configured');
      console.log('   S3 Bucket:', configData.config.aws.s3_bucket);
      console.log('   Environment:', configData.config.environment.node_env);
    } else {
      console.log('❌ Failed to load configuration');
      return;
    }

    console.log('\n2. Fetching videos without thumbnails...');
    const videosResponse = await fetch(`${BASE_URL}/api/videos/test-thumbnail?action=list-videos&limit=5`);
    const videosData = await videosResponse.json();
    
    if (videosData.success && videosData.videos.length > 0) {
      console.log(`✅ Found ${videosData.videos.length} videos without thumbnails`);
      
      // Test thumbnail generation for the first video
      const testVideo = videosData.videos[0];
      console.log(`\n3. Testing thumbnail generation for: ${testVideo.title}`);
      console.log(`   Video ID: ${testVideo.id}`);
      console.log(`   Filename: ${testVideo.filename}`);
      console.log(`   Has S3 Key: ${!!testVideo.s3_key}`);

      // Test placeholder generation (should always work)
      console.log('\n   Testing placeholder generation...');
      const placeholderResponse = await fetch(`${BASE_URL}/api/videos/test-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: testVideo.id,
          method: 'placeholder'
        }),
      });

      const placeholderResult = await placeholderResponse.json();
      if (placeholderResult.success) {
        console.log('   ✅ Placeholder generation successful');
        console.log(`   📸 Thumbnail URL: ${placeholderResult.thumbnailUrl}`);
        console.log(`   🗂️ S3 Key: ${placeholderResult.s3Key}`);
      } else {
        console.log('   ❌ Placeholder generation failed:', placeholderResult.error);
      }

      // Test auto generation (tries all methods)
      console.log('\n   Testing auto generation...');
      const autoResponse = await fetch(`${BASE_URL}/api/videos/test-thumbnail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: testVideo.id,
          method: 'auto'
        }),
      });

      const autoResult = await autoResponse.json();
      if (autoResult.success) {
        console.log('   ✅ Auto generation successful');
        console.log(`   🎯 Method used: ${autoResult.method}`);
        console.log(`   📸 Thumbnail URL: ${autoResult.thumbnailUrl}`);
        if (autoResult.jobId) {
          console.log(`   🔄 Job ID: ${autoResult.jobId}`);
        }
      } else {
        console.log('   ❌ Auto generation failed:', autoResult.error);
      }

    } else if (videosData.success && videosData.videos.length === 0) {
      console.log('✅ No videos found without thumbnails - all videos already have thumbnails!');
      
      // Test with batch generation to see if it finds any
      console.log('\n3. Testing batch thumbnail generation...');
      const batchResponse = await fetch(`${BASE_URL}/api/videos/generate-thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchMode: true,
          limit: 3
        }),
      });

      const batchResult = await batchResponse.json();
      if (batchResult.success) {
        console.log(`✅ Batch generation completed`);
        console.log(`   📊 Processed: ${batchResult.processed}`);
        console.log(`   ✅ Successful: ${batchResult.successful}`);
        console.log(`   ❌ Failed: ${batchResult.failed}`);
      } else {
        console.log('❌ Batch generation failed:', batchResult.error);
      }
    } else {
      console.log('❌ Failed to fetch videos:', videosData.error);
    }

    console.log('\n🎉 Thumbnail generation test completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Visit http://localhost:3000/debug/thumbnail-test to test in the UI');
    console.log('   2. Upload a new video to test automatic thumbnail generation');
    console.log('   3. Check the videos dashboard to see thumbnail results');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the development server is running (npm run dev)');
    console.log('   2. Check that the database is connected');
    console.log('   3. Verify AWS credentials are configured');
  }
}

// Run the test
testThumbnailGeneration();
