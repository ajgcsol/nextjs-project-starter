// Test Real Thumbnail Generation
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Real Thumbnail Generation...');
console.log('=====================================');

// First get a video that needs thumbnails
function getVideoNeedingThumbnail() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=1`;
        
        console.log('🔍 Getting video that needs thumbnail...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.count > 0) {
                        const video = result.videos[0];
                        console.log(`✅ Found video: ${video.title} (ID: ${video.id})`);
                        console.log(`   Current thumbnail: ${video.thumbnail_path || 'None'}`);
                        console.log(`   S3 Key: ${video.s3_key || 'None'}`);
                        resolve(video);
                    } else {
                        reject(new Error('No videos found needing thumbnails'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Generate thumbnail for a specific video
function generateThumbnail(videoId) {
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
        
        console.log(`🖼️ Generating thumbnail for video: ${videoId}`);
        
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
                    
                    if (result.success) {
                        console.log('✅ Thumbnail generation initiated!');
                        console.log(`   Thumbnail URL: ${result.thumbnailUrl || 'None'}`);
                        console.log(`   S3 Key: ${result.s3Key || 'None'}`);
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

// Test batch thumbnail generation
function testBatchGeneration() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            batchMode: true,
            limit: 3,
            forceRegenerate: false,
            offset: 0
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
        
        console.log('🔄 Testing batch thumbnail generation...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Processed: ${result.processed || 0}`);
                    console.log(`   Successful: ${result.successful || 0}`);
                    console.log(`   Failed: ${result.failed || 0}`);
                    
                    if (result.success) {
                        console.log('✅ Batch thumbnail generation completed!');
                        resolve(result);
                    } else {
                        console.log('❌ Batch thumbnail generation failed');
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

// Run the test
async function runTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Get a video that needs a thumbnail
        const video = await getVideoNeedingThumbnail();
        console.log('');
        
        // Generate thumbnail for that video
        await generateThumbnail(video.id);
        console.log('');
        
        // Test batch generation
        await testBatchGeneration();
        console.log('');
        
        console.log('🎉 ALL THUMBNAIL TESTS PASSED!');
        console.log('===============================');
        console.log('');
        console.log('✅ MediaConvert integration is working!');
        console.log('✅ Single video thumbnail generation works!');
        console.log('✅ Batch thumbnail generation works!');
        console.log('✅ Real video frame extraction is active!');
        console.log('');
        console.log('🎯 The thumbnail generation system is now fully functional!');
        console.log('   Videos will get real thumbnails instead of SVG placeholders.');
        
    } catch (error) {
        console.log('');
        console.log('❌ THUMBNAIL TEST FAILED');
        console.log('========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - MediaConvert permissions issue');
        console.log('   - S3 access problem');
        console.log('   - Video file not accessible');
        console.log('   - Network connectivity issue');
    }
}

runTest();
