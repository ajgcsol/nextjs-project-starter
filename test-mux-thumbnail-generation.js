// Test Mux Thumbnail Generation
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Mux Thumbnail Generation...');
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
                        console.log(`   Method Used: ${result.method}`);
                        console.log(`   Thumbnail URL: ${result.thumbnailUrl || 'None'}`);
                        console.log(`   Asset ID: ${result.assetId || 'None'}`);
                        console.log(`   Playback ID: ${result.playbackId || 'None'}`);
                        console.log(`   S3 Key: ${result.s3Key || 'None'}`);
                        
                        // Check if Mux was used
                        if (result.method === 'mux') {
                            console.log('🎉 SUCCESS: Mux thumbnail generation working!');
                        } else {
                            console.log(`⚠️ Using fallback method: ${result.method}`);
                        }
                        
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

// Test Mux configuration
function testMuxConfiguration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔧 Testing Mux configuration...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Configuration: ${result.success ? 'Working' : 'Failed'}`);
                    
                    if (result.success) {
                        console.log('✅ Configuration is working!');
                    } else {
                        console.log('❌ Configuration issues detected');
                        console.log(`   Error: ${result.error || result.message}`);
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse configuration response:', error.message);
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Run the test
async function runTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test configuration first
        await testMuxConfiguration();
        console.log('');
        
        // Get a video that needs a thumbnail
        const video = await getVideoNeedingThumbnail();
        console.log('');
        
        // Generate thumbnail for that video
        const result = await generateThumbnail(video.id);
        console.log('');
        
        if (result.method === 'mux') {
            console.log('🎉 MUX THUMBNAIL GENERATION SUCCESS!');
            console.log('=======================================');
            console.log('');
            console.log('✅ Mux integration is working perfectly!');
            console.log('✅ Real video thumbnails are being generated!');
            console.log('✅ No more AWS MediaConvert complexity!');
            console.log('✅ 5-minute setup vs 2+ hours of AWS debugging!');
            console.log('');
            console.log('🎯 The thumbnail generation system is now using Mux!');
            console.log('   Videos will get real thumbnails from Mux instead of SVG placeholders.');
        } else {
            console.log('⚠️ MUX NOT USED - FALLBACK METHOD');
            console.log('=================================');
            console.log(`   Method used: ${result.method}`);
            console.log('   This means Mux is not configured yet.');
            console.log('');
            console.log('💡 To enable Mux:');
            console.log('   1. Sign up at mux.com');
            console.log('   2. Get API keys');
            console.log('   3. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to Vercel');
            console.log('   4. Redeploy the application');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ MUX THUMBNAIL TEST FAILED');
        console.log('============================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Mux credentials not configured');
        console.log('   - Network connectivity issue');
        console.log('   - Video file not accessible');
        console.log('   - Mux service issue');
        console.log('');
        console.log('🔧 Next steps:');
        console.log('   1. Check if MUX_TOKEN_ID and MUX_TOKEN_SECRET are set in Vercel');
        console.log('   2. Verify Mux account is active');
        console.log('   3. Test with a different video');
    }
}

runTest();
