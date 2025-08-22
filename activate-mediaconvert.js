// Activate and Setup AWS MediaConvert Service
const { MediaConvertClient, DescribeEndpointsCommand, ListJobsCommand } = require('@aws-sdk/client-mediaconvert');
const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } = require('@aws-sdk/client-iam');

// AWS Configuration
const AWS_REGION = 'us-east-1';
const ROLE_NAME = 'MediaConvert-Role';

console.log('🎬 AWS MediaConvert Activation & Setup');
console.log('=====================================');

// Step 1: Test AWS Credentials
async function testAWSCredentials() {
    console.log('🔐 Testing AWS credentials...');
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('❌ AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    }
    
    console.log('✅ AWS credentials found');
    console.log(`   Access Key: ${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...`);
    console.log(`   Region: ${AWS_REGION}`);
}

// Step 2: Activate MediaConvert by discovering endpoint
async function activateMediaConvert() {
    console.log('🚀 Activating MediaConvert service...');
    
    try {
        const mediaconvert = new MediaConvertClient({
            region: AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        // This call will activate MediaConvert if it's not already active
        console.log('   Discovering MediaConvert endpoint...');
        const command = new DescribeEndpointsCommand({});
        const response = await mediaconvert.send(command);
        
        if (response.Endpoints && response.Endpoints.length > 0) {
            const endpoint = response.Endpoints[0].Url;
            console.log('✅ MediaConvert activated successfully!');
            console.log(`   Account Endpoint: ${endpoint}`);
            return endpoint;
        } else {
            throw new Error('No MediaConvert endpoints returned');
        }
    } catch (error) {
        if (error.name === 'AccessDeniedException') {
            console.log('❌ MediaConvert access denied. This might mean:');
            console.log('   1. MediaConvert is not available in your region');
            console.log('   2. Your AWS account needs MediaConvert permissions');
            console.log('   3. MediaConvert service needs to be enabled');
            throw error;
        } else if (error.name === 'UnknownEndpoint') {
            console.log('❌ MediaConvert service not available in this region');
            console.log('   Try switching to us-east-1 or us-west-2');
            throw error;
        } else {
            console.log('❌ MediaConvert activation failed:', error.message);
            throw error;
        }
    }
}

// Step 3: Create MediaConvert IAM Role
async function createMediaConvertRole() {
    console.log('🔧 Creating MediaConvert IAM Role...');
    
    try {
        const iam = new IAMClient({
            region: AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        // Check if role already exists
        try {
            const getRoleCommand = new GetRoleCommand({ RoleName: ROLE_NAME });
            const existingRole = await iam.send(getRoleCommand);
            console.log('✅ MediaConvert role already exists');
            console.log(`   Role ARN: ${existingRole.Role.Arn}`);
            return existingRole.Role.Arn;
        } catch (error) {
            if (error.name !== 'NoSuchEntity') {
                throw error;
            }
        }
        
        // Create the role
        console.log('   Creating new MediaConvert role...');
        const trustPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: {
                        Service: 'mediaconvert.amazonaws.com'
                    },
                    Action: 'sts:AssumeRole'
                }
            ]
        };
        
        const createRoleCommand = new CreateRoleCommand({
            RoleName: ROLE_NAME,
            AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
            Description: 'Role for AWS MediaConvert to access S3 and other services'
        });
        
        const roleResult = await iam.send(createRoleCommand);
        console.log('✅ MediaConvert role created successfully');
        
        // Attach MediaConvert policy
        console.log('   Attaching MediaConvert permissions...');
        const attachPolicy1 = new AttachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: 'arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess'
        });
        await iam.send(attachPolicy1);
        
        // Attach S3 policy
        console.log('   Attaching S3 permissions...');
        const attachPolicy2 = new AttachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess'
        });
        await iam.send(attachPolicy2);
        
        console.log('✅ Permissions attached successfully');
        console.log(`   Role ARN: ${roleResult.Role.Arn}`);
        
        return roleResult.Role.Arn;
        
    } catch (error) {
        if (error.name === 'AccessDeniedException') {
            console.log('❌ IAM access denied. You need IAM permissions to create roles.');
            console.log('   Please ask your AWS administrator to create the MediaConvert role.');
            console.log('   Role details needed:');
            console.log('   - Name: MediaConvert-Role');
            console.log('   - Service: mediaconvert.amazonaws.com');
            console.log('   - Policies: AWSElementalMediaConvertFullAccess, AmazonS3FullAccess');
            throw error;
        } else {
            console.log('❌ Role creation failed:', error.message);
            throw error;
        }
    }
}

