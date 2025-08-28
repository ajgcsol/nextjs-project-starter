// Test Mux Integration After Deployment
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-dgg2qt5iw-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Mux Integration After Deployment...');
console.log('===============================================');

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
                        
                        // Check if it's using Mux
                        if (result.method === 'mux') {
                            console.log('🎉 SUCCESS: Using Mux for real video thumbnails!');
                            console.log(`   Mux Asset ID: ${result.muxAssetId || 'Generated'}`);
                        } else if (result.method === 'enhanced_svg') {
                            console.log('⚠️  WARNING: Still using SVG fallback - Mux not working');
                        } else {
                            console.log(`   Using method: ${result.method}`);
                        }
                        
                        resolve(result);
                    } else {
                        console.log('❌ Thumbnail generation failed');
                        console.log(`   Error: ${result.error || 'Unknown'}`);
                        
                        // If no fallback system, this should show the real Mux error
                        if (result.error && result.error.includes('Mux')) {
                            console.log('🔍 Mux Error Details:', result.error);
                        }
                        
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
        
        // Test with a known video ID
        const testVideoId = 'd65ae252-b52b-4862-93ca-6f0818fec8f4';
        
        const result = await generateThumbnail(testVideoId);
        console.log('');
        
        if (result.method === 'mux') {
            console.log('🎉 MUX INTEGRATION SUCCESS!');
            console.log('===============================');
            console.log('');
            console.log('✅ Mux integration is working!');
            console.log('✅ Real video thumbnails are being generated!');
            console.log('✅ No more SVG fallbacks!');
            console.log('✅ Deployment successful with Mux credentials!');
        } else {
            console.log('⚠️  MUX INTEGRATION NOT WORKING YET');
            console.log('===================================');
            console.log('');
            console.log('❌ Still using fallback method:', result.method);
            console.log('💡 Possible reasons:');
            console.log('   - Deployment still propagating (wait 2-3 minutes)');
            console.log('   - Environment variables not active yet');
            console.log('   - Mux credentials issue');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ MUX TEST FAILED');
        console.log('==================');
        console.log('Error:', error.message);
        console.log('');
        console.log('🔍 This is GOOD if it shows a real Mux error!');
        console.log('   (No more hidden SVG fallbacks)');
        console.log('');
        console.log('💡 Next steps:');
        console.log('   - Check Mux credentials are correct');
        console.log('   - Verify VIDEO_MUX_TOKEN_ID and VIDEO_MUX_TOKEN_SECRET');
        console.log('   - Wait for deployment to fully propagate');
    }
}

runTest();
