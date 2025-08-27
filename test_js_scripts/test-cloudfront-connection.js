#!/usr/bin/env node

/**
 * CloudFront Connection Testing Script
 * Tests CloudFront distribution configuration and connectivity
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CLOUDFRONT_DOMAIN = 'd24qjgz9z4yzof.cloudfront.net';
const TEST_VIDEO_PATH = 'videos/1755753812326-hh2wuigr39d.wmv';
const S3_BUCKET = 'law-school-repository-content';
const S3_REGION = 'us-east-1';

// Test URLs
const CLOUDFRONT_URL = `https://${CLOUDFRONT_DOMAIN}/${TEST_VIDEO_PATH}`;
const S3_DIRECT_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${TEST_VIDEO_PATH}`;

console.log('🔍 CloudFront Connection Testing Script');
console.log('=====================================\n');

/**
 * Test HTTP/HTTPS connectivity with detailed metrics
 */
async function testConnection(url, description, timeout = 10000) {
  console.log(`🧪 Testing: ${description}`);
  console.log(`📍 URL: ${url}`);
  
  const startTime = performance.now();
  
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'HEAD', // Use HEAD to avoid downloading large files
      timeout: timeout,
      headers: {
        'User-Agent': 'CloudFront-Test-Script/1.0',
        'Accept': '*/*',
        'Range': 'bytes=0-1023' // Test range requests
      }
    };
    
    const req = client.request(options, (res) => {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      console.log(`✅ Response received in ${responseTime}ms`);
      console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`📋 Headers:`);
      
      // Log important headers
      const importantHeaders = [
        'content-type',
        'content-length',
        'accept-ranges',
        'cache-control',
        'server',
        'x-cache',
        'x-amz-cf-id',
        'x-amz-cf-pop',
        'via'
      ];
      
      importantHeaders.forEach(header => {
        if (res.headers[header]) {
          console.log(`   ${header}: ${res.headers[header]}`);
        }
      });
      
      resolve({
        success: true,
        statusCode: res.statusCode,
        responseTime,
        headers: res.headers,
        isCloudFront: !!(res.headers['x-amz-cf-id'] || res.headers['via']),
        supportsRanges: res.headers['accept-ranges'] === 'bytes'
      });
    });
    
    req.on('error', (error) => {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      console.log(`❌ Error after ${responseTime}ms: ${error.message}`);
      console.log(`🔍 Error code: ${error.code}`);
      
      resolve({
        success: false,
        error: error.message,
        errorCode: error.code,
        responseTime
      });
    });
    
    req.on('timeout', () => {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      console.log(`⏰ Timeout after ${responseTime}ms`);
      req.destroy();
      
      resolve({
        success: false,
        error: 'Request timeout',
        responseTime
      });
    });
    
    req.end();
  });
}

/**
 * Test DNS resolution
 */