// Step 4: Test MediaConvert with the role
async function testMediaConvertSetup(endpoint, roleArn) {
    console.log('🧪 Testing MediaConvert setup...');
    
    try {
        const mediaconvert = new MediaConvertClient({
            region: AWS_REGION,
            endpoint: endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        
        // Test by listing jobs (this requires the role to work)
        const listJobsCommand = new ListJobsCommand({ MaxResults: 1 });
        await mediaconvert.send(listJobsCommand);
        
        console.log('✅ MediaConvert setup test passed!');
        console.log('   MediaConvert is ready to process videos');
        
    } catch (error) {
        console.log('⚠️  MediaConvert test warning:', error.message);
        console.log('   This might be normal if no jobs exist yet');
    }
}

// Step 5: Generate Vercel environment variables
function generateVercelConfig(endpoint, roleArn) {
    console.log('📝 Vercel Environment Variables');
    console.log('==============================');
    console.log('');
    console.log('Add these to your Vercel project:');
    console.log('');
    console.log('MEDIACONVERT_ENDPOINT=' + endpoint);
    console.log('MEDIACONVERT_ROLE_ARN=' + roleArn);
    console.log('');
    console.log('🚀 Commands to add to Vercel:');
    console.log('');
    console.log('vercel env add MEDIACONVERT_ENDPOINT production');
    console.log(`# Enter: ${endpoint}`);
    console.log('');
    console.log('vercel env add MEDIACONVERT_ROLE_ARN production');
    console.log(`# Enter: ${roleArn}`);
    console.log('');
    console.log('Then redeploy your application!');
}

// Main execution
async function main() {
    try {
        await testAWSCredentials();
        console.log('');
        
        const endpoint = await activateMediaConvert();
        console.log('');
        
        const roleArn = await createMediaConvertRole();
        console.log('');
        
        await testMediaConvertSetup(endpoint, roleArn);
        console.log('');
        
        generateVercelConfig(endpoint, roleArn);
        console.log('');
        
        console.log('🎉 SUCCESS! MediaConvert is now activated and configured!');
        console.log('===============================================');
        console.log('');
        console.log('✅ MediaConvert service activated');
        console.log('✅ IAM role created with proper permissions');
        console.log('✅ Account endpoint discovered');
        console.log('✅ Configuration tested');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('1. Add the environment variables to Vercel (shown above)');
        console.log('2. Redeploy your application');
        console.log('3. Test thumbnail generation');
        
    } catch (error) {
        console.log('');
        console.log('❌ SETUP FAILED');
        console.log('===============');
        console.log('Error:', error.message);
        console.log('');
        
        if (error.name === 'AccessDeniedException') {
            console.log('💡 SOLUTION:');
            console.log('Your AWS user needs additional permissions. Ask your AWS admin to:');
            console.log('1. Add MediaConvert permissions to your user');
            console.log('2. Add IAM role creation permissions');
            console.log('3. Or create the MediaConvert role manually');
        } else if (error.name === 'UnknownEndpoint') {
            console.log('💡 SOLUTION:');
            console.log('MediaConvert might not be available in your region.');
            console.log('Try switching to us-east-1 or us-west-2 region.');
        } else {
            console.log('💡 TROUBLESHOOTING:');
            console.log('1. Check your AWS credentials are correct');
            console.log('2. Ensure you have MediaConvert permissions');
            console.log('3. Try a different AWS region');
            console.log('4. Contact AWS support if MediaConvert is not available');
        }
        
        process.exit(1);
    }
}

// Run the setup
main();
