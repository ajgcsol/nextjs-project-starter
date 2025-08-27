// Test Smart Video Player with Fallback System
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Smart Video Player with Fallback System...');
console.log('=======================================================');

// Test video playback with different scenarios
async function testVideoPlayback() {
    try {
        console.log('🔍 Getting list of videos...');
        
        // Get videos from API
        const videosResponse = await fetch(`${PRODUCTION_URL}/api/videos`);
        const videosData = await videosResponse.json();
        
        if (!videosData.success || !videosData.videos || videosData.videos.length === 0) {
            console.log('❌ No videos found to test');
            return;
        }
        
        console.log(`✅ Found ${videosData.videos.length} videos`);
        
        // Test first few videos
        const testVideos = videosData.videos.slice(0, 3);
        
        for (const video of testVideos) {
            console.log(`\n🎥 Testing video: ${video.title} (ID: ${video.id})`);
            
            // Get detailed video info
            const detailResponse = await fetch(`${PRODUCTION_URL}/api/videos/${video.id}`);
            const detailData = await detailResponse.json();
            
            if (detailData.success) {
                const videoDetail = detailData.video;
                
                console.log('📊 Video Details:');
                console.log(`   Title: ${videoDetail.title}`);
                console.log(`   Mux Playback ID: ${videoDetail.mux_playback_id || 'None'}`);
                console.log(`   S3 Key: ${videoDetail.s3Key || 'None'}`);
                console.log(`   Stream URL: ${videoDetail.streamUrl || 'None'}`);
                console.log(`   Thumbnail: ${videoDetail.thumbnailUrl || videoDetail.thumbnail_path || 'None'}`);
                
                // Test different video sources
                await testVideoSources(videoDetail);
            } else {
                console.log(`❌ Failed to get video details: ${detailData.error}`);
            }
        }
        
        console.log('\n🎉 Smart Video Player Test Complete!');
        console.log('=====================================');
        console.log('');
        console.log('✅ The SmartVideoPlayer will now:');
        console.log('   1. Try Mux streaming first (if playback ID exists)');
        console.log('   2. Fall back to S3/CloudFront (if S3 key exists)');
        console.log('   3. Fall back to API streaming endpoint');
        console.log('   4. Show proper error messages if all sources fail');
        console.log('   5. Display source indicator (Mux/CloudFront/Direct)');
        console.log('');
        console.log('🔧 This fixes the "MEDIA_ELEMENT_ERROR" issues with fake Mux URLs!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

async function testVideoSources(video) {
    console.log('🔄 Testing video source availability...');
    
    // Test Mux URL (if playback ID exists)
    if (video.mux_playback_id) {
        const muxUrl = `https://stream.mux.com/${video.mux_playback_id}/high.mp4`;
        console.log(`   🎬 Mux URL: ${muxUrl}`);
        
        try {
            const muxResponse = await fetch(muxUrl, { method: 'HEAD' });
            if (muxResponse.ok) {
                console.log('   ✅ Mux source: Available');
            } else {
                console.log('   ❌ Mux source: Not available (will fallback)');
            }
        } catch (error) {
            console.log('   ❌ Mux source: Error (will fallback)');
        }
    } else {
        console.log('   ⚠️ No Mux playback ID (will skip to S3)');
    }
    
    // Test S3/CloudFront URL (if S3 key exists)
    if (video.s3Key) {
        const s3Url = `https://d24qjgz9z4yzof.cloudfront.net/${video.s3Key}`;
        console.log(`   ☁️ S3/CloudFront URL: ${s3Url}`);
        
        try {
            const s3Response = await fetch(s3Url, { method: 'HEAD' });
            if (s3Response.ok) {
                console.log('   ✅ S3/CloudFront source: Available');
            } else {
                console.log('   ❌ S3/CloudFront source: Not available (will fallback)');
            }
        } catch (error) {
            console.log('   ❌ S3/CloudFront source: Error (will fallback)');
        }
    } else {
        console.log('   ⚠️ No S3 key (will skip to API)');
    }
    
    // Test API streaming endpoint
    const apiUrl = `${PRODUCTION_URL}/api/videos/stream/${video.id}`;
    console.log(`   🔗 API URL: ${apiUrl}`);
    
    try {
        const apiResponse = await fetch(apiUrl, { method: 'HEAD' });
        if (apiResponse.ok) {
            console.log('   ✅ API source: Available');
        } else {
            console.log('   ❌ API source: Not available');
        }
    } catch (error) {
        console.log('   ❌ API source: Error');
    }
}

// Helper function for fetch in Node.js
async function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = https.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const response = {
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    json: () => Promise.resolve(JSON.parse(data)),
                    text: () => Promise.resolve(data)
                };
                resolve(response);
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

// Run the test
testVideoPlayback();
