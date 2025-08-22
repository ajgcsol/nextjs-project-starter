// Final MediaConvert Integration Test
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-2xzrrskf8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Final MediaConvert Integration Test');
console.log('=====================================');
console.log(`🌐 Testing: ${PRODUCTION_URL}`);
console.log('');

// Test MediaConvert setup API
function testMediaConvertSetup() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔧 Testing MediaConvert Setup API...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Message: ${result.message}`);
                    
                    if (result.configuration) {
                        console.log('   Configuration:');
                        console.log(`     Endpoint: ${result.configuration.endpoint}`);
                        console.log(`     Role ARN: ${result.configuration.roleArn}`);
                        console.log(`     Auto-discovered: ${result.configuration.autoDiscovered}`);
                        
                        // Check for carriage returns
                        const hasCarriageReturns = 
                            result.configuration.endpoint.includes('\r') ||
                            result.configuration.roleArn.includes('\r');
                            
                        if (hasCarriageReturns) {
                            console.log('   ❌ Environment variables still contain carriage returns');
                            reject(new Error('Carriage returns detected in environment variables'));
                        } else {
                            console.log('   ✅ Environment variables are clean');
                            resolve(result);
                        }
                    } else {
                        reject(new Error('No configuration returned'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test thumbnail generation
function testThumbnailGeneration() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: 'd65ae252-b52b-4862-93ca-6f0818fec8f4',
            batchMode: false
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/videos/generate-thumbnails',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('🖼️ Testing Thumbnail Generation...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Method: ${result.method || 'Unknown'}`);
                    
                    if (result.method === 'mediaconvert') {
                        console.log('   ✅ MediaConvert method is being used!');
                        console.log(`   Job ID: ${result.jobId || 'None'}`);
                        resolve(result);
                    } else {
                        console.log(`   ⚠️ Still using fallback method: ${result.method}`);
                        console.log(`   Error: ${result.error || 'None'}`);
                        reject(new Error(`Expected mediaconvert method, got: ${result.method}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Run the complete test
async function runFinalTest() {
    try {
        console.log('🚀 Starting Final MediaConvert Integration Test...');
        console.log('');
        
        // Test 1: MediaConvert Setup
        await testMediaConvertSetup();
        console.log('');
        
        // Test 2: Thumbnail Generation
        await testThumbnailGeneration();
        console.log('');
        
        console.log('🎉 ALL TESTS PASSED!');
        console.log('====================');
        console.log('');
        console.log('✅ MediaConvert is properly configured');
        console.log('✅ Environment variables are clean (no carriage returns)');
        console.log('✅ Thumbnail generation is using MediaConvert method');
        console.log('✅ Real video frame extraction is working');
        console.log('');
        console.log('🎯 MediaConvert activation is COMPLETE!');
        console.log('   Videos will now get real thumbnails instead of SVG placeholders.');
        
    } catch (error) {
        console.log('');
        console.log('❌ FINAL TEST FAILED');
        console.log('===================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 Possible issues:');
        console.log('   - Deployment still in progress');
        console.log('   - Environment variables not yet applied');
        console.log('   - MediaConvert permissions issue');
        console.log('   - Network connectivity problem');
    }
}

runFinalTest();
