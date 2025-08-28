// Debug Mux Integration - Detailed Analysis
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-dgg2qt5iw-andrew-j-gregwares-projects.vercel.app';

console.log('🔍 Debugging Mux Integration - Detailed Analysis');
console.log('================================================');

// Test Mux configuration
function testMuxConfiguration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/aws/health`;
        
        console.log('🔧 Testing Mux configuration...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 AWS Health Check Response:');
                    console.log('   Status:', res.statusCode);
                    console.log('   Overall:', result.overall || 'Unknown');
                    
                    if (result.services) {
                        console.log('   Services:');
                        Object.entries(result.services).forEach(([service, status]) => {
                            console.log(`     - ${service}: ${status.status} - ${status.message}`);
                        });
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse health check response');
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test video database to find a video with S3 key
function getVideoWithS3Key() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`;
        
        console.log('🔍 Finding video with S3 key...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.videos && result.videos.length > 0) {
                        // Find video with S3 key
                        const videoWithS3Key = result.videos.find(v => v.s3_key);
                        
                        if (videoWithS3Key) {
                            console.log('✅ Found video with S3 key:');
                            console.log(`   ID: ${videoWithS3Key.id}`);
                            console.log(`   Title: ${videoWithS3Key.title}`);
                            console.log(`   S3 Key: ${videoWithS3Key.s3_key}`);
                            console.log(`   File Path: ${videoWithS3Key.file_path || 'None'}`);
                            resolve(videoWithS3Key);
                        } else {
                            console.log('⚠️ No videos found with S3 keys');
                            console.log('Available videos:');
                            result.videos.forEach(v => {
                                console.log(`   - ${v.title}: S3=${v.s3_key || 'NONE'}, Path=${v.file_path || 'NONE'}`);
                            });
                            reject(new Error('No videos with S3 keys found'));
                        }
                    } else {
                        reject(new Error('No videos found in database'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test S3 video accessibility
function testS3VideoAccess(s3Key) {
    return new Promise((resolve, reject) => {
        const bucketName = 'law-school-repository-content';
        const region = 'us-east-1';
        const videoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
        
        console.log('🔗 Testing S3 video accessibility...');
        console.log(`   URL: ${videoUrl}`);
        
        https.get(videoUrl, (res) => {
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Content-Type: ${res.headers['content-type'] || 'Unknown'}`);
            console.log(`   Content-Length: ${res.headers['content-length'] || 'Unknown'}`);
            
            if (res.statusCode === 200) {
                console.log('✅ S3 video is accessible');
                resolve(true);
            } else if (res.statusCode === 403) {
                console.log('❌ S3 video access forbidden (permissions issue)');
                resolve(false);
            } else {
                console.log(`❌ S3 video not accessible (status: ${res.statusCode})`);
                resolve(false);
            }
            
            // Don't download the whole video, just test headers
            res.destroy();
        }).on('error', (error) => {
            console.log('❌ S3 video access failed:', error.message);
            resolve(false);
        });
    });
}

// Generate thumbnail with detailed error logging
function generateThumbnailDetailed(videoId) {
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
        
        console.log('🖼️ Generating thumbnail with detailed logging...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📋 Response Status: ${res.statusCode}`);
                console.log(`📋 Response Headers:`, res.headers);
                
                try {
                    const result = JSON.parse(data);
                    console.log('📋 Response Body:', JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse JSON response');
                    console.log('📋 Raw Response:', data);
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

// Test Mux credentials directly
function testMuxCredentials() {
    return new Promise((resolve, reject) => {
        console.log('🔑 Testing Mux credentials...');
        
        // We can't test Mux directly from Node.js without the SDK
        // But we can check if the environment variables are set in the deployment
        console.log('   Note: Mux credentials test requires server-side access');
        console.log('   Will be tested during thumbnail generation');
        resolve(true);
    });
}

// Run comprehensive debug test
async function runDebugTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // 1. Test Mux configuration
        console.log('=== STEP 1: Configuration Test ===');
        try {
            await testMuxConfiguration();
        } catch (error) {
            console.log('⚠️ Health check failed:', error.message);
        }
        console.log('');
        
        // 2. Test Mux credentials
        console.log('=== STEP 2: Mux Credentials Test ===');
        await testMuxCredentials();
        console.log('');
        
        // 3. Find video with S3 key
        console.log('=== STEP 3: Video Database Test ===');
        const video = await getVideoWithS3Key();
        console.log('');
        
        // 4. Test S3 video accessibility
        console.log('=== STEP 4: S3 Video Access Test ===');
        const s3Accessible = await testS3VideoAccess(video.s3_key);
        console.log('');
        
        // 5. Generate thumbnail with detailed logging
        console.log('=== STEP 5: Mux Thumbnail Generation Test ===');
        const result = await generateThumbnailDetailed(video.id);
        console.log('');
        
        // 6. Analysis
        console.log('=== ANALYSIS ===');
        if (result.success) {
            console.log('🎉 SUCCESS: Mux integration is working!');
            console.log(`   Method: ${result.method}`);
            console.log(`   Thumbnail URL: ${result.thumbnailUrl}`);
            if (result.assetId) console.log(`   Mux Asset ID: ${result.assetId}`);
            if (result.playbackId) console.log(`   Mux Playback ID: ${result.playbackId}`);
        } else {
            console.log('❌ FAILED: Mux integration has issues');
            console.log(`   Error: ${result.error || 'Unknown error'}`);
            
            console.log('');
            console.log('🔍 DEBUGGING CHECKLIST:');
            console.log(`   ✅ Video found: ${video.title}`);
            console.log(`   ${s3Accessible ? '✅' : '❌'} S3 video accessible: ${s3Accessible}`);
            console.log(`   ❌ Mux processing: Failed`);
            
            console.log('');
            console.log('💡 LIKELY ISSUES:');
            if (!s3Accessible) {
                console.log('   - S3 video not publicly accessible to Mux');
                console.log('   - Need to make S3 bucket/objects public or use signed URLs');
            }
            console.log('   - Mux credentials might be incorrect');
            console.log('   - Video format might not be supported by Mux');
            console.log('   - Network connectivity issue between Mux and S3');
            
            console.log('');
            console.log('🔧 NEXT STEPS:');
            console.log('   1. Check S3 bucket policy for public read access');
            console.log('   2. Verify Mux credentials are correct');
            console.log('   3. Test with a different video file');
            console.log('   4. Check Mux dashboard for failed asset creation');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ DEBUG TEST FAILED');
        console.log('====================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates a fundamental issue:');
        console.log('   - Database connectivity problem');
        console.log('   - API endpoint not responding');
        console.log('   - Deployment not complete');
    }
}

runDebugTest();
