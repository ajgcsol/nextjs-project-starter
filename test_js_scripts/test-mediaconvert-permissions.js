// Test MediaConvert Permissions - Verify AWS credentials can access MediaConvert
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔐 MediaConvert Permissions Test');
console.log('================================');

// Test MediaConvert endpoint discovery (requires basic MediaConvert permissions)
function testEndpointDiscovery() {
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
        
        console.log('🔍 Testing MediaConvert endpoint discovery...');
        console.log('   This tests: mediaconvert:DescribeEndpoints permission');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 ENDPOINT DISCOVERY RESULT:');
                    console.log('=============================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    
                    if (result.success && result.endpoint) {
                        console.log('✅ MediaConvert endpoint discovery SUCCESSFUL');
                        console.log(`   Discovered endpoint: ${result.endpoint}`);
                        console.log('✅ AWS credentials have MediaConvert permissions');
                    } else {
                        console.log('❌ MediaConvert endpoint discovery FAILED');
                        console.log(`   Error: ${result.message || 'Unknown'}`);
                        console.log('❌ This indicates a permissions issue');
                    }
                    
                    resolve(result);
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

// Test role validation (requires IAM permissions)
function testRoleValidation() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            action: 'test-role',
            roleArn: 'arn:aws:iam::792298120704:role/MediaConvert-Role'
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
        
        console.log('');
        console.log('🔍 Testing MediaConvert role validation...');
        console.log('   This tests: iam:PassRole permission for MediaConvert');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 ROLE VALIDATION RESULT:');
                    console.log('==========================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    
                    if (result.success) {
                        console.log('✅ MediaConvert role validation SUCCESSFUL');
                        console.log('✅ IAM PassRole permission is working');
                    } else {
                        console.log('❌ MediaConvert role validation FAILED');
                        console.log(`   Error: ${result.message || 'Unknown'}`);
                        console.log('❌ This indicates an IAM PassRole issue');
                    }
                    
                    resolve(result);
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

// Analyze permissions based on test results
function analyzePermissions(endpointResult, roleResult) {
    console.log('');
    console.log('🔍 PERMISSIONS ANALYSIS:');
    console.log('========================');
    
    const hasMediaConvertAccess = endpointResult.success;
    const hasIAMPassRole = roleResult.success;
    
    console.log(`   MediaConvert Access: ${hasMediaConvertAccess ? '✅ YES' : '❌ NO'}`);
    console.log(`   IAM PassRole: ${hasIAMPassRole ? '✅ YES' : '❌ NO'}`);
    
    if (hasMediaConvertAccess && hasIAMPassRole) {
        console.log('');
        console.log('🎉 PERMISSIONS ARE CORRECT!');
        console.log('✅ AWS credentials have all required MediaConvert permissions');
        console.log('✅ The issue is likely the newline characters in environment variables');
        console.log('✅ The code fix should resolve the MediaConvert activation issue');
    } else {
        console.log('');
        console.log('❌ PERMISSIONS ISSUE DETECTED!');
        
        if (!hasMediaConvertAccess) {
            console.log('');
            console.log('🔧 MISSING: MediaConvert permissions');
            console.log('   Required policy:');
            console.log('   {');
            console.log('     "Effect": "Allow",');
            console.log('     "Action": ["mediaconvert:*"],');
            console.log('     "Resource": "*"');
            console.log('   }');
        }
        
        if (!hasIAMPassRole) {
            console.log('');
            console.log('🔧 MISSING: IAM PassRole permission');
            console.log('   Required policy:');
            console.log('   {');
            console.log('     "Effect": "Allow",');
            console.log('     "Action": ["iam:PassRole"],');
            console.log('     "Resource": "*",');
            console.log('     "Condition": {');
            console.log('       "StringLike": {');
            console.log('         "iam:PassedToService": ["mediaconvert.amazonaws.com"]');
            console.log('       }');
            console.log('     }');
            console.log('   }');
        }
    }
}

// Main execution
async function main() {
    try {
        console.log(`🚀 Testing MediaConvert permissions on: ${PRODUCTION_URL}`);
        console.log('');
        console.log('📋 Permissions being tested:');
        console.log('   1. mediaconvert:DescribeEndpoints (for endpoint discovery)');
        console.log('   2. iam:PassRole (for MediaConvert job creation)');
        console.log('');
        
        // Test endpoint discovery
        const endpointResult = await testEndpointDiscovery();
        
        // Test role validation
        const roleResult = await testRoleValidation();
        
        // Analyze results
        analyzePermissions(endpointResult, roleResult);
        
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('==============');
        
        if (endpointResult.success && roleResult.success) {
            console.log('1. ✅ Permissions are correct');
            console.log('2. 🔧 Deploy the newline fix (commit and push code changes)');
            console.log('3. 🧪 Test MediaConvert after deployment');
            console.log('4. 🎉 Expect real video thumbnails instead of SVG');
        } else {
            console.log('1. 🔧 Fix the identified permission issues');
            console.log('2. 🧪 Re-run this test to verify permissions');
            console.log('3. 🔧 Then deploy the newline fix');
            console.log('4. 🧪 Test MediaConvert after both fixes');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ PERMISSIONS TEST FAILED');
        console.log('==========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This indicates a network or API issue');
        console.log('   Check if the application is deployed and accessible');
    }
}

// Run the permissions test
main();
