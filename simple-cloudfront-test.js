const https = require('https');

console.log('🔍 Simple CloudFront Test');
console.log('========================');

const CLOUDFRONT_URL = 'https://d24qjgz9z4yzof.cloudfront.net/videos/1755753812326-hh2wuigr39d.wmv';
const S3_URL = 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/videos/1755753812326-hh2wuigr39d.wmv';

function testUrl(url, name) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing ${name}:`);
    console.log(`📍 URL: ${url}`);
    
    const startTime = Date.now();
    
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      const responseTime = Date.now() - startTime;
      console.log(`✅ ${name} Response: ${res.statusCode} in ${responseTime}ms`);
      console.log(`📋 Headers: ${JSON.stringify(res.headers, null, 2)}`);
      resolve({ success: true, statusCode: res.statusCode, responseTime });
    });
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`❌ ${name} Error: ${error.message} after ${responseTime}ms`);
      resolve({ success: false, error: error.message, responseTime });
    });
    
    req.on('timeout', () => {
      const responseTime = Date.now() - startTime;
      console.log(`⏰ ${name} Timeout after ${responseTime}ms`);
      req.destroy();
      resolve({ success: false, error: 'timeout', responseTime });
    });
    
    req.end();
  });
}

async function runTest() {
  try {
    const cfResult = await testUrl(CLOUDFRONT_URL, 'CloudFront');
    const s3Result = await testUrl(S3_URL, 'Direct S3');
    
    console.log('\n📊 SUMMARY:');
    console.log(`CloudFront: ${cfResult.success ? '✅ Working' : '❌ Failed'} (${cfResult.responseTime}ms)`);
    console.log(`Direct S3:  ${s3Result.success ? '✅ Working' : '❌ Failed'} (${s3Result.responseTime}ms)`);
    
    if (cfResult.success && s3Result.success) {
      console.log('\n💡 Both work! CloudFront vs S3 performance:');
      console.log(`CloudFront: ${cfResult.responseTime}ms`);
      console.log(`Direct S3:  ${s3Result.responseTime}ms`);
      console.log(`Winner: ${cfResult.responseTime < s3Result.responseTime ? 'CloudFront' : 'Direct S3'}`);
    } else if (cfResult.success) {
      console.log('\n💡 Use CloudFront - it works and S3 direct has issues');
    } else if (s3Result.success) {
      console.log('\n💡 Use Direct S3 - CloudFront is not working');
    } else {
      console.log('\n💡 Both failed - check network/AWS configuration');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
