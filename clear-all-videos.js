// Clear All Videos from Database and S3
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🗑️ Clearing All Videos from Database and S3...');
console.log('===============================================');

// Function to get all videos
function getAllVideos() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos`;
        
        console.log('📋 Getting list of all videos...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.videos) {
                        console.log(`✅ Found ${result.videos.length} videos to delete`);
                        resolve(result.videos);
                    } else {
                        reject(new Error('Failed to get videos list'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Function to delete a single video
function deleteVideo(videoId) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: `/api/videos/${videoId}`,
            method: 'DELETE'
        };
        
        console.log(`🗑️ Deleting video: ${videoId}`);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`   ✅ Successfully deleted: ${videoId}`);
                    resolve(true);
                } else {
                    console.log(`   ❌ Failed to delete: ${videoId} (Status: ${res.statusCode})`);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ Error deleting ${videoId}:`, error.message);
            resolve(false);
        });
        
        req.end();
    });
}

// Main function to clear all videos
async function clearAllVideos() {
    try {
        console.log(`🚀 Starting cleanup on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Get all videos
        const videos = await getAllVideos();
        
        if (videos.length === 0) {
            console.log('✅ No videos found - database is already clean!');
            return;
        }
        
        console.log('');
        console.log('🗑️ Starting deletion process...');
        console.log('');
        
        let successCount = 0;
        let failCount = 0;
        
        // Delete videos one by one with a small delay
        for (const video of videos) {
            const success = await deleteVideo(video.id);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('');
        console.log('📊 CLEANUP SUMMARY');
        console.log('==================');
        console.log(`✅ Successfully deleted: ${successCount} videos`);
        console.log(`❌ Failed to delete: ${failCount} videos`);
        console.log(`📁 Total processed: ${videos.length} videos`);
        console.log('');
        
        if (successCount === videos.length) {
            console.log('🎉 ALL VIDEOS SUCCESSFULLY DELETED!');
            console.log('💡 Database is now clean and ready for new Mux-powered uploads');
        } else {
            console.log('⚠️ Some videos could not be deleted - check the logs above');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ CLEANUP FAILED');
        console.log('=================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Network connectivity issue');
        console.log('   - API endpoint problem');
        console.log('   - Database connection issue');
    }
}

clearAllVideos();
