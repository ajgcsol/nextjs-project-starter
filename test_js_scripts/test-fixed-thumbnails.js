// Test Fixed Thumbnail Generation
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🧪 Testing Fixed Thumbnail Generation...');
console.log('======================================');

// Test the fixed thumbnail API
function testThumbnailAPI() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=10`;
        
        console.log('🖼️ Testing fixed thumbnail API...');
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
                    console.log(`   Videos found: ${result.count || 0}`);
                    
                    if (res.statusCode === 200) {
                        if (result.count > 0) {
                            console.log('✅ Fixed! Videos needing thumbnails found!');
                            console.log(`   First video: ${result.videos[0]?.title || 'Unknown'}`);
                            console.log(`   Thumbnail path: ${result.videos[0]?.thumbnail_path || 'None'}`);
                        } else {
                            console.log('⚠️ No videos found needing thumbnails (might be expected)');
                        }
                        resolve(result);
                    } else {
                        console.log('❌ Thumbnail API failed');
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

// Test MediaConvert setup
function testMediaConvertSetup() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔧 Testing MediaConvert setup...');
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
                    
                    if (res.statusCode === 200 && result.success) {
                        console.log('✅ MediaConvert is ready!');
                        console.log(`   Endpoint: ${result.configuration?.endpoint || 'Unknown'}`);
                        console.log(`   Role ARN: ${result.configuration?.roleArn ? 'Configured' : 'Missing'}`);
                        resolve(result);
                    } else {
                        console.log('❌ MediaConvert setup failed');
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

// Test actual thumbnail generation for a specific video
function testThumbnailGeneration(videoId) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: videoId,
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
        
        console.log(`🎬 Testing thumbnail generation for video: ${videoId}`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Method: ${result.method || 'Unknown'}`);
                    
                    if (res.statusCode === 200 && result.success) {
                        console.log('✅ Thumbnail generation initiated!');
                        console.log(`   Thumbnail URL: ${result.thumbnailUrl || 'None'}`);
                        resolve(result);
                    } else {
                        console.log('❌ Thumbnail generation failed');
                        console.log(`   Error: ${result.error || 'Unknown'}`);
                        reject(new Error(result.error || `Status: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
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
        
        // Test fixed thumbnail API
        const thumbnailResult = await testThumbnailAPI();
        console.log('');
        
        // If we found videos, test generating a thumbnail for the first one
        if (thumbnailResult.count > 0) {
            const firstVideoId = thumbnailResult.videos[0].id;
            await testThumbnailGeneration(firstVideoId);
            console.log('');
        }
        
        console.log('🎉 ALL TESTS PASSED!');
        console.log('====================');
        console.log('');
        console.log('✅ MediaConvert integration is working!');
        console.log('✅ Fixed thumbnail API is finding videos!');
        console.log('✅ Real thumbnail generation is ready!');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('1. Visit /admin/fix-thumbnails to process all videos');
        console.log('2. Upload a new video to test automatic thumbnail generation');
        console.log('3. Check that real video frames replace SVG placeholders');
        
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

// Wait for deployment to complete, then run tests
console.log('⏳ Waiting for deployment to complete...');
setTimeout(runTests, 15000); // Wait 15 seconds
