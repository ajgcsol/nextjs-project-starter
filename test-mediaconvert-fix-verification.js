// Test MediaConvert Fix Verification - Check if newline fix works
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔧 MediaConvert Fix Verification Test');
console.log('====================================');

// Test thumbnail generation after the fix
function testThumbnailAfterFix() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            videoId: 'd65ae252-b52b-4862-93ca-6f0818fec8f4',
            forceRegenerate: true,
            debug: true
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
        
        console.log('🖼️ Testing thumbnail generation after newline fix...');
        console.log('📋 Expected: Method should change from "enhanced_svg" to "mediaconvert"');
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
                    console.log('');
                    console.log('📊 THUMBNAIL GENERATION RESULT:');
                    console.log('===============================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Method Used: ${result.method}`);
                    console.log(`   Error: ${result.error || 'None'}`);
                    console.log(`   Job ID: ${result.jobId || 'None'}`);
                    
                    if (result.thumbnailUrl) {
                        const isDataUrl = result.thumbnailUrl.startsWith('data:');
                        console.log(`   Thumbnail Type: ${isDataUrl ? 'SVG Data URL (Fallback)' : 'Real URL (MediaConvert)'}`);
                        if (!isDataUrl) {
                            console.log(`   Thumbnail URL: ${result.thumbnailUrl}`);
                        }
                    }
                    
                    console.log('');
                    
                    if (result.method === 'mediaconvert') {
                        console.log('🎉 SUCCESS: MediaConvert Fix Worked!');
                        console.log('✅ Real video thumbnail generation is now active');
                        console.log(`✅ MediaConvert Job ID: ${result.jobId}`);
                        console.log('✅ Newline characters have been properly stripped');
                        console.log('✅ AWS SDK can now create MediaConvert jobs');
                        
                        if (result.thumbnailUrl && !result.thumbnailUrl.startsWith('data:')) {
                            console.log('✅ Real thumbnail URL generated');
                        }
                    } else {
                        console.log('❌ ISSUE: Still using fallback method');
                        console.log(`   Method: ${result.method}`);
                        console.log('   This indicates the fix may not have been deployed yet');
                        console.log('   OR there may be another issue preventing MediaConvert');
                        
                        if (result.error) {
                            console.log(`   Error details: ${result.error}`);
                        }
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

// Test batch generation to see if multiple videos work
function testBatchGeneration() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            batchMode: true,
            limit: 2,
            forceRegenerate: true,
            offset: 0
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
        
        console.log('');
        console.log('🔄 Testing batch thumbnail generation...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 BATCH GENERATION RESULT:');
                    console.log('===========================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Processed: ${result.processed || 0}`);
                    console.log(`   Successful: ${result.successful || 0}`);
                    console.log(`   Failed: ${result.failed || 0}`);
                    
                    if (result.results && result.results.length > 0) {
                        console.log('');
                        console.log('📋 Individual Results:');
                        result.results.forEach((item, index) => {
                            console.log(`   ${index + 1}. Method: ${item.method}, Success: ${item.success}`);
                            if (item.jobId) {
                                console.log(`      Job ID: ${item.jobId}`);
                            }
                            if (item.error) {
                                console.log(`      Error: ${item.error}`);
                            }
                        });
                        
                        // Count MediaConvert successes
                        const mediaConvertCount = result.results.filter(r => r.method === 'mediaconvert').length;
                        console.log('');
                        console.log(`📊 MediaConvert Jobs Created: ${mediaConvertCount}/${result.results.length}`);
                        
                        if (mediaConvertCount > 0) {
                            console.log('✅ Batch MediaConvert processing is working!');
                        } else {
                            console.log('⚠️ No MediaConvert jobs created in batch');
                        }
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse batch response:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Batch request failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Main execution
async function main() {
    try {
        console.log(`🚀 Testing MediaConvert fix on: ${PRODUCTION_URL}`);
        console.log('');
        console.log('🔍 What we fixed:');
        console.log('   - Enhanced credential sanitization to strip \\r\\n characters');
        console.log('   - Updated regex to handle newlines before other sanitization');
        console.log('   - Should now allow MediaConvert jobs to be created successfully');
        console.log('');
        
        // Test single video thumbnail generation
        const singleResult = await testThumbnailAfterFix();
        
        // Test batch generation
        const batchResult = await testBatchGeneration();
        
        console.log('');
        console.log('🎯 FIX VERIFICATION SUMMARY:');
        console.log('============================');
        
        if (singleResult.method === 'mediaconvert') {
            console.log('✅ CRITICAL FIX SUCCESSFUL!');
            console.log('✅ MediaConvert newline issue resolved');
            console.log('✅ Real video thumbnail generation is now working');
            console.log('✅ AWS SDK can successfully create MediaConvert jobs');
            console.log('');
            console.log('🎉 The MediaConvert activation issue has been SOLVED!');
            console.log('   Videos will now get real thumbnails extracted from video frames');
            console.log('   instead of SVG placeholders');
        } else {
            console.log('⚠️ Fix verification incomplete');
            console.log(`   Still using method: ${singleResult.method}`);
            console.log('');
            console.log('🔍 Possible reasons:');
            console.log('   1. Code changes not yet deployed to production');
            console.log('   2. Environment variables still need to be cleaned in Vercel');
            console.log('   3. Additional MediaConvert permissions issue');
            console.log('   4. S3 video file access problem');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ FIX VERIFICATION FAILED');
        console.log('==========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates a network or deployment issue');
        console.log('   The fix may not have been deployed yet');
    }
}

// Run the verification test
main();
