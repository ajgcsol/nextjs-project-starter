/**
 * Critical Path Testing for Infinite Loop Fix
 * Tests the essential functionality to ensure the fix works
 */

const { VideoDB } = require('../src/lib/database');

async function testCriticalPath() {
  console.log('🧪 Starting Critical Path Testing for Infinite Loop Fix...\n');
  
  let testsPassed = 0;
  let testsTotal = 0;
  
  // Test 1: Database Connection
  testsTotal++;
  console.log('🔍 Test 1: Database Connection');
  try {
    const testQuery = await VideoDB.findAll(1, 0);
    console.log('✅ Database connection successful');
    testsPassed++;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }
  
  // Test 2: findByMuxAssetId Method
  testsTotal++;
  console.log('\n🔍 Test 2: findByMuxAssetId Method');
  try {
    const testMuxId = 'test-mux-asset-' + Date.now();
    const result = await VideoDB.findByMuxAssetId(testMuxId);
    console.log('✅ findByMuxAssetId executed without error, result:', result === null ? 'null (expected)' : 'found');
    testsPassed++;
  } catch (error) {
    console.log('❌ findByMuxAssetId failed:', error.message);
  }
  
  // Test 3: Direct Video Creation (No Mux Asset ID)
  testsTotal++;
  console.log('\n🔍 Test 3: Direct Video Creation (No Mux Asset ID)');
  try {
    const testVideo = await VideoDB.create({
      title: 'Test Video - No Mux',
      description: 'Testing direct creation',
      filename: 'test-no-mux.mp4',
      file_path: 'https://example.com/test.mp4',
      file_size: 1000000,
      duration: 120,
      video_quality: 'HD',
      uploaded_by: 'test-user',
      is_processed: true,
      is_public: false
    });
    
    console.log('✅ Direct video creation successful, ID:', testVideo.id);
    testsPassed++;
    
    // Clean up
    await VideoDB.delete(testVideo.id);
    console.log('🧹 Test video cleaned up');
    
  } catch (error) {
    console.log('❌ Direct video creation failed:', error.message);
  }
  
  // Test 4: Video Creation with Mux Asset ID (Circuit Breaker Test)
  testsTotal++;
  console.log('\n🔍 Test 4: Video Creation with Mux Asset ID');
  try {
    const testMuxId = 'test-circuit-breaker-' + Date.now();
    const startTime = Date.now();
    
    const testVideo = await VideoDB.create({
      title: 'Test Video - With Mux',
      description: 'Testing Mux integration',
      filename: 'test-with-mux.mp4',
      file_path: 'https://example.com/test-mux.mp4',
      file_size: 2000000,
      duration: 180,
      video_quality: 'HD',
      uploaded_by: 'test-user',
      is_processed: true,
      is_public: false,
      mux_asset_id: testMuxId,
      mux_playback_id: 'test-playback-id',
      mux_status: 'ready'
    });
    
    const duration = Date.now() - startTime;
    
    if (duration < 5000) { // Should complete quickly, not loop infinitely
      console.log('✅ Mux video creation successful in', duration, 'ms, ID:', testVideo.id);
      testsPassed++;
      
      // Clean up
      await VideoDB.delete(testVideo.id);
      console.log('🧹 Test video cleaned up');
    } else {
      console.log('❌ Video creation took too long (', duration, 'ms) - possible infinite loop');
    }
    
  } catch (error) {
    console.log('❌ Mux video creation failed:', error.message);
  }
  
  // Test 5: Duplicate Mux Asset ID Handling
  testsTotal++;
  console.log('\n🔍 Test 5: Duplicate Mux Asset ID Handling');
  try {
    const duplicateMuxId = 'duplicate-test-' + Date.now();
    
    // Create first video
    const video1 = await VideoDB.create({
      title: 'First Video',
      filename: 'first.mp4',
      file_path: 'https://example.com/first.mp4',
      file_size: 1000000,
      video_quality: 'HD',
      uploaded_by: 'test-user',
      mux_asset_id: duplicateMuxId
    });
    
    console.log('✅ First video created with Mux ID:', video1.id);
    
    // Try to create second video with same Mux Asset ID
    try {
      const video2 = await VideoDB.create({
        title: 'Second Video',
        filename: 'second.mp4',
        file_path: 'https://example.com/second.mp4',
        file_size: 1000000,
        video_quality: 'HD',
        uploaded_by: 'test-user',
        mux_asset_id: duplicateMuxId
      });
      
      console.log('⚠️ Second video created unexpectedly:', video2.id);
      await VideoDB.delete(video2.id);
      
    } catch (duplicateError) {
      if (duplicateError.message.includes('unique') || duplicateError.message.includes('duplicate')) {
        console.log('✅ Duplicate Mux Asset ID properly rejected');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error for duplicate:', duplicateError.message);
      }
    }
    
    // Clean up
    await VideoDB.delete(video1.id);
    console.log('🧹 Test videos cleaned up');
    
  } catch (error) {
    console.log('❌ Duplicate handling test failed:', error.message);
  }
  
  // Summary
  console.log('\n📊 Critical Path Test Results:');
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Tests Failed: ${testsTotal - testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 All critical path tests passed! The infinite loop fix is working correctly.');
    return true;
  } else {
    console.log('\n⚠️ Some tests failed. The fix may need additional work.');
    return false;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCriticalPath().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('💥 Critical path testing failed:', error);
    process.exit(1);
  });
}

module.exports = { testCriticalPath };
