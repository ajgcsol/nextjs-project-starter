// Detailed MediaConvert Debug Test - Force Debug Output
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔍 DETAILED MediaConvert Debug Test');
console.log('===================================');

// Test thumbnail generation with debug flag and force regenerate
function testThumbnailWithDebug() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: 'd65ae252-b52b-4862-93ca-6f0818fec8f4',
            forceRegenerate: true,
            debug: true,
            verbose: true
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
        
        console.log('🖼️ Testing thumbnail generation with debug...');
        console.log('📋 Request details:');
        console.log(`   URL: ${PRODUCTION_URL}/api/videos/generate-thumbnails`);
        console.log(`   Video ID: d65ae252-b52b-4862-93ca-6f0818fec8f4`);
        console.log(`   Force Regenerate: true`);
        console.log(`   Debug Mode: true`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 RESPONSE ANALYSIS:');
                    console.log('====================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Method Used: ${result.method}`);
                    console.log(`   Error: ${result.error || 'None'}`);
                    console.log(`   Job ID: ${result.jobId || 'None'}`);
                    console.log(`   Thumbnail URL Type: ${result.thumbnailUrl ? (result.thumbnailUrl.startsWith('data:') ? 'SVG Data URL' : 'Real URL') : 'None'}`);
                    
                    if (result.method === 'mediaconvert') {
                        console.log('');
                        console.log('🎉 SUCCESS: MediaConvert is working!');
                        console.log(`   Job ID: ${result.jobId}`);
                        console.log(`   Expected thumbnail: ${result.thumbnailUrl}`);
                    } else {
                        console.log('');
                        console.log('❌ ISSUE: MediaConvert not being used');
                        console.log(`   Fallback method: ${result.method}`);
                        console.log('');
                        console.log('🔍 TROUBLESHOOTING NEEDED:');
                        console.log('   The debug logs should show why MediaConvert failed');
                        console.log('   Check Vercel function logs for detailed error messages');
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data.substring(0, 500));
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

// Check Vercel function logs (if accessible)
function checkVercelLogs() {
    console.log('');
    console.log('📋 VERCEL LOGS CHECK:');
    console.log('=====================');
    console.log('To see the detailed MediaConvert debug output:');
    console.log('');
    console.log('1. Go to Vercel Dashboard: https://vercel.com/dashboard');
    console.log('2. Find your project: law-school-repository');
    console.log('3. Go to Functions tab');
    console.log('4. Look for recent function invocations');
    console.log('5. Check logs for MediaConvert debug output');
    console.log('');
    console.log('Look for these debug messages:');
    console.log('   - "🔍 DEBUG: Raw environment variables"');
    console.log('   - "🔧 MediaConvert config after sanitization"');
    console.log('   - "🚀 Submitting MediaConvert job..."');
    console.log('   - "🔍 DEBUG: MediaConvert response"');
    console.log('   - Any error messages with "❌ MediaConvert"');
}

// Main execution
async function main() {
    try {
        console.log(`🚀 Testing MediaConvert on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test thumbnail generation with debug
        const result = await testThumbnailWithDebug();
        
        // Show log checking instructions
        checkVercelLogs();
        
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('==============');
        
        if (result.method === 'mediaconvert') {
            console.log('✅ MediaConvert is working correctly!');
            console.log('✅ Real video thumbnails are being generated');
        } else {
            console.log('🔧 MediaConvert troubleshooting needed:');
            console.log('');
            console.log('1. Check Vercel function logs (instructions above)');
            console.log('2. Look for MediaConvert debug output');
            console.log('3. Identify the specific error causing fallback to SVG');
            console.log('4. Common issues to check:');
            console.log('   - Environment variables not set correctly');
            console.log('   - AWS credentials issues');
            console.log('   - MediaConvert permissions problems');
            console.log('   - S3 access issues');
            console.log('   - Video file not accessible');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ DEBUG TEST FAILED');
        console.log('===================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates a network or API issue');
        console.log('   Check if the application is deployed and accessible');
    }
}

// Run the debug test
main();
