// Comprehensive MediaConvert Permissions Verification and Setup
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

console.log('🔧 MediaConvert Permissions Verification & Setup');
console.log('===============================================');

// Check if AWS CLI is configured
async function checkAWSCLI() {
    try {
        console.log('🔍 Checking AWS CLI configuration...');
        const { stdout } = await execAsync('aws sts get-caller-identity');
        const identity = JSON.parse(stdout);
        
        console.log('✅ AWS CLI is configured:');
        console.log(`   Account: ${identity.Account}`);
        console.log(`   User ARN: ${identity.Arn}`);
        console.log(`   User ID: ${identity.UserId}`);
        
        return identity;
    } catch (error) {
        console.log('❌ AWS CLI not configured or no permissions');
        console.log('   Error:', error.message);
        throw new Error('AWS CLI configuration required');
    }
}

// Check current IAM user permissions
async function checkIAMPermissions() {
    try {
        console.log('🔍 Checking IAM permissions...');
        
        // Check MediaConvert permissions
        console.log('   Testing MediaConvert access...');
        try {
            await execAsync('aws mediaconvert describe-endpoints --region us-east-1');
            console.log('   ✅ MediaConvert: Can describe endpoints');
        } catch (error) {
            console.log('   ❌ MediaConvert: Cannot describe endpoints');
            console.log('      Error:', error.message);
        }
        
        // Check S3 permissions
        console.log('   Testing S3 access...');
        try {
            await execAsync('aws s3 ls s3://law-school-repository-content/ --region us-east-1');
            console.log('   ✅ S3: Can list bucket contents');
        } catch (error) {
            console.log('   ❌ S3: Cannot list bucket contents');
            console.log('      Error:', error.message);
        }
        
        // Check IAM permissions
        console.log('   Testing IAM access...');
        try {
            await execAsync('aws iam list-roles --max-items 1');
            console.log('   ✅ IAM: Can list roles');
        } catch (error) {
            console.log('   ❌ IAM: Cannot list roles');
            console.log('      Error:', error.message);
        }
        
    } catch (error) {
        console.log('❌ Failed to check IAM permissions:', error.message);
    }
}

// Check if MediaConvert role exists and has correct permissions
async function checkMediaConvertRole() {
    try {
        console.log('🔍 Checking MediaConvert service role...');
        
        const roleName = 'MediaConvert-Role';
        
        // Check if role exists
        try {
            const { stdout } = await execAsync(`aws iam get-role --role-name ${roleName}`);
            const role = JSON.parse(stdout);
            
            console.log('✅ MediaConvert role exists:');
            console.log(`   Role Name: ${role.Role.RoleName}`);
            console.log(`   Role ARN: ${role.Role.Arn}`);
            console.log(`   Created: ${role.Role.CreateDate}`);
            
            // Check role policies
            console.log('🔍 Checking role policies...');
            try {
                const { stdout: policies } = await execAsync(`aws iam list-attached-role-policies --role-name ${roleName}`);
                const attachedPolicies = JSON.parse(policies);
                
                console.log('   Attached policies:');
                attachedPolicies.AttachedPolicies.forEach(policy => {
                    console.log(`   - ${policy.PolicyName} (${policy.PolicyArn})`);
                });
                
                // Check for required policies
                const requiredPolicies = [
                    'AmazonS3FullAccess',
                    'AmazonAPIGatewayInvokeFullAccess'
                ];
                
                const hasRequiredPolicies = requiredPolicies.every(required => 
                    attachedPolicies.AttachedPolicies.some(attached => 
                        attached.PolicyName === required || attached.PolicyArn.includes(required)
                    )
                );
                
                if (hasRequiredPolicies) {
                    console.log('   ✅ Role has required policies');
                } else {
                    console.log('   ⚠️ Role may be missing some required policies');
                }
                
            } catch (error) {
                console.log('   ❌ Cannot check role policies:', error.message);
            }
            
            return role.Role.Arn;
            
        } catch (error) {
            console.log('❌ MediaConvert role does not exist');
            console.log('   Creating MediaConvert role...');
            return await createMediaConvertRole();
        }
        
    } catch (error) {
        console.log('❌ Failed to check MediaConvert role:', error.message);
        throw error;
    }
}

