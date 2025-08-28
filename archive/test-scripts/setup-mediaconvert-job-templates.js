// Setup MediaConvert Job Templates for Thumbnail Generation
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 MediaConvert Job Template Setup');
console.log('==================================');

// Create a test MediaConvert job to initialize the service
function createTestThumbnailJob() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            action: 'create-test-job'
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/mediaconvert/setup',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('🔧 Creating test MediaConvert job...');
        console.log('   This will initialize MediaConvert in your AWS account');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.success) {
                        console.log('✅ Test job created successfully!');
                        console.log(`   Job ID: ${result.jobId || 'N/A'}`);
                        resolve(result);
                    } else {
                        console.log('⚠️  Test job creation response:', result.message);
                        resolve(result); // Don't reject, this might be expected
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

// Test thumbnail generation to see if it works
function testThumbnailGeneration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=1`;
        
        console.log('🔍 Finding videos that need thumbnails...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.success && result.count > 0) {
                        const video = result.videos[0];
                        console.log(`✅ Found video needing thumbnail: ${video.title}`);
                        console.log(`   Video ID: ${video.id}`);
                        console.log(`   S3 Key: ${video.s3_key || 'None'}`);
                        
                        // Now try to generate thumbnail for this video
                        return generateThumbnailForVideo(video.id);
                    } else {
                        console.log('ℹ️  No videos found needing thumbnails');
                        console.log('   This might mean all videos already have thumbnails');
                        resolve({ success: true, message: 'No videos need thumbnails' });
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Generate thumbnail for a specific video
function generateThumbnailForVideo(videoId) {
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
        
        console.log(`🖼️  Generating thumbnail for video: ${videoId}`);
        
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
                        if (result.method === 'mediaconvert') {
                            console.log('🎉 Using MediaConvert for real video frames!');
                            console.log(`   Job ID: ${result.jobId || 'N/A'}`);
                        } else {
                            console.log(`⚠️  Using fallback method: ${result.method}`);
                        }
                        console.log(`   Thumbnail URL: ${result.thumbnailUrl || 'N/A'}`);
                    } else {
                        console.log('❌ Thumbnail generation failed');
                        console.log(`   Error: ${result.error || 'Unknown'}`);
                    }
                    
                    resolve(result);
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

// Main execution
async function main() {
    try {
        console.log(`🚀 Setting up MediaConvert on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Try to create a test job first (this initializes MediaConvert)
        try {
            await createTestThumbnailJob();
            console.log('');
        } catch (error) {
            console.log('⚠️  Test job creation failed, but continuing...');
            console.log('');
        }
        
        // Test thumbnail generation
        await testThumbnailGeneration();
        console.log('');
        
        console.log('🎯 NEXT STEPS');
        console.log('=============');
        console.log('');
        console.log('1. Check AWS MediaConvert Console:');
        console.log('   https://console.aws.amazon.com/mediaconvert/');
        console.log('   - You should now see jobs in the "Jobs" section');
        console.log('   - The service should be initialized');
        console.log('');
        console.log('2. If you still see "Add Resource" in the console:');
        console.log('   - Click "Skip" or "Continue without template"');
        console.log('   - Your system creates jobs programmatically');
        console.log('   - You don\'t need to manually configure templates');
        console.log('');
        console.log('3. Your thumbnail generation system is working if you see:');
        console.log('   - Method: mediaconvert (not enhanced_svg)');
        console.log('   - Job IDs being returned');
        console.log('   - Real .jpg thumbnails in S3');
        
    } catch (error) {
        console.log('');
        console.log('❌ SETUP FAILED');
        console.log('===============');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - MediaConvert permissions issue');
        console.log('   - Network connectivity problem');
        console.log('   - Application deployment issue');
        console.log('');
        console.log('🔧 Try:');
        console.log('   1. Check AWS credentials in Vercel');
        console.log('   2. Verify MediaConvert role permissions');
        console.log('   3. Test the application directly in browser');
    }
}

// Run the setup
main();
