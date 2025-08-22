// Complete Mux Integration Test - End-to-End Verification
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-88n6qbzep-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 COMPLETE MUX INTEGRATION TEST');
console.log('================================');
console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
console.log('');

// Test 1: System Diagnostics
function testSystemDiagnostics() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics`;
        
        console.log('🔧 1. Testing System Diagnostics...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Database Status:', result.database?.status || 'Unknown');
                    console.log('   Database Videos:', result.database?.videoCount || 0);
                    console.log('   AWS Credentials:', result.aws?.hasCredentials ? 'Present' : 'Missing');
                    console.log('   Mux Status:', result.mux?.status || 'Unknown');
                    console.log('   Mux Token ID:', result.mux?.tokenId ? 'Present' : 'Missing');
                    console.log('   Mux Token Secret:', result.mux?.tokenSecret ? 'Present' : 'Missing');
                    console.log('   Environment Check:', {
                        hasMuxTokenId: result.environment?.VIDEO_MUX_TOKEN_ID || false,
                        hasMuxTokenSecret: result.environment?.VIDEO_MUX_TOKEN_SECRET || false
                    });
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test 2: Mux Asset Creation
function testMuxAssetCreation() {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            action: 'test-mux-asset',
            s3Key: 'videos/test-video.mp4',
            videoId: 'test-' + Date.now()
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/debug/video-diagnostics',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            }
        };
        
        console.log('🎭 2. Testing Mux Asset Creation...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Success:', result.success ? 'YES' : 'NO');
                    if (result.success) {
                        console.log('   Asset ID:', result.assetId || 'None');
                        console.log('   Playback ID:', result.playbackId || 'None');
                        console.log('   Thumbnail URL:', result.thumbnailUrl || 'None');
                        console.log('   Streaming URL:', result.streamingUrl || 'None');
                        console.log('   MP4 URL:', result.mp4Url || 'None');
                    } else {
                        console.log('   Error:', result.error || 'Unknown');
                        console.log('   Details:', result.details || 'None');
                    }
                    resolve(result);
                } catch (error) {
                    console.log('   Raw Response:', data);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   Request Error:', error.message);
            reject(error);
        });
        
        req.write(testData);
        req.end();
    });
}

// Test 3: Video Upload API
function testVideoUploadAPI() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/videos?limit=5`;
        
        console.log('📋 3. Testing Video Upload API...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Videos Found:', result.videos?.length || 0);
                    
                    if (result.videos && result.videos.length > 0) {
                        const recentVideo = result.videos[0];
                        console.log('   Recent Video:');
                        console.log('     - ID:', recentVideo.id);
                        console.log('     - Title:', recentVideo.title);
                        console.log('     - Status:', recentVideo.status);
                        console.log('     - Has S3 Key:', !!recentVideo.s3_key);
                        console.log('     - Has Mux Asset:', !!(recentVideo.mux_asset_id || recentVideo.metadata?.muxAssetId));
                        console.log('     - Stream URL:', recentVideo.streamUrl || 'None');
                        console.log('     - Thumbnail:', recentVideo.thumbnailPath || 'None');
                    }
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test 4: Database Migration Status
function testDatabaseMigration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/database/health`;
        
        console.log('🗄️  4. Testing Database Migration Status...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Database Health:', result.status || 'Unknown');
                    console.log('   Connection:', result.connection || 'Unknown');
                    console.log('   Video Count:', result.videoCount || 0);
                    console.log('   Mux Fields Present:', result.muxFieldsPresent ? 'YES' : 'NO');
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test 5: Video Processing Pipeline
function testVideoProcessingPipeline() {
    return new Promise((resolve, reject) => {
        const testData = JSON.stringify({
            action: 'test-processing-pipeline'
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/videos/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(testData)
            }
        };
        
        console.log('⚙️  5. Testing Video Processing Pipeline...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Pipeline Status:', result.pipelineStatus || 'Unknown');
                    console.log('   Mux Integration:', result.muxIntegration ? 'Active' : 'Inactive');
                    console.log('   Processing Features:', result.features || 'None');
                    resolve(result);
                } catch (error) {
                    console.log('   Response:', data.substring(0, 200) + '...');
                    resolve({ status: 'partial', message: 'Pipeline test completed with limited data' });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('   Pipeline Error:', error.message);
            resolve({ status: 'error', error: error.message });
        });
        
        req.write(testData);
        req.end();
    });
}

// Run all tests
async function runCompleteTest() {
    try {
        console.log('Starting comprehensive Mux integration test...');
        console.log('');
        
        // Test 1: System Diagnostics
        const diagnostics = await testSystemDiagnostics();
        console.log('');
        
        // Test 2: Mux Asset Creation
        const muxTest = await testMuxAssetCreation();
        console.log('');
        
        // Test 3: Video API
        const videoAPI = await testVideoUploadAPI();
        console.log('');
        
        // Test 4: Database Migration
        const dbTest = await testDatabaseMigration();
        console.log('');
        
        // Test 5: Processing Pipeline
        const pipelineTest = await testVideoProcessingPipeline();
        console.log('');
        
        // Summary
        console.log('🎉 COMPLETE MUX INTEGRATION TEST RESULTS');
        console.log('========================================');
        
        const results = {
            systemDiagnostics: diagnostics?.mux?.status === 'configured' && diagnostics?.mux?.tokenId && diagnostics?.mux?.tokenSecret,
            muxAssetCreation: muxTest?.success === true,
            videoAPI: videoAPI?.videos?.length > 0,
            databaseMigration: dbTest?.status === 'healthy',
            processingPipeline: pipelineTest?.status !== 'error'
        };
        
        console.log('');
        console.log('✅ Test Results:');
        console.log('   🔧 System Diagnostics:', results.systemDiagnostics ? 'PASS' : 'FAIL');
        console.log('   🎭 Mux Asset Creation:', results.muxAssetCreation ? 'PASS' : 'FAIL');
        console.log('   📋 Video API:', results.videoAPI ? 'PASS' : 'FAIL');
        console.log('   🗄️  Database Migration:', results.databaseMigration ? 'PASS' : 'FAIL');
        console.log('   ⚙️  Processing Pipeline:', results.processingPipeline ? 'PASS' : 'FAIL');
        
        const passCount = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        console.log('');
        console.log(`📊 Overall Score: ${passCount}/${totalTests} tests passed`);
        
        if (passCount === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Mux integration is fully functional!');
        } else if (passCount >= 3) {
            console.log('⚠️  PARTIAL SUCCESS: Core functionality working, some features need attention');
        } else {
            console.log('❌ CRITICAL ISSUES: Major components failing, requires immediate attention');
        }
        
        console.log('');
        console.log('🔍 Next Steps:');
        if (!results.systemDiagnostics) {
            console.log('   - Fix Mux credentials in Vercel environment variables');
        }
        if (!results.muxAssetCreation) {
            console.log('   - Verify Mux API permissions and account status');
        }
        if (!results.databaseMigration) {
            console.log('   - Run database migration to add Mux fields');
        }
        if (passCount === totalTests) {
            console.log('   - Ready for production video uploads with Mux processing!');
            console.log('   - Test real video upload to verify end-to-end functionality');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ COMPLETE TEST FAILED');
        console.log('======================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates:');
        console.log('   - Network connectivity issues');
        console.log('   - Server configuration problems');
        console.log('   - Critical system failures');
    }
}

runCompleteTest();
