// Test MediaConvert Job Creation Directly
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 Testing Direct MediaConvert Job Creation...');
console.log('==============================================');

// Test MediaConvert job creation directly
function testMediaConvertJobCreation() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: 'd65ae252-b52b-4862-93ca-6f0818fec8f4',
            videoS3Key: 'videos/1755798554783-7u483xlorx5.wmv',
            forceMediaConvert: true
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
        
        console.log('🚀 Testing MediaConvert job creation...');
        console.log('📋 Video ID: d65ae252-b52b-4862-93ca-6f0818fec8f4');
        console.log('📋 S3 Key: videos/1755798554783-7u483xlorx5.wmv');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`📊 Response Status: ${res.statusCode}`);
                    console.log(`📊 Success: ${result.success}`);
                    console.log(`📊 Method: ${result.method || 'Unknown'}`);
                    
                    if (result.method === 'mediaconvert') {
                        console.log('✅ SUCCESS: MediaConvert job created!');
                        console.log(`📸 Job ID: ${result.jobId || 'None'}`);
                        console.log(`🔗 Thumbnail URL: ${result.thumbnailUrl || 'None'}`);
                        resolve(result);
                    } else {
                        console.log('❌ FAILED: MediaConvert not used');
                        console.log(`🔄 Fallback method: ${result.method}`);
                        console.log(`❌ Error: ${result.error || 'MediaConvert job not created'}`);
                        reject(new Error(`Expected mediaconvert, got ${result.method}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('📄 Raw response:', data);
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
        console.log(`🌐 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        await testMediaConvertJobCreation();
        
        console.log('');
        console.log('🎉 MEDIACONVERT JOB CREATION SUCCESS!');
        console.log('====================================');
        console.log('✅ MediaConvert is properly configured!');
        console.log('✅ Real video thumbnails will be generated!');
        console.log('✅ Jobs are being created successfully!');
        
    } catch (error) {
        console.log('');
        console.log('❌ MEDIACONVERT JOB CREATION FAILED');
        console.log('==================================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates:');
        console.log('   - MediaConvert job creation is failing');
        console.log('   - Check AWS MediaConvert permissions');
        console.log('   - Verify service role configuration');
        console.log('   - Check S3 bucket access from MediaConvert');
    }
}

runTest();
