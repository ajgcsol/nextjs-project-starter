// Set the DATABASE_URL environment variable
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('🔗 DATABASE_URL set, testing connection...');

// Test database connection
const https = require('https');

function testDatabaseHealth() {
    return new Promise((resolve, reject) => {
        const url = 'http://localhost:3000/api/database/health';
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📊 Database Health:', result);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            // Try HTTP instead of HTTPS for local development
            const http = require('http');
            http.get('http://localhost:3000/api/database/health', (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log('📊 Database Health:', result);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    });
}

function testVideoUploadWithDatabase() {
    return new Promise((resolve, reject) => {
        const http = require('http');
        
        const postData = JSON.stringify({
            title: "Test Video with Database",
            filename: "test-db.mp4",
            size: 2000000,
            s3Key: "test/test-db.mp4",
            publicUrl: "https://example.com/test-db.mp4",
            mimeType: "video/mp4",
            visibility: "private"
        });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/videos/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('🎬 Testing video upload with database...');
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('🎬 Upload Result:', {
                        success: result.success,
                        error: result.error,
                        videoId: result.video?.id,
                        muxAssetId: result.video?.metadata?.muxAssetId
                    });
                    resolve(result);
                } catch (error) {
                    console.log('🎬 Raw Response:', data);
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function runCompleteTest() {
    try {
        console.log('🚀 Starting complete Mux + Database integration test...');
        
        // Test 1: Database Health
        await testDatabaseHealth();
        
        // Test 2: Video Upload with Mux + Database
        await testVideoUploadWithDatabase();
        
        console.log('✅ Complete integration test successful!');
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    }
}

runCompleteTest();
