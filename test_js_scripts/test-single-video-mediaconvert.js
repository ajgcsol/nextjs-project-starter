// Test Single Video MediaConvert Job Creation
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔧 Testing Single Video MediaConvert Job Creation...');
console.log('==================================================');

// Get the first video that needs a thumbnail
function getFirstVideo() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=1`;
        
        console.log('🔍 Getting first video that needs thumbnail...');
        
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
                        console.log('✅ Found video:');
                        console.log(`   ID: ${video.id}`);
                        console.log(`   Title: ${video.title}`);
                        console.log(`   S3 Key: ${video.s3_key || 'MISSING'}`);
                        console.log(`   File Path: ${video.file_path || 'MISSING'}`);
                        console.log(`   Current Thumbnail: ${video.thumbnail_path || 'NONE'}`);
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

// Test MediaConvert job creation with verbose logging
function createMediaConvertJob(video) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: video.id,
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
        
        console.log('🎬 Creating MediaConvert job...');
        console.log(`   Video ID: ${video.id}`);
        console.log(`   S3 Key: ${video.s3_key || 'MISSING'}`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 API Response:');
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Method: ${result.method}`);
                    console.log(`   Job ID: ${result.jobId || 'NONE'}`);
                    console.log(`   Thumbnail URL: ${result.thumbnailUrl ? 'Generated' : 'NONE'}`);
                    console.log(`   Error: ${result.error || 'NONE'}`);
                    
                    // Check what method was actually used
                    if (result.method === 'mediaconvert') {
                        console.log('✅ SUCCESS: MediaConvert job created!');
                        console.log(`   Job ID: ${result.jobId}`);
                        resolve(result);
                    } else if (result.method === 'enhanced_svg') {
                        console.log('⚠️ FALLBACK: Enhanced SVG generated instead of MediaConvert');
                        console.log('   This means MediaConvert job creation failed');
                        console.log('   Reasons could be:');
                        console.log('   - Missing S3 key');
                        console.log('   - MediaConvert permissions issue');
                        console.log('   - Video file not accessible');
                        console.log('   - AWS configuration problem');
                        resolve(result);
                    } else {
                        console.log(`❌ UNEXPECTED: Got method '${result.method}'`);
                        resolve(result);
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data);
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

// Check if any thumbnails were generated in S3
function checkS3Thumbnails() {
    return new Promise((resolve, reject) => {
        console.log('🔍 Checking S3 for generated thumbnails...');
        
        // Use AWS CLI to list thumbnails folder
        const { exec } = require('child_process');
        
        exec('aws s3 ls s3://law-school-repository-content/thumbnails/ --recursive', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ Failed to list S3 thumbnails:', error.message);
                reject(error);
                return;
            }
            
            if (stdout.trim()) {
                console.log('✅ Found thumbnails in S3:');
                console.log(stdout);
            } else {
                console.log('⚠️ No thumbnails found in S3 thumbnails folder');
            }
            
            resolve(stdout);
        });
    });
}

// Run the comprehensive test
async function runTest() {
    try {
        console.log(`🚀 Testing MediaConvert job creation on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Get first video
        const video = await getFirstVideo();
        console.log('');
        
        // Create MediaConvert job
        const result = await createMediaConvertJob(video);
        console.log('');
        
        // Check S3 for existing thumbnails
        try {
            await checkS3Thumbnails();
        } catch (error) {
            console.log('⚠️ Could not check S3 thumbnails (AWS CLI might not be configured)');
        }
        console.log('');
        
        console.log('🎯 ANALYSIS COMPLETE');
        console.log('===================');
        
        if (result.method === 'mediaconvert') {
            console.log('✅ MediaConvert is working correctly!');
            console.log('   Real thumbnail generation is active.');
            console.log('   Jobs may take 2-5 minutes to complete.');
        } else if (result.method === 'enhanced_svg') {
            console.log('⚠️ MediaConvert is not being used.');
            console.log('   System is falling back to SVG placeholders.');
            console.log('   Check:');
            console.log('   - Video has valid S3 key');
            console.log('   - MediaConvert permissions');
            console.log('   - AWS credentials');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ TEST FAILED');
        console.log('==============');
        console.log('Error:', error.message);
    }
}

runTest();
