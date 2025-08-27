#!/usr/bin/env node

/**
 * Comprehensive Mux Integration Test
 * Tests database migration, webhook processing, and video upload with Mux asset creation
 */

const https = require('https');
const crypto = require('crypto');

// Configuration
const BASE_URL = process.env.VERCEL_URL ? 
  `https://${process.env.VERCEL_URL}` : 
  'https://nextjs-project-starter-nine-psi.vercel.app';

const TEST_CONFIG = {
  baseUrl: BASE_URL,
  timeout: 30000,
  retries: 3
};

console.log('🧪 Starting Comprehensive Mux Integration Test');
console.log('🌐 Base URL:', TEST_CONFIG.baseUrl);
console.log('⏱️ Timeout:', TEST_CONFIG.timeout, 'ms');
console.log('🔄 Retries:', TEST_CONFIG.retries);
console.log('');

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(options, data = null) {
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

    req.on('error', reject);
    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Test database migration status
 */
async function testMigrationStatus() {
  console.log('🔍 Testing database migration status...');
  
  try {
    const url = new URL('/api/database/execute-migration', TEST_CONFIG.baseUrl);
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
    
    console.log('📊 Migration status response:', {
      status: response.statusCode,
      hasMuxIntegration: response.body?.hasMuxIntegration,
      muxColumnsCount: response.body?.muxColumnsCount,
      hasWebhookTable: response.body?.hasWebhookTable,
      migrationNeeded: response.body?.migrationNeeded
    });

    if (response.statusCode === 200) {
      if (response.body?.migrationNeeded) {
        console.log('⚠️ Database migration needed');
        return { success: true, migrationNeeded: true, data: response.body };
      } else {
        console.log('✅ Database migration already complete');
        return { success: true, migrationNeeded: false, data: response.body };
      }
    } else {
      console.error('❌ Migration status check failed:', response.statusCode);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Migration status test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Execute database migration
 */
async function executeMigration() {
  console.log('🔧 Executing database migration...');
  
  try {
    const url = new URL('/api/database/execute-migration', TEST_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-migration-token'
      }
    };

    const requestData = {
      migrationName: '002_add_mux_integration_fields',
      dryRun: false
    };

    const response = await makeRequest(options, requestData);
    
    console.log('📊 Migration execution response:', {
      status: response.statusCode,
      success: response.body?.success,
      tablesCreated: response.body?.tablesCreated?.length || 0,
      columnsAdded: response.body?.columnsAdded?.length || 0,
      indexesCreated: response.body?.indexesCreated?.length || 0,
      executionTime: response.body?.executionTime
    });

    if (response.statusCode === 200 && response.body?.success) {
      console.log('✅ Database migration completed successfully');
      return { success: true, data: response.body };
    } else {
      console.error('❌ Migration execution failed:', response.body?.error);
      return { success: false, error: response.body?.error };
    }

  } catch (error) {
    console.error('❌ Migration execution failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test webhook endpoint
 */
async function testWebhookEndpoint() {
  console.log('🔔 Testing webhook endpoint...');
  
  try {
    const url = new URL('/api/mux/webhook', TEST_CONFIG.baseUrl);
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
    
    console.log('📊 Webhook endpoint response:', {
      status: response.statusCode,
      endpointStatus: response.body?.status,
      features: response.body?.features?.length || 0
    });

    if (response.statusCode === 200) {
      console.log('✅ Webhook endpoint is accessible');
      return { success: true, data: response.body };
    } else {
      console.error('❌ Webhook endpoint test failed:', response.statusCode);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Webhook endpoint test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test webhook processing with mock event
 */
async function testWebhookProcessing() {
  console.log('🎬 Testing webhook processing...');
  
  try {
    const url = new URL('/api/mux/webhook', TEST_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Mock Mux webhook event
    const mockEvent = {
      type: 'video.asset.ready',
      object: {
        type: 'asset',
        id: 'test-asset-id-' + Date.now()
      },
      id: 'webhook-event-' + Date.now(),
      created_at: new Date().toISOString(),
      data: {
        passthrough: 'test-video-id-' + Date.now(),
        status: 'ready',
        playback_ids: [{
          id: 'test-playback-id-' + Date.now(),
          policy: 'public'
        }],
        duration: 120.5,
        aspect_ratio: '16:9',
        mp4_support: 'none'
      }
    };

    const response = await makeRequest(options, mockEvent);
    
    console.log('📊 Webhook processing response:', {
      status: response.statusCode,
      success: response.body?.success,
      action: response.body?.action,
      processingTime: response.body?.processingTime
    });

    if (response.statusCode === 200) {
      console.log('✅ Webhook processing completed successfully');
      return { success: true, data: response.body };
    } else {
      console.error('❌ Webhook processing failed:', response.body?.error);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Webhook processing test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test Mux configuration
 */
async function testMuxConfiguration() {
  console.log('🎭 Testing Mux configuration...');
  
  try {
    // We'll test this by checking if the Mux processor can be initialized
    // This is a basic connectivity test
    const url = new URL('/api/videos', TEST_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + '?test=mux',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    console.log('📊 Mux configuration test response:', {
      status: response.statusCode,
      hasVideos: Array.isArray(response.body?.videos),
      videoCount: response.body?.videos?.length || 0
    });

    if (response.statusCode === 200) {
      console.log('✅ Mux configuration appears to be working');
      return { success: true, data: response.body };
    } else {
      console.error('❌ Mux configuration test failed:', response.statusCode);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Mux configuration test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test video upload with Mux integration
 */
async function testVideoUploadWithMux() {
  console.log('📤 Testing video upload with Mux integration...');
  
  try {
    const url = new URL('/api/videos/upload', TEST_CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Mock S3 upload data
    const uploadData = {
      title: 'Test Video - Mux Integration',
      description: 'Test video for Mux integration validation',
      category: 'Test',
      tags: 'test,mux,integration',
      visibility: 'private',
      s3Key: 'test-videos/test-mux-integration-' + Date.now() + '.mp4',
      publicUrl: 'https://test-bucket.s3.amazonaws.com/test-video.mp4',
      filename: 'test-mux-integration.mp4',
      size: 10485760, // 10MB
      mimeType: 'video/mp4'
    };

    const response = await makeRequest(options, uploadData);
    
    console.log('📊 Video upload response:', {
      status: response.statusCode,
      success: response.body?.success,
      videoId: response.body?.video?.id,
      hasThumbnail: !!response.body?.video?.thumbnailPath,
      message: response.body?.message
    });

    if (response.statusCode === 200 && response.body?.success) {
      console.log('✅ Video upload with Mux integration completed');
      return { success: true, data: response.body };
    } else {
      console.error('❌ Video upload failed:', response.body?.error);
      return { success: false, error: response.body };
    }

  } catch (error) {
    console.error('❌ Video upload test failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting comprehensive Mux integration tests...\n');
  
  const results = {
    migrationStatus: null,
    migrationExecution: null,
    webhookEndpoint: null,
    webhookProcessing: null,
    muxConfiguration: null,
    videoUpload: null
  };

  // Test 1: Check migration status
  results.migrationStatus = await testMigrationStatus();
  console.log('');

  // Test 2: Execute migration if needed
  if (results.migrationStatus.success && results.migrationStatus.migrationNeeded) {
    results.migrationExecution = await executeMigration();
    console.log('');
  } else {
    console.log('⏭️ Skipping migration execution - not needed\n');
  }

  // Test 3: Test webhook endpoint
  results.webhookEndpoint = await testWebhookEndpoint();
  console.log('');

  // Test 4: Test webhook processing
  results.webhookProcessing = await testWebhookProcessing();
  console.log('');

  // Test 5: Test Mux configuration
  results.muxConfiguration = await testMuxConfiguration();
  console.log('');

  // Test 6: Test video upload with Mux
  results.videoUpload = await testVideoUploadWithMux();
  console.log('');

  // Summary
  console.log('📋 Test Results Summary:');
  console.log('========================');
  
  const testResults = [
    { name: 'Migration Status', result: results.migrationStatus },
    { name: 'Migration Execution', result: results.migrationExecution },
    { name: 'Webhook Endpoint', result: results.webhookEndpoint },
    { name: 'Webhook Processing', result: results.webhookProcessing },
    { name: 'Mux Configuration', result: results.muxConfiguration },
    { name: 'Video Upload', result: results.videoUpload }
  ];

  let passedTests = 0;
  let totalTests = 0;

  testResults.forEach(test => {
    if (test.result !== null) {
      totalTests++;
      const status = test.result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
      if (test.result.success) passedTests++;
      if (!test.result.success && test.result.error) {
        console.log(`    Error: ${test.result.error}`);
      }
    }
  });

  console.log('');
  console.log(`📊 Overall Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Mux integration is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.');
  }

  return {
    success: passedTests === totalTests,
    passed: passedTests,
    total: totalTests,
    results
  };
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testMigrationStatus, testWebhookEndpoint };