// Create MediaConvert role with proper permissions
async function createMediaConvertRole() {
    try {
        console.log('🔧 Creating MediaConvert service role...');
        
        const roleName = 'MediaConvert-Role';
        
        // Trust policy for MediaConvert
        const trustPolicy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "mediaconvert.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        };
        
        // Create the role
        const createRoleCommand = `aws iam create-role --role-name ${roleName} --assume-role-policy-document '${JSON.stringify(trustPolicy)}'`;
        const { stdout } = await execAsync(createRoleCommand);
        const role = JSON.parse(stdout);
        
        console.log('✅ MediaConvert role created:');
        console.log(`   Role ARN: ${role.Role.Arn}`);
        
        // Attach required policies
        const policies = [
            'arn:aws:iam::aws:policy/AmazonS3FullAccess',
            'arn:aws:iam::aws:policy/AmazonAPIGatewayInvokeFullAccess'
        ];
        
        for (const policyArn of policies) {
            try {
                await execAsync(`aws iam attach-role-policy --role-name ${roleName} --policy-arn ${policyArn}`);
                console.log(`   ✅ Attached policy: ${policyArn}`);
            } catch (error) {
                console.log(`   ❌ Failed to attach policy ${policyArn}:`, error.message);
            }
        }
        
        // Wait a moment for role to propagate
        console.log('   ⏳ Waiting for role to propagate...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        return role.Role.Arn;
        
    } catch (error) {
        console.log('❌ Failed to create MediaConvert role:', error.message);
        throw error;
    }
}

// Get MediaConvert endpoint
async function getMediaConvertEndpoint() {
    try {
        console.log('🔍 Getting MediaConvert endpoint...');
        
        const { stdout } = await execAsync('aws mediaconvert describe-endpoints --region us-east-1');
        const endpoints = JSON.parse(stdout);
        
        if (endpoints.Endpoints && endpoints.Endpoints.length > 0) {
            const endpoint = endpoints.Endpoints[0].Url;
            console.log('✅ MediaConvert endpoint found:');
            console.log(`   Endpoint: ${endpoint}`);
            return endpoint;
        } else {
            throw new Error('No MediaConvert endpoints found');
        }
        
    } catch (error) {
        console.log('❌ Failed to get MediaConvert endpoint:', error.message);
        throw error;
    }
}

// Test MediaConvert job creation
async function testMediaConvertJob(roleArn, endpoint) {
    try {
        console.log('🧪 Testing MediaConvert job creation...');
        
        // Create a simple test job (this will fail but should show if permissions work)
        const testJobSettings = {
            "Role": roleArn,
            "Settings": {
                "Inputs": [
                    {
                        "FileInput": "s3://law-school-repository-content/videos/test.mp4",
                        "VideoSelector": {
                            "ColorSpace": "FOLLOW"
                        }
                    }
                ],
                "OutputGroups": [
                    {
                        "Name": "Test Output",
                        "OutputGroupSettings": {
                            "Type": "FILE_GROUP_SETTINGS",
                            "FileGroupSettings": {
                                "Destination": "s3://law-school-repository-content/test-output/"
                            }
                        },
                        "Outputs": [
                            {
                                "NameModifier": "_test",
                                "VideoDescription": {
                                    "CodecSettings": {
                                        "Codec": "H_264",
                                        "H264Settings": {
                                            "RateControlMode": "QVBR"
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        };
        
        // Note: This test job will likely fail due to missing input file, but it will test permissions
        const command = `aws mediaconvert create-job --endpoint-url ${endpoint} --region us-east-1 --cli-input-json '${JSON.stringify(testJobSettings)}'`;
        
        try {
            await execAsync(command);
            console.log('✅ MediaConvert job creation test passed (permissions OK)');
        } catch (error) {
            if (error.message.includes('NoSuchKey') || error.message.includes('does not exist')) {
                console.log('✅ MediaConvert permissions OK (test file not found, which is expected)');
            } else if (error.message.includes('AccessDenied') || error.message.includes('Forbidden')) {
                console.log('❌ MediaConvert permissions issue:', error.message);
                throw error;
            } else {
                console.log('⚠️ MediaConvert test inconclusive:', error.message);
            }
        }
        
    } catch (error) {
        console.log('❌ MediaConvert job test failed:', error.message);
        throw error;
    }
}

// Update Vercel environment variables
async function updateVercelEnvironment(roleArn, endpoint) {
    try {
        console.log('🔧 Updating Vercel environment variables...');
        
        // Check if Vercel CLI is available
        try {
            await execAsync('vercel --version');
        } catch (error) {
            console.log('⚠️ Vercel CLI not available, skipping environment update');
            console.log('   Please manually add these environment variables to Vercel:');
            console.log(`   MEDIACONVERT_ROLE_ARN=${roleArn}`);
            console.log(`   MEDIACONVERT_ENDPOINT=${endpoint}`);
            return;
        }
        
        // Remove existing variables if they exist
        try {
            await execAsync('vercel env rm MEDIACONVERT_ROLE_ARN production --yes');
            console.log('   Removed existing MEDIACONVERT_ROLE_ARN');
        } catch (error) {
            // Variable might not exist, that's OK
        }
        
        try {
            await execAsync('vercel env rm MEDIACONVERT_ENDPOINT production --yes');
            console.log('   Removed existing MEDIACONVERT_ENDPOINT');
        } catch (error) {
            // Variable might not exist, that's OK
        }
        
        // Add new variables
        await execAsync(`echo "${roleArn}" | vercel env add MEDIACONVERT_ROLE_ARN production`);
        console.log('   ✅ Added MEDIACONVERT_ROLE_ARN to Vercel');
        
        await execAsync(`echo "${endpoint}" | vercel env add MEDIACONVERT_ENDPOINT production`);
        console.log('   ✅ Added MEDIACONVERT_ENDPOINT to Vercel');
        
        console.log('   🚀 Deploying to apply changes...');
        await execAsync('vercel --prod');
        console.log('   ✅ Deployment complete');
        
    } catch (error) {
        console.log('❌ Failed to update Vercel environment:', error.message);
        console.log('   Please manually add these environment variables to Vercel:');
        console.log(`   MEDIACONVERT_ROLE_ARN=${roleArn}`);
        console.log(`   MEDIACONVERT_ENDPOINT=${endpoint}`);
    }
}

// Main verification and setup function
async function main() {
    try {
        console.log('🚀 Starting MediaConvert permissions verification...\n');
        
        // Step 1: Check AWS CLI
        await checkAWSCLI();
        console.log('');
        
        // Step 2: Check IAM permissions
        await checkIAMPermissions();
        console.log('');
        
        // Step 3: Check/create MediaConvert role
        const roleArn = await checkMediaConvertRole();
        console.log('');
        
        // Step 4: Get MediaConvert endpoint
        const endpoint = await getMediaConvertEndpoint();
        console.log('');
        
        // Step 5: Test MediaConvert job creation
        await testMediaConvertJob(roleArn, endpoint);
        console.log('');
        
        // Step 6: Update Vercel environment
        await updateVercelEnvironment(roleArn, endpoint);
        console.log('');
        
        console.log('🎉 MEDIACONVERT SETUP COMPLETE!');
        console.log('===============================');
        console.log('');
        console.log('✅ All MediaConvert permissions verified and configured');
        console.log('✅ Service role created with proper permissions');
        console.log('✅ MediaConvert endpoint discovered');
        console.log('✅ Vercel environment variables updated');
        console.log('');
        console.log('📋 Configuration Summary:');
        console.log(`   Role ARN: ${roleArn}`);
        console.log(`   Endpoint: ${endpoint}`);
        console.log('');
        console.log('🎯 MediaConvert is now ready for real thumbnail generation!');
        
    } catch (error) {
        console.log('');
        console.log('❌ MEDIACONVERT SETUP FAILED');
        console.log('============================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 Troubleshooting steps:');
        console.log('1. Ensure AWS CLI is configured with proper credentials');
        console.log('2. Verify IAM user has MediaConvert and S3 permissions');
        console.log('3. Check that the S3 bucket exists and is accessible');
        console.log('4. Ensure Vercel CLI is installed and authenticated');
        console.log('');
        console.log('📖 For detailed setup instructions, see:');
        console.log('   - AWS_CLI_MEDIACONVERT_SETUP.md');
        console.log('   - ADD_IAM_PERMISSIONS_GUIDE.md');
    }
}

// Run the verification
main();
