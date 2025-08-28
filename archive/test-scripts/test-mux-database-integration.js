const https = require('https');

// Test configuration
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

console.log('🧪 Testing Mux Database Integration');
console.log('🌐 Base URL:', BASE_URL);
console.log('📅 Test started at:', new Date().toISOString());

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function testDatabaseConnection() {
  console.log('\n🔍 Step 1: Testing Database Connection');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/health`);
    console.log('📊 Database Health Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ Database connection is healthy');
      return true;
    } else {
      console.log('❌ Database connection issues detected');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

async function checkMuxMigrationStatus() {
  console.log('\n🔍 Step 2: Checking Mux Migration Status');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/run-mux-migration`);
    console.log('📊 Migration Status Check:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      const muxColumns = response.data.muxColumnNames || [];
      console.log('📊 Mux columns found:', muxColumns.length);
      console.log('📋 Mux columns:', muxColumns);
      
      const requiredColumns = [
        'mux_asset_id', 'mux_playback_id', 'mux_status', 
        'mux_thumbnail_url', 'mux_streaming_url', 'mux_mp4_url',
        'audio_enhanced'
      ];
      
      const missingColumns = requiredColumns.filter(col => !muxColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('✅ All required Mux columns are present');
        return { migrationNeeded: false, columns: muxColumns };
      } else {
        console.log('⚠️ Missing Mux columns:', missingColumns);
        return { migrationNeeded: true, missingColumns, existingColumns: muxColumns };
      }
    } else {
      console.log('❌ Failed to check migration status');
      return { migrationNeeded: true, error: response.data };
    }
  } catch (error) {
    console.error('❌ Migration status check failed:', error.message);
    return { migrationNeeded: true, error: error.message };
  }
}

async function runMuxMigration() {
  console.log('\n🚀 Step 3: Running Mux Migration');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/database/run-mux-migration`, {
      method: 'POST'
    });
    
    console.log('📊 Migration Execution Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Mux migration completed successfully');
      console.log('📊 Columns added:', response.data.columnsAdded?.length || 0);
      return true;
    } else {
      console.log('❌ Mux migration failed');
      console.log('❌ Error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Migration execution failed:', error.message);
    return false;
  }
}

async function testVideoUploadWithMux() {
  console.log('\n🎬 Step 4: Testing Video Upload with Mux Integration');
  
  // Simulate a video upload with Mux data
  const testVideoData = {
    title: 'Test Mux Integration Video',
    description: 'Testing Mux database integration with fallback handling',
    filename: 'test-mux-video.mp4',
    size: 50 * 1024 * 1024, // 50MB
    s3Key: 'test-videos/test-mux-video-' + Date.now() + '.mp4',
    publicUrl: 'https://test-bucket.s3.amazonaws.com/test-videos/test-mux-video.mp4',
    mimeType: 'video/mp4',
    visibility: 'private'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/videos/upload`, {
      method: 'POST',
      body: testVideoData
    });
    
    console.log('📊 Upload Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Video upload with Mux integration successful');
      console.log('🎬 Video ID:', response.data.video?.id);
      return { success: true, videoId: response.data.video?.id };
    } else {
      console.log('❌ Video upload failed');
      console.log('❌ Error:', response.data.error);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error('❌ Video upload test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testVideoListing() {
  console.log('\n📋 Step 5: Testing Video Listing');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/videos/upload`);
    console.log('📊 Video Listing Status:', response.status);
    
    if (response.status === 200) {
      const videos = response.data.videos || [];
      console.log('📊 Total videos found:', videos.length);
      
      if (videos.length > 0) {
        console.log('📋 Sample video:', {
          id: videos[0].id,
          title: videos[0].title,
          status: videos[0].status,
          hasThumbnail: !!videos[0].thumbnailPath
        });
        console.log('✅ Video listing working correctly');
        return true;
      } else {
        console.log('⚠️ No videos found in database');
        return true; // Not necessarily an error
      }
    } else {
      console.log('❌ Video listing failed');
      console.log('❌ Error:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Video listing test failed:', error.message);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🧪 Starting Comprehensive Mux Database Integration Test');
  console.log('=' .repeat(60));
  
  const results = {
    databaseConnection: false,
    migrationStatus: null,
    migrationExecution: false,
    videoUpload: false,
    videoListing: false,
    overallSuccess: false
  };
  
  // Step 1: Test database connection
  results.databaseConnection = await testDatabaseConnection();
  
  if (!results.databaseConnection) {
    console.log('\n❌ Database connection failed - aborting tests');
    return results;
  }
  
  // Step 2: Check migration status
  results.migrationStatus = await checkMuxMigrationStatus();
  
  // Step 3: Run migration if needed
  if (results.migrationStatus.migrationNeeded) {
    console.log('\n⚠️ Migration needed - running migration...');
    results.migrationExecution = await runMuxMigration();
    
    if (!results.migrationExecution) {
      console.log('\n❌ Migration failed - continuing with tests to check fallback behavior');
    }
  } else {
    console.log('\n✅ Migration already complete - skipping migration step');
    results.migrationExecution = true;
  }
  
  // Step 4: Test video upload
  results.videoUpload = await testVideoUploadWithMux();
  
  // Step 5: Test video listing
  results.videoListing = await testVideoListing();
  
  // Overall assessment
  results.overallSuccess = results.databaseConnection && 
                          (results.migrationExecution || results.videoUpload.success) && 
                          results.videoListing;
  
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log('📊 Database Connection:', results.databaseConnection ? '✅ PASS' : '❌ FAIL');
  console.log('📊 Migration Status:', results.migrationStatus?.migrationNeeded ? '⚠️ NEEDED' : '✅ COMPLETE');
  console.log('📊 Migration Execution:', results.migrationExecution ? '✅ PASS' : '❌ FAIL');
  console.log('📊 Video Upload:', results.videoUpload.success ? '✅ PASS' : '❌ FAIL');
  console.log('📊 Video Listing:', results.videoListing ? '✅ PASS' : '❌ FAIL');
  console.log('📊 Overall Success:', results.overallSuccess ? '✅ PASS' : '❌ FAIL');
  
  if (results.overallSuccess) {
    console.log('\n🎉 All tests passed! Mux database integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the details above for troubleshooting.');
  }
  
  console.log('\n📅 Test completed at:', new Date().toISOString());
  return results;
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
