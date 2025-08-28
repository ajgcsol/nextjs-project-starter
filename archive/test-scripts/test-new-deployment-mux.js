const https = require('https');

// Test the new deployment URL
const NEW_DEPLOYMENT_URL = 'https://law-school-repository-3znstzezc-andrew-j-gregwares-projects.vercel.app';

async function testNewDeployment() {
    console.log('🚀 Testing New Deployment with Mux Integration...');
    console.log('🌐 Target URL:', NEW_DEPLOYMENT_URL);
    
    try {
        // Test 1: Check if the application is accessible
        console.log('\n📊 Step 1: Testing application accessibility...');
        const healthCheck = await makeRequest('/api/database/health', 'GET');
        console.log('✅ Application is accessible:', healthCheck.status || 'OK');
        
        // Test 2: Check Mux integration status
        console.log('\n📊 Step 2: Testing Mux integration...');
        const muxStatus = await makeRequest('/api/database/migrate-mux', 'GET');
        console.log('🎭 Mux Status:', {
            columnsFound: muxStatus.summary?.columnsFound || 'unknown',
            tablesFound: muxStatus.summary?.tablesFound || 'unknown',
            migrationComplete: muxStatus.summary?.migrationComplete || false
        });
        
        // Test 3: Test video upload with thumbnail generation
        console.log('\n📊 Step 3: Testing video upload with thumbnails...');
        const uploadData = {
            title: 'Test Video - New Deployment',
            description: 'Testing Mux thumbnail generation after deployment',
            category: 'Test',
            tags: 'test,mux,thumbnail',
            visibility: 'private',
            s3Key: 'test-videos/test-deployment.mp4',
            publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test-videos/test-deployment.mp4',
            filename: 'test-deployment.mp4',
            size: 5242880,
            mimeType: 'video/mp4'
        };
        
        const uploadResult = await makeRequest('/api/videos/upload', 'POST', uploadData);
        console.log('📤 Upload Result:', {
            success: uploadResult.success,
            videoId: uploadResult.video?.id,
            hasThumbnail: !!uploadResult.video?.thumbnailPath,
            thumbnailPath: uploadResult.video?.thumbnailPath,
            isMuxThumbnail: uploadResult.video?.thumbnailPath?.includes('image.mux.com')
        });
        
        if (uploadResult.success && uploadResult.video?.thumbnailPath?.includes('image.mux.com')) {
            console.log('🎉 SUCCESS: Mux thumbnail generation is working!');
            console.log('🖼️ Thumbnail URL:', uploadResult.video.thumbnailPath);
            return true;
        } else {
            console.log('⚠️ Mux thumbnail generation may not be working yet');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Deployment test failed:', error.message);
        return false;
    }
}

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'law-school-repository-3znstzezc-andrew-j-gregwares-projects.vercel.app',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Deployment-Test/1.0'
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonResponse);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${jsonResponse.error || responseData}`));
                    }
                } catch (parseError) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ message: responseData, status: 'OK' });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Run the test
testNewDeployment().then(success => {
    if (success) {
        console.log('\n🎯 New deployment test PASSED!');
        console.log('✅ Mux integration is working on the new deployment');
        process.exit(0);
    } else {
        console.log('\n⚠️ New deployment test needs attention');
        console.log('🔧 Check Mux credentials and environment variables');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});
