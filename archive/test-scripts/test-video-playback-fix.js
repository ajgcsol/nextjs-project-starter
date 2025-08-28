// Test Video Playback Fix - Verify SmartVideoPlayer handles API responses correctly
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Video Playback Fix...');
console.log('=================================');

// Test the streaming API endpoint directly
function testStreamingAPI(videoId) {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/stream/${videoId}`;
        
        console.log(`🔍 Testing streaming API for video: ${videoId}`);
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
                    console.log(`   Success: ${result.success}`);
                    
                    if (result.success && result.videoUrl) {
                        console.log('✅ API returned valid video URL');
                        console.log(`   Video URL: ${result.videoUrl}`);
                        console.log(`   Discovery Method: ${result.metadata?.discoveryMethod || 'unknown'}`);
                        console.log(`   S3 Key: ${result.metadata?.s3Key || 'none'}`);
                        
                        // Test if the returned URL is accessible
                        testVideoURL(result.videoUrl).then(urlWorks => {
                            resolve({
                                success: true,
                                videoUrl: result.videoUrl,
                                urlWorks,
                                metadata: result.metadata
                            });
                        }).catch(error => {
                            resolve({
                                success: true,
                                videoUrl: result.videoUrl,
                                urlWorks: false,
                                error: error.message,
                                metadata: result.metadata
                            });
                        });
                    } else {
                        console.log('❌ API did not return valid video URL');
                        console.log(`   Error: ${result.error || 'Unknown error'}`);
                        resolve({
                            success: false,
                            error: result.error || 'No video URL returned'
                        });
                    }
                } catch (error) {
                    console.log('❌ Failed to parse API response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ API request failed:', error.message);
            reject(error);
        });
    });
}

// Test if a video URL is accessible
function testVideoURL(videoUrl) {
    return new Promise((resolve, reject) => {
        console.log(`🔗 Testing video URL accessibility: ${videoUrl}`);
        
        const urlObj = new URL(videoUrl);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const client = urlObj.protocol === 'https:' ? https : require('http');
        
        const req = client.request(options, (res) => {
            console.log(`   URL Status: ${res.statusCode}`);
            console.log(`   Content-Type: ${res.headers['content-type'] || 'unknown'}`);
            console.log(`   Content-Length: ${res.headers['content-length'] || 'unknown'}`);
            
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log('✅ Video URL is accessible');
                resolve(true);
            } else {
                console.log('❌ Video URL returned error status');
                resolve(false);
            }
        });
        
        req.on('error', (error) => {
            console.log('❌ Video URL test failed:', error.message);
            resolve(false);
        });
        
        req.setTimeout(10000, () => {
            console.log('⏰ Video URL test timed out');
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

// Get list of videos to test
function getVideosToTest() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos?limit=5`;
        
        console.log('📹 Getting list of videos to test...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.videos && result.videos.length > 0) {
                        console.log(`✅ Found ${result.videos.length} videos to test`);
                        resolve(result.videos);
                    } else {
                        console.log('❌ No videos found to test');
                        resolve([]);
                    }
                } catch (error) {
                    console.log('❌ Failed to parse videos response:', error.message);
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Run the complete test
async function runTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Get videos to test
        const videos = await getVideosToTest();
        
        if (videos.length === 0) {
            console.log('⚠️ No videos available for testing');
            return;
        }
        
        console.log('');
        console.log('🧪 Testing Video Streaming API...');
        console.log('==================================');
        
        let successCount = 0;
        let workingUrlCount = 0;
        
        // Test each video
        for (let i = 0; i < Math.min(videos.length, 3); i++) {
            const video = videos[i];
            console.log('');
            console.log(`📹 Testing Video ${i + 1}: ${video.title}`);
            console.log(`   ID: ${video.id}`);
            
            try {
                const result = await testStreamingAPI(video.id);
                
                if (result.success) {
                    successCount++;
                    if (result.urlWorks) {
                        workingUrlCount++;
                    }
                }
                
                // Wait between tests
                if (i < videos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (error) {
                console.log(`❌ Test failed for video ${video.id}:`, error.message);
            }
        }
        
        console.log('');
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=======================');
        console.log(`Videos tested: ${Math.min(videos.length, 3)}`);
        console.log(`API responses successful: ${successCount}`);
        console.log(`Working video URLs: ${workingUrlCount}`);
        console.log('');
        
        if (successCount > 0 && workingUrlCount > 0) {
            console.log('🎉 VIDEO PLAYBACK FIX SUCCESSFUL!');
            console.log('✅ SmartVideoPlayer should now work correctly');
            console.log('✅ API returns valid video URLs');
            console.log('✅ Video URLs are accessible');
            console.log('');
            console.log('🎯 The "MEDIA_ELEMENT_ERROR" should be resolved!');
        } else if (successCount > 0) {
            console.log('⚠️ PARTIAL SUCCESS');
            console.log('✅ API returns video URLs');
            console.log('❌ Some video URLs may not be accessible');
            console.log('💡 Check S3/CloudFront configuration');
        } else {
            console.log('❌ VIDEO PLAYBACK FIX NEEDS MORE WORK');
            console.log('❌ API not returning valid video URLs');
            console.log('💡 Check streaming endpoint implementation');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ TEST FAILED');
        console.log('==============');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Network connectivity issue');
        console.log('   - API endpoint not responding');
        console.log('   - Database connection problem');
    }
}

runTest();
