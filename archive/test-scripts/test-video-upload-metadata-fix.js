#!/usr/bin/env node

/**
 * Test Video Upload Metadata Fix
 * This script tests the fixed database layer with proper data type conversion
 */

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-3w058uf8w-andrew-j-gregwares-projects.vercel.app';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Video-Upload-Metadata-Fix-Test/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testVideoUploadMetadataFix() {
  console.log('🧪 Testing Video Upload Metadata Fix...');
  console.log('🌐 Production URL:', PRODUCTION_URL);
  console.log('='.repeat(80));
  
  try {
    // Test 1: Database health check
    console.log('\n📊 Test 1: Database Health Check');
    const healthCheck = await makeRequest('/api/database/health');
    console.log('Status:', healthCheck.status);
    console.log('Response:', JSON.stringify(healthCheck.data, null, 2));
    
    if (healthCheck.status !== 200) {
      console.log('❌ Database health check failed - aborting tests');
      return;
    }
    
    // Test 2: Apply database migration (ensure Mux columns exist)
    console.log('\n🗄️ Test 2: Database Migration');
    const migrationResult = await makeRequest('/api/database/migrate-mux-fixed', 'POST');
    console.log('Status:', migrationResult.status);
    console.log('Response:', JSON.stringify(migrationResult.data, null, 2));
    
    // Test 3: Video upload with decimal duration (the problematic case)
    console.log('\n🎬 Test 3: Video Upload with Decimal Duration (Critical Test)');
    
    const testVideoData = {
      title: 'Metadata Fix Test - Decimal Duration',
      description: 'Testing video upload with decimal duration from Mux',
      category: 'Test',
      tags: 'test,metadata,fix,decimal,duration',
      visibility: 'private',
      s3Key: 'test/decimal-duration-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/decimal-duration-test.mp4',
      filename: 'decimal-duration-test.mp4',
      size: 71638476, // Same size as the failing upload
      mimeType: 'video/mp4',
      autoThumbnail: null,
      // Simulate Mux data with decimal duration (the exact issue from logs)
      muxData: {
        duration: 59.242667, // This was causing the error
        aspectRatio: '959:599',
        assetId: 'test-asset-decimal-duration',
        playbackId: 'test-playback-decimal-duration'
      }
    };
    
    const uploadTest = await makeRequest('/api/videos/upload', 'POST', testVideoData);
    console.log('Status:', uploadTest.status);
    console.log('Response:', JSON.stringify(uploadTest.data, null, 2));
    
    // Test 4: Video upload with integer duration (should work)
    console.log('\n🎬 Test 4: Video Upload with Integer Duration (Control Test)');
    
    const controlVideoData = {
      title: 'Metadata Fix Test - Integer Duration',
      description: 'Testing video upload with integer duration',
      category: 'Test',
      tags: 'test,metadata,fix,integer,duration',
      visibility: 'private',
      s3Key: 'test/integer-duration-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/integer-duration-test.mp4',
      filename: 'integer-duration-test.mp4',
      size: 50000000, // 50MB
      mimeType: 'video/mp4',
      autoThumbnail: null,
      muxData: {
        duration: 45, // Integer duration
        aspectRatio: '16:9',
        assetId: 'test-asset-integer-duration',
        playbackId: 'test-playback-integer-duration'
      }
    };
    
    const controlTest = await makeRequest('/api/videos/upload', 'POST', controlVideoData);
    console.log('Status:', controlTest.status);
    console.log('Response:', JSON.stringify(controlTest.data, null, 2));
    
    // Test 5: Video upload with extreme decimal duration
    console.log('\n🎬 Test 5: Video Upload with Extreme Decimal Duration (Edge Case)');
    
    const extremeVideoData = {
      title: 'Metadata Fix Test - Extreme Decimal',
      description: 'Testing video upload with very precise decimal duration',
      category: 'Test',
      tags: 'test,metadata,fix,extreme,decimal',
      visibility: 'private',
      s3Key: 'test/extreme-decimal-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/extreme-decimal-test.mp4',
      filename: 'extreme-decimal-test.mp4',
      size: 25000000, // 25MB
      mimeType: 'video/mp4',
      autoThumbnail: null,
      muxData: {
        duration: 123.456789123456, // Very precise decimal
        aspectRatio: '1920:1080',
        assetId: 'test-asset-extreme-decimal',
        playbackId: 'test-playback-extreme-decimal'
      }
    };
    
    const extremeTest = await makeRequest('/api/videos/upload', 'POST', extremeVideoData);
    console.log('Status:', extremeTest.status);
    console.log('Response:', JSON.stringify(extremeTest.data, null, 2));
    
    // Test 6: Video upload without Mux data (fallback test)
    console.log('\n🎬 Test 6: Video Upload without Mux Data (Fallback Test)');
    
    const fallbackVideoData = {
      title: 'Metadata Fix Test - No Mux Data',
      description: 'Testing video upload without Mux processing',
      category: 'Test',
      tags: 'test,metadata,fix,fallback',
      visibility: 'private',
      s3Key: 'test/no-mux-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/no-mux-test.mp4',
      filename: 'no-mux-test.mp4',
      size: 15000000, // 15MB
      mimeType: 'video/mp4',
      autoThumbnail: null
      // No muxData - should use fallback
    };
    
    const fallbackTest = await makeRequest('/api/videos/upload', 'POST', fallbackVideoData);
    console.log('Status:', fallbackTest.status);
    console.log('Response:', JSON.stringify(fallbackTest.data, null, 2));
    
    // Summary
    console.log('\n📋 Test Results Summary');
    console.log('='.repeat(80));
    
    const tests = [
      { name: 'Database Health Check', result: healthCheck },
      { name: 'Database Migration', result: migrationResult },
      { name: 'Decimal Duration Upload', result: uploadTest },
      { name: 'Integer Duration Upload', result: controlTest },
      { name: 'Extreme Decimal Upload', result: extremeTest },
      { name: 'Fallback Upload', result: fallbackTest }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach((test, index) => {
      const passed = test.result.status === 200 && 
                    (test.result.data.success !== false) && 
                    !test.result.data.error;
      
      console.log(`${index + 1}. ${test.name}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!passed) {
        console.log(`   Status: ${test.result.status}`);
        if (test.result.data.error) {
          console.log(`   Error: ${test.result.data.error}`);
        }
        if (test.result.data.details) {
          console.log(`   Details: ${test.result.data.details}`);
        }
      } else {
        passedTests++;
      }
    });
    
    console.log('='.repeat(80));
    console.log(`📊 Overall Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Video upload metadata fix is working correctly.');
      console.log('✅ Decimal duration conversion is working');
      console.log('✅ Database migration is successful');
      console.log('✅ Fallback handling is working');
    } else {
      console.log('⚠️ Some tests failed. Review the errors above.');
      
      // Specific analysis for the critical decimal duration test
      if (uploadTest.status !== 200 || uploadTest.data.error) {
        console.log('\n🔍 Critical Issue Analysis:');
        console.log('The decimal duration test failed, which means the core issue is not resolved.');
        
        if (uploadTest.data.error && uploadTest.data.error.includes('invalid input syntax for type integer')) {
          console.log('❌ Data type conversion is still failing');
          console.log('💡 The database layer fix may not be deployed yet');
        } else if (uploadTest.data.error && uploadTest.data.error.includes('does not exist')) {
          console.log('❌ Database migration has not been applied');
          console.log('💡 Run the database migration first');
        } else {
          console.log('❌ Unknown error occurred');
          console.log('💡 Check the detailed error messages above');
        }
      }
    }
    
    // Additional diagnostic information
    console.log('\n🔧 Diagnostic Information:');
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Test timestamp: ${new Date().toISOString()}`);
    console.log(`Node.js version: ${process.version}`);
    
  } catch (error) {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  }
}

// Run the test
testVideoUploadMetadataFix().then(() => {
  console.log('\n✅ Test script completed');
}).catch((error) => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
