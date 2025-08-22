// Simple Mux Debug Test - Isolate the Issue
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-88n6qbzep-andrew-j-gregwares-projects.vercel.app';

console.log('🔧 SIMPLE MUX DEBUG TEST');
console.log('========================');

// Test 1: GET request (working)
function testGet() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics`;
        
        console.log('✅ Testing GET request...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Mux Token ID:', result.mux?.tokenId ? 'Present' : 'Missing');
                    console.log('   Mux Token Secret:', result.mux?.tokenSecret ? 'Present' : 'Missing');
                    console.log('   Environment Check:', result.environment);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test 2: Simple POST request
function testPost() {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            action: 'test-mux-asset',
            s3Key: 'videos/test.mp4',
            videoId: 'test-123'
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/debug/video-diagnostics',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            },
            timeout: 10000 // 10 second timeout
        };
        
        console.log('🔄 Testing POST request...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            console.log('   Response Status:', res.statusCode);
            console.log('   Response Headers:', res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
                console.log('   Data chunk received:', chunk.length, 'bytes');
            });
            
            res.on('end', () => {
                console.log('   Total response length:', data.length);
                console.log('   Raw response:', data.substring(0, 500));
                
                if (data.length === 0) {
                    resolve({ 
                        success: false, 
                        error: 'Empty response - server likely crashed or timed out',
                        statusCode: res.statusCode,
                        headers: res.headers
                    });
                    return;
                }
                
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    resolve({ 
                        success: false, 
                        error: 'Invalid JSON response',
                        rawResponse: data,
                        parseError: error.message
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   Request Error:', error.message);
            resolve({ 
                success: false, 
                error: 'Request failed: ' + error.message 
            });
        });
        
        req.on('timeout', () => {
            console.log('   Request timed out');
            req.destroy();
            resolve({ 
                success: false, 
                error: 'Request timed out after 10 seconds' 
            });
        });
        
        req.write(testData);
        req.end();
    });
}

// Run tests
async function runSimpleTest() {
    try {
        console.log(`🚀 Testing: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test GET
        const getResult = await testGet();
        console.log('');
        
        // Test POST
        const postResult = await testPost();
        console.log('');
        
        console.log('📊 SIMPLE DEBUG RESULTS');
        console.log('=======================');
        console.log('GET Request:', getResult.mux?.status || 'Failed');
        console.log('POST Request:', postResult.success ? 'Success' : 'Failed');
        
        if (!postResult.success) {
            console.log('POST Error:', postResult.error);
            console.log('Status Code:', postResult.statusCode);
            
            if (postResult.statusCode === 500) {
                console.log('');
                console.log('💡 Server Error (500) indicates:');
                console.log('   - Code is crashing in the POST handler');
                console.log('   - Likely Mux SDK initialization failure');
                console.log('   - Environment variable loading issue');
            } else if (postResult.statusCode === 504) {
                console.log('');
                console.log('💡 Gateway Timeout (504) indicates:');
                console.log('   - Function execution timeout');
                console.log('   - Mux API call hanging');
                console.log('   - Network connectivity issue');
            }
        }
        
    } catch (error) {
        console.log('❌ Simple test failed:', error.message);
    }
}

runSimpleTest();
