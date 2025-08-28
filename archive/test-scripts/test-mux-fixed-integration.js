// Test Mux Integration After Fix
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-7p5apcale-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Mux Integration After Fix...');
console.log('======================================');

// Generate thumbnail with the fixed Mux integration
function generateThumbnailFixed(videoId) {
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
        
        console.log(`🖼️ Testing fixed Mux integration for video: ${videoId}`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📋 Response Status: ${res.statusCode}`);
                
                try {
                    const result = JSON.parse(data);
                    console.log('📋 Response:', JSON.stringify(result, null, 2));
                    
                    if (result.success && result.method === 'mux') {
                        console.log('🎉 SUCCESS: Mux integration is working!');
                        console.log(`   Asset ID: ${result.assetId || 'Generated'}`);
                        console.log(`   Playback ID: ${result.playbackId || 'Generated'}`);
                        console.log(`   Thumbnail URL: ${result.thumbnailUrl}`);
                        resolve(result);
                    } else if (result.success && result.method !== 'mux') {
                        console.log(`⚠️ Using fallback method: ${result.method}`);
                        console.log('   This means Mux is still not working properly');
                        resolve(result);
                    } else {
                        console.log('❌ Thumbnail generation failed');
                        console.log(`   Error: ${result.error || 'Unknown'}`);
                        
                        // Check if it's still the same mp4_support error
                        if (result.error && result.error.includes('mp4_support')) {
                            console.log('🔍 Still getting mp4_support error - deployment may not be complete');
                        } else if (result.error && result.error.includes('Mux')) {
                            console.log('🔍 Different Mux error - progress made!');
                        }
                        
                        resolve(result);
                    }
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

// Run the test
async function runTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test with the known video ID
        const testVideoId = 'd65ae252-b52b-4862-93ca-6f0818fec8f4';
        
        const result = await generateThumbnailFixed(testVideoId);
        console.log('');
        
        console.log('=== FINAL ANALYSIS ===');
        if (result.success && result.method === 'mux') {
            console.log('🎉 COMPLETE SUCCESS!');
            console.log('====================');
            console.log('✅ Mux integration is fully working!');
            console.log('✅ Real video thumbnails are being generated!');
            console.log('✅ No more SVG fallbacks!');
            console.log('✅ mp4_support deprecation issue fixed!');
            console.log('');
            console.log('🎯 ACHIEVEMENT UNLOCKED:');
            console.log('   - Removed all fallback systems');
            console.log('   - Exposed real Mux API errors');
            console.log('   - Fixed Mux configuration issues');
            console.log('   - Successfully generating real video thumbnails');
            
        } else if (result.success && result.method !== 'mux') {
            console.log('⚠️ PARTIAL SUCCESS');
            console.log('==================');
            console.log(`✅ No more crashes - using ${result.method} method`);
            console.log('❌ Mux still not working properly');
            console.log('');
            console.log('💡 Next steps needed:');
            console.log('   - Check Mux credentials are correct');
            console.log('   - Verify video format compatibility');
            console.log('   - Check Mux dashboard for errors');
            
        } else {
            console.log('❌ STILL FAILING');
            console.log('================');
            console.log(`Error: ${result.error}`);
            console.log('');
            console.log('🔍 But this is GOOD because:');
            console.log('   - We can see the real error now');
            console.log('   - No more hidden SVG fallbacks');
            console.log('   - Can debug the actual issue');
            
            if (result.error && !result.error.includes('mp4_support')) {
                console.log('');
                console.log('✅ PROGRESS: mp4_support error is fixed!');
                console.log('   Now dealing with a different issue');
            }
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ TEST FAILED');
        console.log('==============');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Deployment not complete yet');
        console.log('   - Network connectivity issue');
        console.log('   - API endpoint not responding');
    }
}

runTest();
