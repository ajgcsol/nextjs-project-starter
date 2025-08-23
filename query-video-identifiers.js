// Query Video Database Identifiers
// This script queries the production database to show all unique identifiers for videos

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔍 Querying Video Database Identifiers...');
console.log('==========================================');

// Function to query database for video identifiers
function queryVideoIdentifiers() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos?action=list-identifiers&limit=10`;
        
        console.log('📊 Fetching video identifiers from database...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ Response Status: ${res.statusCode}`);
                    
                    if (result.success && result.videos) {
                        console.log(`📹 Found ${result.videos.length} videos in database`);
                        console.log('');
                        
                        console.log('🆔 UNIQUE IDENTIFIERS AVAILABLE:');
                        console.log('================================');
                        
                        result.videos.forEach((video, index) => {
                            console.log(`\n📹 Video ${index + 1}:`);
                            console.log(`   Primary ID (UUID): ${video.id}`);
                            console.log(`   Title: ${video.title}`);
                            console.log(`   Filename: ${video.filename}`);
                            
                            // Show all available identifiers
                            const identifiers = {
                                'UUID (Primary Key)': video.id,
                                'S3 Key': video.s3_key,
                                'File Path': video.file_path,
                                'Mux Asset ID': video.mux_asset_id,
                                'Mux Playback ID': video.mux_playback_id,
                                'Mux Upload ID': video.mux_upload_id,
                                'MediaConvert Job ID': video.mediaconvert_job_id
                            };
                            
                            console.log('   Available Identifiers:');
                            Object.entries(identifiers).forEach(([key, value]) => {
                                if (value) {
                                    console.log(`     ✅ ${key}: ${value}`);
                                } else {
                                    console.log(`     ❌ ${key}: Not set`);
                                }
                            });
                            
                            console.log(`   Upload Date: ${video.uploaded_at}`);
                            console.log(`   File Size: ${video.file_size ? (video.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
                            console.log(`   Processed: ${video.is_processed ? 'Yes' : 'No'}`);
                            console.log(`   Mux Status: ${video.mux_status || 'Not processed'}`);
                        });
                        
                        console.log('\n🎯 RECOMMENDED IDENTIFIER USAGE:');
                        console.log('=================================');
                        console.log('✅ PRIMARY: Use UUID (id) - This is the main database primary key');
                        console.log('✅ BACKUP: Use Mux Playback ID - For direct Mux streaming');
                        console.log('✅ LEGACY: Use S3 Key - For direct S3 access');
                        console.log('');
                        console.log('💡 The UUID (id) field is guaranteed unique and should be used');
                        console.log('   as the primary identifier for all video operations.');
                        
                        resolve(result);
                    } else {
                        console.log('❌ No videos found or invalid response');
                        console.log('Response:', result);
                        reject(new Error('No videos found'));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Function to test a specific video ID
function testVideoId(videoId) {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics?videoId=${videoId}`;
        
        console.log(`🧪 Testing video ID: ${videoId}`);
        
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
                    
                    if (result.success && result.video) {
                        console.log(`   ✅ Video found: ${result.video.title}`);
                        console.log(`   📊 Mux Status: ${result.mux.status}`);
                        console.log(`   🎬 Streaming: ${result.streaming.method}`);
                    } else {
                        console.log(`   ❌ Error: ${result.error || 'Unknown error'}`);
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log(`   ❌ Parse error: ${error.message}`);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log(`   ❌ Request error: ${error.message}`);
            reject(error);
        });
    });
}

// Run the analysis
async function runAnalysis() {
    try {
        console.log(`🚀 Connecting to: ${PRODUCTION_URL}`);
        console.log('');
        
        // Get video identifiers
        const result = await queryVideoIdentifiers();
        
        // Test the first video ID if available
        if (result.videos && result.videos.length > 0) {
            const firstVideo = result.videos[0];
            console.log('\n🧪 TESTING FIRST VIDEO ID:');
            console.log('===========================');
            await testVideoId(firstVideo.id);
        }
        
        console.log('\n🎉 DATABASE IDENTIFIER ANALYSIS COMPLETE!');
        console.log('=========================================');
        console.log('');
        console.log('📋 SUMMARY:');
        console.log(`   • Primary Identifier: UUID (id) field`);
        console.log(`   • Format: UUID v4 (e.g., ${result.videos[0]?.id || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'})`);
        console.log(`   • Guaranteed Unique: Yes`);
        console.log(`   • Database Primary Key: Yes`);
        console.log(`   • Used in API Routes: /api/videos/[id]`);
        console.log('');
        console.log('✅ This UUID should be used as the video identifier in all operations!');
        
    } catch (error) {
        console.log('');
        console.log('❌ ANALYSIS FAILED');
        console.log('==================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Database connection issue');
        console.log('   - API endpoint not responding');
        console.log('   - No videos in database yet');
        console.log('   - Network connectivity problem');
    }
}

runAnalysis();
