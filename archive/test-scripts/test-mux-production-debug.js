// Test Mux Integration in Production - Debug Real Issue
const https = require('https');

// Use command line argument or default URL
const PRODUCTION_URL = process.argv[2] || 'https://law-school-repository-88n6qbzep-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 DEBUGGING MUX INTEGRATION IN PRODUCTION');
console.log('==========================================');

// Test 1: Check Mux configuration
function testMuxConfiguration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics`;
        
        console.log('🔧 1. Testing Mux Configuration...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Mux Status:', result.mux?.status || 'Unknown');
                    console.log('   Mux Features:', result.mux?.features || 'None');
                    console.log('   Environment Variables:', {
                        hasMuxTokenId: result.environment?.VIDEO_MUX_TOKEN_ID || false,
                        hasMuxTokenSecret: result.environment?.VIDEO_MUX_TOKEN_SECRET || false
                    });
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test 2: Create a test Mux asset directly
function testMuxAssetCreation() {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            action: 'test-mux-asset',
            s3Key: 'videos/test-video.mp4', // Test with a simple S3 key
            videoId: 'test-' + Date.now()
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/debug/video-diagnostics',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            }
        };
        
        console.log('🎭 2. Testing Mux Asset Creation...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Mux Asset Creation:', result.success ? 'SUCCESS' : 'FAILED');
                    if (result.success) {
                        console.log('   Asset ID:', result.assetId);
                        console.log('   Playback ID:', result.playbackId);
                        console.log('   Thumbnail URL:', result.thumbnailUrl);
                    } else {
                        console.log('   Error:', result.error);
                    }
                    resolve(result);
                } catch (error) {
                    console.log('   Raw Response:', data);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   Request Error:', error.message);
            reject(error);
        });
        
        req.write(testData);
        req.end();
    });
}

// Test 3: Check recent video upload for Mux data
function checkRecentVideoMuxData() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos?limit=1`;
        
        console.log('📋 3. Checking Recent Video for Mux Data...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.videos && result.videos.length > 0) {
                        const video = result.videos[0];
                        console.log('   Recent Video ID:', video.id);
                        console.log('   Title:', video.title);
                        console.log('   Status:', video.status);
                        console.log('   Has Mux Data:', !!(video.mux_asset_id || video.metadata?.muxAssetId));
                        console.log('   Stream URL:', video.streamUrl);
                        console.log('   Thumbnail:', video.thumbnailPath);
                    } else {
                        console.log('   No videos found');
                    }
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Run all tests
async function runDebugTests() {
    try {
        console.log(`🚀 Testing Mux Integration on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test 1: Configuration
        await testMuxConfiguration();
        console.log('');
        
        // Test 2: Asset Creation
        await testMuxAssetCreation();
        console.log('');
        
        // Test 3: Recent Video Data
        await checkRecentVideoMuxData();
        console.log('');
        
        console.log('🎉 MUX DEBUG TESTS COMPLETED!');
        console.log('============================');
        
    } catch (error) {
        console.log('');
        console.log('❌ MUX DEBUG TEST FAILED');
        console.log('========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates:');
        console.log('   - Mux credentials may be missing or invalid');
        console.log('   - Mux API calls are failing');
        console.log('   - Network connectivity issues');
        console.log('   - Environment variable configuration problems');
    }
}

runDebugTests();
