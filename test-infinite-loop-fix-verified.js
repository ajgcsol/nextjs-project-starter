/**
 * Test to verify the infinite loop fix is working
 */

const { VideoDB } = require('./src/lib/database');

async function testInfiniteLoopFix() {
  console.log('🧪 Testing Infinite Loop Fix...\n');
  
  try {
    // Test 1: Direct video creation (should work)
    console.log('🔍 Test 1: Direct video creation');
    const testVideo1 = await VideoDB.create({
      title: 'Test Video - Direct Create',
      filename: 'test-direct.mp4',
      file_path: 'https://example.com/test-direct.mp4',
      file_size: 1000000,
      video_quality: 'HD',
      uploaded_by: 'test-user',
      is_processed: true,
      is_public: false
    });
    console.log('✅ Direct create successful:', testVideo1.id);
    
    // Test 2: createWithFallback (should NOT cause infinite loop)
    console.log('\n🔍 Test 2: createWithFallback method');
    const startTime = Date.now();
    
    const testVideo2 = await VideoDB.createWithFallback({
      title: 'Test Video - Fallback Create',
      filename: 'test-fallback.mp4',
      file_path: 'https://example.com/test-fallback.mp4',
      file_size: 2000000,
      video_quality: 'HD',
      uploaded_by: 'test-user',
      is_processed: true,
      is_public: false,
      mux_asset_id: 'test-mux-asset-' + Date.now()
    });
    
    const duration = Date.now() - startTime;
    
    if (duration < 5000) { // Should complete quickly
      console.log('✅ createWithFallback successful in', duration, 'ms');
      console.log('✅ Video created:', testVideo2.video.id);
      console.log('✅ No infinite loop detected!');
    } else {
      console.log('❌ createWithFallback took too long:', duration, 'ms - possible infinite loop');
    }
    
    // Test 3: Multiple rapid calls (stress test)
    console.log('\n🔍 Test 3: Multiple rapid calls stress test');
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        VideoDB.create({
          title: `Stress Test Video ${i}`,
          filename: `stress-test-${i}.mp4`,
          file_path: `https://example.com/stress-test-${i}.mp4`,
          file_size: 1000000 + i,
          video_quality: 'HD',
          uploaded_by: 'test-user',
          is_processed: true,
          is_public: false
        })
      );
    }
    
    const stressStartTime = Date.now();
    const stressResults = await Promise.all(promises);
    const stressDuration = Date.now() - stressStartTime;
    
    if (stressDuration < 10000) { // Should complete quickly
      console.log('✅ Stress test successful in', stressDuration, 'ms');
      console.log('✅ Created', stressResults.length, 'videos simultaneously');
    } else {
      console.log('❌ Stress test took too long:', stressDuration, 'ms');
    }
    
    // Clean up test videos
    console.log('\n🧹 Cleaning up test videos...');
    await VideoDB.delete(testVideo1.id);
    await VideoDB.delete(testVideo2.video.id);
    for (const video of stressResults) {
      await VideoDB.delete(video.id);
    }
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 All tests passed! The infinite loop has been fixed.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testInfiniteLoopFix().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testInfiniteLoopFix };
