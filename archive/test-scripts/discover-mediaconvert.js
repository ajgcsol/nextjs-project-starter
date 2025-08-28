// Simple MediaConvert Discovery Script
// Uses existing AWS integration from the project

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎬 MediaConvert Discovery & Activation');
console.log('=====================================');

// Test MediaConvert setup via the existing API
function testMediaConvertSetup() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔍 Testing MediaConvert configuration...');
        console.log(`   URL: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.success) {
                        console.log('✅ MediaConvert is already configured!');
                        console.log(`   Endpoint: ${result.configuration.endpoint}`);
                        console.log(`   Role ARN: ${result.configuration.roleArn}`);
                        console.log(`   Auto-discovered: ${result.configuration.autoDiscovered}`);
                        resolve(result);
                    } else {
                        console.log('⚠️  MediaConvert needs configuration');
                        console.log(`   Missing: ${result.missing ? result.missing.join(', ') : 'Unknown'}`);
                        
                        if (result.current && result.current.autoDiscoveredEndpoint) {
                            console.log(`   ✅ Endpoint discovered: ${result.current.autoDiscoveredEndpoint}`);
                        }
                        
                        if (result.instructions) {
                            console.log('');
                            console.log('📋 Setup Instructions:');
                            result.instructions.forEach((instruction, index) => {
                                console.log(`   ${instruction.step}. ${instruction.title}`);
                                console.log(`      ${instruction.description}`);
                                if (instruction.url) {
                                    console.log(`      URL: ${instruction.url}`);
                                }
                            });
                        }
                        
                        if (result.vercelSetup) {
                            console.log('');
                            console.log('🚀 Vercel Environment Variables:');
                            result.vercelSetup.variables.forEach(variable => {
                                console.log(`   ${variable.name}=${variable.value}`);
                                console.log(`   # ${variable.description}`);
                            });
                        }
                        
                        resolve(result);
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

// Discover MediaConvert endpoint via API
function discoverEndpoint() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            action: 'discover-endpoint'
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
        
        console.log('🔍 Discovering MediaConvert endpoint...');
        
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
                        console.log('✅ MediaConvert endpoint discovered!');
                        console.log(`   Endpoint: ${result.endpoint}`);
                        
                        if (result.instructions) {
                            console.log('');
                            console.log('📋 Next Steps:');
                            result.instructions.steps.forEach((step, index) => {
                                console.log(`   ${index + 1}. ${step}`);
                            });
                        }
                        
                        resolve(result);
                    } else {
                        console.log('❌ Endpoint discovery failed');
                        console.log(`   Error: ${result.message}`);
                        reject(new Error(result.message));
                    }
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

// Test AWS health to see current status
function testAWSHealth() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/aws/health`;
        
        console.log('🏥 Testing AWS services health...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.overall === 'healthy') {
                        console.log('✅ All AWS services are healthy');
                    } else {
                        console.log('⚠️  Some AWS services need attention');
                    }
                    
                    if (result.services) {
                        console.log('   Service Status:');
                        Object.entries(result.services).forEach(([service, status]) => {
                            const icon = status.status === 'healthy' ? '✅' : '❌';
                            console.log(`     ${icon} ${service}: ${status.message}`);
                        });
                    }
                    
                    resolve(result);
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

// Main execution
async function main() {
    try {
        console.log(`🚀 Testing MediaConvert on: ${PRODUCTION_URL}`);
        console.log('');
        
        // First check AWS health
        await testAWSHealth();
        console.log('');
        
        // Test MediaConvert setup
        const setupResult = await testMediaConvertSetup();
        console.log('');
        
        // If MediaConvert is not configured, try to discover endpoint
        if (!setupResult.success) {
            try {
                await discoverEndpoint();
            } catch (error) {
                console.log('⚠️  Endpoint discovery failed, but that\'s okay');
                console.log('   You can still set up MediaConvert manually');
            }
        }
        
        console.log('');
        console.log('🎯 SUMMARY');
        console.log('==========');
        
        if (setupResult.success) {
            console.log('✅ MediaConvert is ACTIVE and ready to use!');
            console.log('✅ Real thumbnail generation is available');
            console.log('✅ WMV conversion is available');
            console.log('');
            console.log('🎉 Your video processing system is fully functional!');
        } else {
            console.log('⚠️  MediaConvert needs configuration');
            console.log('');
            console.log('🔧 TO ACTIVATE MEDIACONVERT:');
            console.log('');
            console.log('1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/home#/roles');
            console.log('2. Create role → AWS service → MediaConvert');
            console.log('3. Name it: MediaConvert-Role');
            console.log('4. Copy the Role ARN');
            console.log('');
            console.log('5. Add to Vercel environment variables:');
            console.log('   MEDIACONVERT_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT:role/MediaConvert-Role');
            
            if (setupResult.current && setupResult.current.autoDiscoveredEndpoint) {
                console.log(`   MEDIACONVERT_ENDPOINT=${setupResult.current.autoDiscoveredEndpoint}`);
            }
            
            console.log('');
            console.log('6. Redeploy your Vercel application');
            console.log('');
            console.log('💡 The endpoint can be auto-discovered, you just need the IAM role!');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ DISCOVERY FAILED');
        console.log('==================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Network connectivity issue');
        console.log('   - Application deployment issue');
        console.log('   - AWS credentials not configured in Vercel');
        console.log('');
        console.log('🔧 Try accessing the application directly:');
        console.log(`   ${PRODUCTION_URL}/api/aws/health`);
    }
}

// Run the discovery
main();
