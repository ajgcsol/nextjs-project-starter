// Test MediaConvert Environment Variables in Production
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔍 Testing MediaConvert Environment Variables');
console.log('============================================');

// Test MediaConvert setup API to see actual environment variable status
function testMediaConvertSetup() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/mediaconvert/setup`;
        
        console.log('🔧 Checking MediaConvert setup API...');
        console.log(`   URL: ${url}`);
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 MediaConvert Setup Response:');
                    console.log('===============================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Message: ${result.message}`);
                    
                    if (result.configuration) {
                        console.log('');
                        console.log('🔧 Configuration Details:');
                        console.log(`   Endpoint: "${result.configuration.endpoint}"`);
                        console.log(`   Role ARN: "${result.configuration.roleArn}"`);
                        console.log(`   Auto-discovered: ${result.configuration.autoDiscovered}`);
                        
                        // Check for issues
                        const endpoint = result.configuration.endpoint;
                        const roleArn = result.configuration.roleArn;
                        
                        console.log('');
                        console.log('🔍 Environment Variable Analysis:');
                        console.log('=================================');
                        
                        if (!endpoint || endpoint === 'null' || endpoint === 'undefined') {
                            console.log('❌ MEDIACONVERT_ENDPOINT: NOT SET or NULL');
                        } else if (endpoint.includes('\\r') || endpoint.includes('\\n')) {
                            console.log('❌ MEDIACONVERT_ENDPOINT: Contains carriage returns');
                            console.log(`   Raw value: "${endpoint}"`);
                        } else {
                            console.log('✅ MEDIACONVERT_ENDPOINT: Properly set');
                            console.log(`   Value: ${endpoint}`);
                        }
                        
                        if (!roleArn || roleArn === 'null' || roleArn === 'undefined') {
                            console.log('❌ MEDIACONVERT_ROLE_ARN: NOT SET or NULL');
                        } else if (roleArn.includes('\\r') || roleArn.includes('\\n')) {
                            console.log('❌ MEDIACONVERT_ROLE_ARN: Contains carriage returns');
                            console.log(`   Raw value: "${roleArn}"`);
                        } else {
                            console.log('✅ MEDIACONVERT_ROLE_ARN: Properly set');
                            console.log(`   Value: ${roleArn.substring(0, 50)}...`);
                        }
                    }
                    
                    if (result.missing && result.missing.length > 0) {
                        console.log('');
                        console.log('❌ Missing Items:');
                        result.missing.forEach(item => {
                            console.log(`   - ${item}`);
                        });
                    }
                    
                    if (result.instructions && result.instructions.length > 0) {
                        console.log('');
                        console.log('📋 Setup Instructions:');
                        result.instructions.forEach((instruction, index) => {
                            console.log(`   ${index + 1}. ${instruction.title}`);
                            console.log(`      ${instruction.description}`);
                        });
                    }
                    
                    if (result.error) {
                        console.log('');
                        console.log('❌ Error Details:');
                        console.log(`   ${result.error}`);
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data.substring(0, 500));
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Test AWS health check to see overall AWS status
function testAWSHealth() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/aws/health`;
        
        console.log('');
        console.log('🏥 Checking AWS Health...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 AWS Health Response:');
                    console.log('=======================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    
                    if (result.awsServices) {
                        console.log(`   Overall Status: ${result.awsServices.overall}`);
                        
                        if (result.awsServices.services) {
                            console.log('');
                            console.log('🔧 Service Status:');
                            Object.entries(result.awsServices.services).forEach(([service, status]) => {
                                const icon = status.status === 'healthy' ? '✅' : '❌';
                                console.log(`   ${icon} ${service}: ${status.status} - ${status.message}`);
                            });
                        }
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse AWS health response:', error.message);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log('❌ AWS health request failed:', error.message);
            reject(error);
        });
    });
}

// Main execution
async function main() {
    try {
        console.log(`🚀 Testing MediaConvert configuration on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Test MediaConvert setup
        const setupResult = await testMediaConvertSetup();
        
        // Test AWS health
        const healthResult = await testAWSHealth();
        
        console.log('');
        console.log('🎯 DIAGNOSIS SUMMARY:');
        console.log('=====================');
        
        if (setupResult.success) {
            console.log('✅ MediaConvert API reports success');
            
            if (setupResult.configuration && setupResult.configuration.endpoint && setupResult.configuration.roleArn) {
                console.log('✅ Both endpoint and role ARN are configured');
                console.log('');
                console.log('🤔 MYSTERY: MediaConvert appears configured but thumbnails still use SVG');
                console.log('');
                console.log('🔍 POSSIBLE CAUSES:');
                console.log('   1. Environment variables have invisible characters');
                console.log('   2. MediaConvert permissions are insufficient');
                console.log('   3. S3 video file is not accessible to MediaConvert');
                console.log('   4. MediaConvert job creation is failing silently');
                console.log('   5. AWS credentials don\'t have MediaConvert permissions');
                console.log('');
                console.log('🔧 NEXT STEPS:');
                console.log('   1. Check Vercel function logs for MediaConvert debug output');
                console.log('   2. Test MediaConvert permissions directly');
                console.log('   3. Verify S3 video file accessibility');
                console.log('   4. Test MediaConvert job creation manually');
            } else {
                console.log('❌ MediaConvert configuration is incomplete');
                console.log('   Missing endpoint or role ARN');
            }
        } else {
            console.log('❌ MediaConvert setup reports failure');
            console.log(`   Error: ${setupResult.message || 'Unknown'}`);
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ DIAGNOSIS FAILED');
        console.log('==================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates a network or API issue');
        console.log('   Check if the application is deployed and accessible');
    }
}

// Run the diagnosis
main();