async function testDNS(hostname) {
  console.log(`🌐 Testing DNS resolution for: ${hostname}`);
  
  const dns = require('dns').promises;
  
  try {
    const startTime = performance.now();
    const addresses = await dns.resolve4(hostname);
    const endTime = performance.now();
    
    console.log(`✅ DNS resolved in ${Math.round(endTime - startTime)}ms`);
    console.log(`📍 IP addresses: ${addresses.join(', ')}`);
    
    return { success: true, addresses, responseTime: Math.round(endTime - startTime) };
  } catch (error) {
    console.log(`❌ DNS resolution failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test TCP connection
 */
async function testTCP(hostname, port = 443) {
  console.log(`🔌 Testing TCP connection to: ${hostname}:${port}`);
  
  const net = require('net');
  
  return new Promise((resolve) => {
    const startTime = performance.now();
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.connect(port, hostname, () => {
      const endTime = performance.now();
      console.log(`✅ TCP connection established in ${Math.round(endTime - startTime)}ms`);
      socket.destroy();
      resolve({ success: true, responseTime: Math.round(endTime - startTime) });
    });
    
    socket.on('error', (error) => {
      const endTime = performance.now();
      console.log(`❌ TCP connection failed after ${Math.round(endTime - startTime)}ms: ${error.message}`);
      resolve({ success: false, error: error.message, responseTime: Math.round(endTime - startTime) });
    });
    
    socket.on('timeout', () => {
      const endTime = performance.now();
      console.log(`⏰ TCP connection timeout after ${Math.round(endTime - startTime)}ms`);
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout', responseTime: Math.round(endTime - startTime) });
    });
  });
}

/**
 * Main testing function
 */
async function runTests() {
  const results = {
    cloudfront: {},
    s3Direct: {},
    dns: {},
    tcp: {}
  };
  
  try {
    // Test 1: DNS Resolution
    console.log('\n🔍 STEP 1: DNS Resolution Tests');
    console.log('================================');
    results.dns.cloudfront = await testDNS(CLOUDFRONT_DOMAIN);
    console.log('');
    results.dns.s3 = await testDNS(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`);
    
    // Test 2: TCP Connection
    console.log('\n🔍 STEP 2: TCP Connection Tests');
    console.log('===============================');
    results.tcp.cloudfront = await testTCP(CLOUDFRONT_DOMAIN, 443);
    console.log('');
    results.tcp.s3 = await testTCP(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`, 443);
    
    // Test 3: CloudFront HTTP Test
    console.log('\n🔍 STEP 3: CloudFront HTTP Tests');
    console.log('================================');
    results.cloudfront = await testConnection(CLOUDFRONT_URL, 'CloudFront Distribution', 15000);
    
    // Test 4: Direct S3 HTTP Test
    console.log('\n🔍 STEP 4: Direct S3 HTTP Tests');
    console.log('===============================');
    results.s3Direct = await testConnection(S3_DIRECT_URL, 'Direct S3 Access', 15000);
    
    // Test 5: Alternative CloudFront paths
    console.log('\n🔍 STEP 5: Alternative CloudFront Paths');
    console.log('======================================');
    const alternativePaths = [
      'videos/',
      'test.txt',
      'favicon.ico'
    ];
    
    for (const path of alternativePaths) {
      const testUrl = `https://${CLOUDFRONT_DOMAIN}/${path}`;
      console.log('');
      await testConnection(testUrl, `CloudFront - ${path}`, 10000);
    }
    
  } catch (error) {
    console.error('❌ Test execution error:', error);
  }
  
  // Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('============================');
  
  console.log('\n🌐 DNS Resolution:');
  console.log(`   CloudFront: ${results.dns.cloudfront?.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   S3 Direct:  ${results.dns.s3?.success ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n🔌 TCP Connectivity:');
  console.log(`   CloudFront: ${results.tcp.cloudfront?.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   S3 Direct:  ${results.tcp.s3?.success ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n📡 HTTP Response:');
  console.log(`   CloudFront: ${results.cloudfront?.success ? '✅ Working' : '❌ Failed'} (${results.cloudfront?.responseTime || 'N/A'}ms)`);
  console.log(`   S3 Direct:  ${results.s3Direct?.success ? '✅ Working' : '❌ Failed'} (${results.s3Direct?.responseTime || 'N/A'}ms)`);
  
  if (results.cloudfront?.success) {
    console.log(`   CloudFront Status: ${results.cloudfront.statusCode}`);
    console.log(`   Is CloudFront: ${results.cloudfront.isCloudFront ? 'Yes' : 'No'}`);
    console.log(`   Supports Ranges: ${results.cloudfront.supportsRanges ? 'Yes' : 'No'}`);
  }
  
  if (results.s3Direct?.success) {
    console.log(`   S3 Status: ${results.s3Direct.statusCode}`);
    console.log(`   Supports Ranges: ${results.s3Direct.supportsRanges ? 'Yes' : 'No'}`);
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('==================');
  
  if (results.cloudfront?.success && results.s3Direct?.success) {
    const cfTime = results.cloudfront.responseTime;
    const s3Time = results.s3Direct.responseTime;
    
    if (cfTime < s3Time) {
      console.log('✅ CloudFront is working and faster than direct S3');
      console.log('   → Recommendation: Use CloudFront for video delivery');
    } else {
      console.log('⚠️  CloudFront is working but slower than direct S3');
      console.log('   → Recommendation: Consider using direct S3 or investigate CloudFront config');
    }
  } else if (results.cloudfront?.success) {
    console.log('✅ CloudFront is working, S3 direct access has issues');
    console.log('   → Recommendation: Use CloudFront for video delivery');
  } else if (results.s3Direct?.success) {
    console.log('❌ CloudFront is not working, but S3 direct access works');
    console.log('   → Recommendation: Use direct S3 URLs until CloudFront is fixed');
  } else {
    console.log('❌ Both CloudFront and S3 direct access are failing');
    console.log('   → Recommendation: Check AWS credentials and network connectivity');
  }
  
  // Error analysis
  if (!results.cloudfront?.success) {
    console.log('\n🔍 CloudFront Error Analysis:');
    console.log(`   Error: ${results.cloudfront?.error || 'Unknown'}`);
    console.log(`   Error Code: ${results.cloudfront?.errorCode || 'N/A'}`);
    
    if (results.cloudfront?.errorCode === 'ENOTFOUND') {
      console.log('   → DNS resolution failed - CloudFront domain may not exist');
    } else if (results.cloudfront?.errorCode === 'ECONNREFUSED') {
      console.log('   → Connection refused - CloudFront may be misconfigured');
    } else if (results.cloudfront?.error === 'Request timeout') {
      console.log('   → Request timeout - CloudFront may be slow or overloaded');
    }
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  
  if (results.cloudfront?.success) {
    console.log('1. CloudFront is working - update your application to use CloudFront URLs');
    console.log('2. Test with actual video files to ensure streaming works properly');
    console.log('3. Monitor CloudFront performance vs direct S3 access');
  } else {
    console.log('1. CloudFront is not working - use direct S3 URLs as implemented');
    console.log('2. Investigate CloudFront distribution configuration');
    console.log('3. Check AWS CloudFront console for distribution status');
    console.log('4. Verify CloudFront domain name and distribution settings');
  }
  
  console.log('\n✅ Test completed successfully!');
}

// Run the tests
runTests().catch(console.error);
