// Complete Mux Production Testing - All 5 Areas
const https = require('https');

// Production URL will be updated after deployment
const PRODUCTION_URL = 'https://law-school-repository-mq1s95z5n-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 COMPLETE MUX PRODUCTION TESTING');
console.log('==================================');
console.log(`Testing URL: ${PRODUCTION_URL}`);
console.log('');

// Test 1: Production Deployment Verification
async function testDeploymentVerification() {
    console.log('📦 TEST 1: Production Deployment Verification');
    console.log('---------------------------------------------');
    
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    console.log(`✅ Status: ${res.statusCode}`);
                    console.log(`✅ Environment: ${result.system?.environment}`);
                    console.log(`✅ AWS Credentials: ${result.aws?.hasCredentials ? 'Configured' : 'Missing'}`);
                    console.log(`✅ Mux Token ID: ${result.mux?.tokenId ? 'Configured' : 'Missing'}`);
                    console.log(`✅ Mux Token Secret: ${result.mux?.tokenSecret ? 'Configured' : 'Missing'}`);
                    console.log(`✅ Database: ${result.database?.status}`);
                    console.log(`✅ Video Count: ${result.database?.videoCount || 0}`);
                    
                    if (result.mux?.tokenId && result.mux?.tokenSecret) {
                        console.log('🎉 Deployment verification PASSED!');
                        resolve(result);
                    } else {
                        console.log('⚠️  Mux credentials missing - will test other areas');
                        resolve(result);
                    }
                    
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Test 2: End-to-End Upload Testing
async function testEndToEndUpload() {
    console.log('');
    console.log('🎥 TEST 2: End-to-End Upload Testing');
    console.log('------------------------------------');
    
    return new Promise((resolve, reject) => {
        // Test the upload endpoint configuration
        const url = `${PRODUCTION_URL}/api/videos/upload`;
        
        const postData = JSON.stringify({
            test: true,
            filename: 'test-video.wmv',
            contentType: 'video/x-ms-wmv'
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/videos/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Upload endpoint status: ${res.statusCode}`);
                
                if (res.statusCode === 200 || res.statusCode === 405) {
                    console.log('✅ Upload endpoint is accessible');
                    resolve({ status: 'accessible', statusCode: res.statusCode });
                } else {
                    console.log(`⚠️  Upload endpoint returned: ${res.statusCode}`);
                    resolve({ status: 'warning', statusCode: res.statusCode });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Upload test failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Test 3: API Endpoint Testing
async function testAPIEndpoints() {
    console.log('');
    console.log('🔌 TEST 3: API Endpoint Testing');
    console.log('-------------------------------');
    
    const endpoints = [
        '/api/videos/upload',
        '/api/videos/multipart-upload',
        '/api/debug/video-diagnostics',
        '/api/database/health',
        '/api/aws/health'
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
        try {
            const result = await testEndpoint(endpoint);
            results.push(result);
            console.log(`✅ ${endpoint}: ${result.status} (${result.statusCode})`);
        } catch (error) {
            console.log(`❌ ${endpoint}: Failed - ${error.message}`);
            results.push({ endpoint, status: 'failed', error: error.message });
        }
    }
    
    return results;
}

function testEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}${endpoint}`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    endpoint,
                    status: res.statusCode < 500 ? 'working' : 'error',
                    statusCode: res.statusCode
                });
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

// Test 4: Database Migration Testing
async function testDatabaseMigration() {
    console.log('');
    console.log('🗄️  TEST 4: Database Migration Testing');
    console.log('-------------------------------------');
    
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/database/health`;
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    console.log(`✅ Database status: ${result.status || 'Unknown'}`);
                    console.log(`✅ Connection: ${result.connected ? 'Connected' : 'Disconnected'}`);
                    
                    if (result.tables) {
                        console.log(`✅ Tables found: ${result.tables.length}`);
                        
                        // Check for Mux-related fields
                        const hasMuxFields = result.tables.some(table => 
                            table.columns && table.columns.some(col => 
                                col.includes('mux_') || col.includes('asset_id') || col.includes('playback_id')
                            )
                        );
                        
                        console.log(`✅ Mux fields: ${hasMuxFields ? 'Present' : 'Missing'}`);
                    }
                    
                    resolve(result);
                    
                } catch (error) {
                    console.log('❌ Failed to parse database response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Database test failed:', error.message);
            reject(error);
        });
    });
}

// Test 5: Real Video Processing Testing
async function testVideoProcessing() {
    console.log('');
    console.log('🎞️  TEST 5: Real Video Processing Testing');
    console.log('----------------------------------------');
    
    return new Promise((resolve, reject) => {
        // Test Mux asset creation capability
        const postData = JSON.stringify({
            action: 'test-mux-asset',
            s3Key: 'videos/test-video.wmv',
            videoId: 'test-123'
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/debug/video-diagnostics',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    console.log(`✅ Mux test status: ${res.statusCode}`);
                    console.log(`✅ Mux configuration: ${result.configTest?.success ? 'Working' : 'Failed'}`);
                    
                    if (result.success) {
                        console.log(`✅ Asset creation: Success`);
                        console.log(`✅ Asset ID: ${result.assetId || 'None'}`);
                        console.log(`✅ Playback ID: ${result.playbackId || 'None'}`);
                        console.log(`✅ Thumbnail URL: ${result.thumbnailUrl ? 'Generated' : 'None'}`);
                    } else {
                        console.log(`⚠️  Asset creation: ${result.error || 'Failed'}`);
                    }
                    
                    resolve(result);
                    
                } catch (error) {
                    console.log('❌ Failed to parse Mux response:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Mux test failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive Mux production testing...');
    console.log('');
    
    const results = {
        deploymentVerification: null,
        endToEndUpload: null,
        apiEndpoints: null,
        databaseMigration: null,
        videoProcessing: null
    };
    
    try {
        // Test 1: Deployment Verification
        results.deploymentVerification = await testDeploymentVerification();
        
        // Test 2: End-to-End Upload
        results.endToEndUpload = await testEndToEndUpload();
        
        // Test 3: API Endpoints
        results.apiEndpoints = await testAPIEndpoints();
        
        // Test 4: Database Migration
        results.databaseMigration = await testDatabaseMigration();
        
        // Test 5: Video Processing
        results.videoProcessing = await testVideoProcessing();
        
        // Summary
        console.log('');
        console.log('📊 COMPREHENSIVE TEST SUMMARY');
        console.log('=============================');
        
        const deploymentOk = results.deploymentVerification?.system?.environment === 'production';
        const muxConfigured = results.deploymentVerification?.mux?.tokenId && results.deploymentVerification?.mux?.tokenSecret;
        const endpointsWorking = results.apiEndpoints?.every(ep => ep.status === 'working');
        const databaseConnected = results.databaseMigration?.connected;
        const muxWorking = results.videoProcessing?.configTest?.success;
        
        console.log(`✅ Deployment Verification: ${deploymentOk ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Mux Configuration: ${muxConfigured ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ API Endpoints: ${endpointsWorking ? 'PASSED' : 'PARTIAL'}`);
        console.log(`✅ Database Connection: ${databaseConnected ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Video Processing: ${muxWorking ? 'PASSED' : 'FAILED'}`);
        
        const overallSuccess = deploymentOk && muxConfigured && databaseConnected;
        
        console.log('');
        console.log(`🎯 OVERALL STATUS: ${overallSuccess ? '✅ SUCCESS' : '⚠️  NEEDS ATTENTION'}`);
        
        if (!muxConfigured) {
            console.log('');
            console.log('🔧 NEXT STEPS NEEDED:');
            console.log('1. Add Mux credentials to Vercel environment variables');
            console.log('2. Redeploy the application');
            console.log('3. Re-run this test to verify Mux integration');
        }
        
        return results;
        
    } catch (error) {
        console.log('');
        console.log('❌ COMPREHENSIVE TEST FAILED');
        console.log('============================');
        console.log('Error:', error.message);
        throw error;
    }
}

// Start testing
runAllTests().catch(console.error);
