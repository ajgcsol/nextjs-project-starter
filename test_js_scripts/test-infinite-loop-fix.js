/**
 * Test script to verify the infinite loop fix
 * This script tests the fixed findOrCreateByMuxAsset method
 */

const { VideoDB } = require('../src/lib/database');

async function testInfiniteLoopFix() {
  console.log('🧪 Testing infinite loop fix for findOrCreateByMuxAsset...');
  
  const testMuxAssetId = 'test-mux-asset-' + Date.now();
  const testVideoData = {
    title: 'Test Video for Loop Fix',
    description: 'Testing the infinite loop fix',
    filename: 'test-video.mp4',
    file_path: 'https://example.com/test-video.mp4',
    file_size: 1024000,
    duration: 120,
    thumbnail_path: 'https://example.com/thumbnail.jpg',
    video_quality: 'HD',
    uploaded_by: 'test-user',
    s3_key: 'test-videos/test-video.mp4',
    s3_bucket: 'test-bucket',
    is_processed: true,
    is_public: false,
    mux_asset_id: testMuxAssetId,
    mux_playback_id: 'test-playback-id',
    mux_status: 'ready'
  };

  try {
    console.log('🔍 Test 1: First call to findOrCreateByMuxAsset (should create)');
    const startTime1 = Date.now();
    const result1 = await VideoDB.findOrCreateByMuxAsset(testMuxAssetId, testVideoData);
    const duration1 = Date.now() - startTime1;
    
    console.log('✅ Test 1 completed in', duration1, 'ms');
    console.log('📊 Result 1:', {
      created: result1.created,
      videoId: result1.video?.id,
      muxFieldsUsed: result1.muxFieldsUsed,
      fallbackUsed: result1.fallbackUsed
    });

    if (duration1 > 5000) {
      console.error('❌ Test 1 took too long - possible infinite loop!');
      return false;
    }

    console.log('🔍 Test 2: Second call with same Mux Asset ID (should find existing)');
    const startTime2 = Date.now();
    const result2 = await VideoDB.findOrCreateByMuxAsset(testMuxAssetId, testVideoData);
    const duration2 = Date.now() - startTime2;
    
    console.log('✅ Test 2 completed in', duration2, 'ms');
    console.log('📊 Result 2:', {
      created: result2.created,
      videoId: result2.video?.id,
      muxFieldsUsed: result2.muxFieldsUsed,
      fallbackUsed: result2.fallbackUsed,
      duplicateInfo: result2.duplicateInfo
    });

    if (duration2 > 2000) {
      console.error('❌ Test 2 took too long - possible infinite loop!');
      return false;
    }

    // Verify results
    if (result1.created && !result2.created) {
      console.log('✅ Circuit breaker test passed - no infinite loop detected');
      
      // Clean up test data
      if (result1.video?.id) {
        await VideoDB.delete(result1.video.id);
        console.log('🧹 Cleaned up test video:', result1.video.id);
      }
      
      return true;
    } else {
      console.error('❌ Unexpected results - logic may still be flawed');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    // Check if it's a circuit breaker activation
    if (error.message.includes('Circuit breaker activated')) {
      console.log('✅ Circuit breaker activated correctly - infinite loop prevented!');
      return true;
    }
    
    return false;
  }
}

async function testCircuitBreaker() {
  console.log('🧪 Testing circuit breaker activation...');
  
  // Create a mock that will always fail to trigger recursion
  const originalFindByMuxAssetId = VideoDB.findByMuxAssetId;
  
  // Mock to always return null (simulating database issues)
  VideoDB.findByMuxAssetId = async () => null;
  
  // Mock create to always throw unique constraint error
  const originalCreate = VideoDB.create;
  VideoDB.create = async () => {
    const error = new Error('duplicate key value violates unique constraint "unique_mux_asset_id"');
    throw error;
  };

  try {
    const testMuxAssetId = 'circuit-breaker-test-' + Date.now();
    const testVideoData = {
      title: 'Circuit Breaker Test',
      filename: 'test.mp4',
      file_path: 'https://example.com/test.mp4',
      file_size: 1000,
      uploaded_by: 'test',
      mux_asset_id: testMuxAssetId
    };

    console.log('🔍 Attempting to trigger circuit breaker...');
    await VideoDB.findOrCreateByMuxAsset(testMuxAssetId, testVideoData);
    
    console.error('❌ Circuit breaker did not activate - this is a problem!');
    return false;
    
  } catch (error) {
    if (error.message.includes('Circuit breaker activated')) {
      console.log('✅ Circuit breaker activated correctly!');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  } finally {
    // Restore original methods
    VideoDB.findByMuxAssetId = originalFindByMuxAssetId;
    VideoDB.create = originalCreate;
  }
}

async function runAllTests() {
  console.log('🚀 Starting infinite loop fix verification tests...\n');
  
  const test1Passed = await testInfiniteLoopFix();
  console.log('');
  
  const test2Passed = await testCircuitBreaker();
  console.log('');
  
  if (test1Passed && test2Passed) {
    console.log('🎉 All tests passed! Infinite loop fix is working correctly.');
    console.log('✅ The system is now protected against infinite loops in video creation.');
  } else {
    console.log('❌ Some tests failed. The infinite loop fix may need additional work.');
  }
  
  process.exit(test1Passed && test2Passed ? 0 : 1);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testInfiniteLoopFix,
  testCircuitBreaker,
  runAllTests
};
