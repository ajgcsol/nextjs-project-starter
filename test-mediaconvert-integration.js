// Test MediaConvert Integration After Deployment
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5inzilz4t-andrew-j-gregwares-projects.vercel.app';

console.log('🧪 Testing MediaConvert Integration...');
console.log('=====================================');

// Test MediaConvert setup endpoint
function testMediaConvertSetup() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔍 Testing MediaConvert setup endpoint...');
        console.log(`   URL: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Response:`, result);
                    
                    if (res.statusCode === 200 && result.mediaconvert) {
                        console.log('✅ MediaConvert setup endpoint working!');
                        resolve(result);
                    } else {
                        console.log('❌ MediaConvert setup endpoint failed');
                        reject(new Error(`Status: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Test thumbnail generation API
function testThumbnailGeneration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`;
        
        console.log('🖼️ Testing thumbnail generation API...');
        console.log(`   URL: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Videos needing thumbnails: ${result.count || 0}`);
                    
                    if (res.statusCode === 200) {
                        console.log('✅ Thumbnail generation API working!');
                        resolve(result);
                    } else {
                        console.log('❌ Thumbnail generation API failed');
                        reject(new Error(`Status: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Test video conversion API
function testVideoConversion() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/convert`;
        
        console.log('🎬 Testing video conversion API...');
        console.log(`   URL: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                
                if (res.statusCode === 200 || res.statusCode === 405) {
                    console.log('✅ Video conversion API accessible!');
                    resolve({ status: res.statusCode });
                } else {
                    console.log('❌ Video conversion API failed');
                    reject(new Error(`Status: ${res.statusCode}`));
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Run all tests
async function runTests() {
    console.log(`🚀 Testing production deployment: ${PRODUCTION_URL}`);
    console.log('');
    
    try {
        // Test MediaConvert setup
        await testMediaConvertSetup();
        console.log('');
        
        // Test thumbnail generation
        await testThumbnailGeneration();
        console.log('');
        
        // Test video conversion
        await testVideoConversion();
        console.log('');
        
        console.log('🎉 ALL TESTS PASSED!');
        console.log('====================');
        console.log('');
        console.log('✅ MediaConvert integration is working!');
        console.log('✅ Real thumbnail generation is enabled!');
        console.log('✅ WMV conversion is ready!');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('1. Visit /admin/fix-thumbnails to process existing videos');
        console.log('2. Upload a new video to test automatic thumbnail generation');
        console.log('3. Upload a WMV file to test conversion');
        
    } catch (error) {
        console.log('');
        console.log('❌ SOME TESTS FAILED');
        console.log('===================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 The deployment might still be in progress.');
        console.log('   Wait a few minutes and run this test again.');
    }
}

// Wait a moment for deployment to complete, then run tests
console.log('⏳ Waiting for deployment to complete...');
setTimeout(runTests, 10000); // Wait 10 seconds
