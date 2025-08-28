/**
 * MediaConvert Setup Helper Script
 * This script helps you get the information needed to configure MediaConvert
 */

const { MediaConvertClient, DescribeEndpointsCommand } = require('@aws-sdk/client-mediaconvert');
const { IAMClient, ListRolesCommand, GetRoleCommand } = require('@aws-sdk/client-iam');

class MediaConvertSetup {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    // Check if AWS credentials are available
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not found in environment variables');
      console.log('📋 Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
      process.exit(1);
    }
    
    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }

  async setupMediaConvert() {
    console.log('🎬 MEDIACONVERT SETUP HELPER');
    console.log('=' .repeat(60));
    console.log(`🌐 Region: ${this.region}`);
    console.log('=' .repeat(60));

    try {
      // Step 1: Get MediaConvert endpoint
      await this.getMediaConvertEndpoint();
      
      // Step 2: Check for existing MediaConvert roles
      await this.checkExistingRoles();
      
      // Step 3: Provide setup instructions
      this.provideSetupInstructions();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      this.provideTroubleshootingHelp();
    }
  }

  async getMediaConvertEndpoint() {
    console.log('\n🔍 STEP 1: Getting MediaConvert Endpoint');
    console.log('-'.repeat(50));

    try {
      const mediaConvertClient = new MediaConvertClient({
        region: this.region,
        credentials: this.credentials
      });

      const command = new DescribeEndpointsCommand({});
      const response = await mediaConvertClient.send(command);
      
      if (response.Endpoints && response.Endpoints.length > 0) {
        const endpoint = response.Endpoints[0].Url;
        console.log('✅ MediaConvert endpoint found:');
        console.log(`📍 ${endpoint}`);
        console.log('');
        console.log('🔧 Add this to Vercel environment variables:');
        console.log(`   MEDIACONVERT_ENDPOINT=${endpoint}`);
        
        this.mediaConvertEndpoint = endpoint;
      } else {
        throw new Error('No MediaConvert endpoints found');
      }
    } catch (error) {
      console.error('❌ Failed to get MediaConvert endpoint:', error.message);
      console.log('');
      console.log('💡 This might mean:');
      console.log('   - MediaConvert is not available in your region');
      console.log('   - Your AWS credentials lack MediaConvert permissions');
      console.log('   - MediaConvert service is not enabled');
    }
  }

  async checkExistingRoles() {
    console.log('\n🔍 STEP 2: Checking for MediaConvert IAM Roles');
    console.log('-'.repeat(50));

    try {
      const iamClient = new IAMClient({
        region: this.region,
        credentials: this.credentials
      });

      const listCommand = new ListRolesCommand({});
      const response = await iamClient.send(listCommand);
      
      const mediaConvertRoles = response.Roles?.filter(role => 
        role.RoleName?.toLowerCase().includes('mediaconvert') ||
        role.Description?.toLowerCase().includes('mediaconvert')
      ) || [];

      if (mediaConvertRoles.length > 0) {
        console.log('✅ Found existing MediaConvert roles:');
        for (const role of mediaConvertRoles) {
          console.log(`📋 Role: ${role.RoleName}`);
          console.log(`   ARN: ${role.Arn}`);
          console.log(`   Created: ${role.CreateDate}`);
          
          // Check if this role can be used
          if (role.AssumeRolePolicyDocument) {
            try {
              const policy = JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument));
              const hasMediaConvertTrust = policy.Statement?.some(stmt => 
                stmt.Principal?.Service?.includes('mediaconvert.amazonaws.com')
              );
              
              if (hasMediaConvertTrust) {
                console.log('   ✅ Can be used for MediaConvert');
                console.log('');
                console.log('🔧 Add this to Vercel environment variables:');
                console.log(`   MEDIACONVERT_ROLE_ARN=${role.Arn}`);
                this.recommendedRoleArn = role.Arn;
              } else {
                console.log('   ❌ Cannot be used for MediaConvert (wrong trust policy)');
              }
            } catch (e) {
              console.log('   ❓ Could not verify trust policy');
            }
          }
          console.log('');
        }
      } else {
        console.log('❌ No existing MediaConvert roles found');
        console.log('');
        console.log('📋 You need to create a MediaConvert IAM role:');
        console.log('   1. Go to AWS IAM Console');
        console.log('   2. Create a new role for MediaConvert service');
        console.log('   3. Attach S3 permissions for your bucket');
        console.log('   4. Copy the role ARN');
      }
    } catch (error) {
      console.error('❌ Failed to check IAM roles:', error.message);
      console.log('');
      console.log('💡 This might mean:');
      console.log('   - Your AWS credentials lack IAM permissions');
      console.log('   - You need to create the role manually');
    }
  }

  provideSetupInstructions() {
    console.log('\n📋 SETUP INSTRUCTIONS SUMMARY');
    console.log('=' .repeat(60));

    console.log('\n🎯 WHAT YOU NEED TO DO:');
    
    if (this.mediaConvertEndpoint) {
      console.log('✅ MediaConvert endpoint: FOUND');
    } else {
      console.log('❌ MediaConvert endpoint: NEEDS SETUP');
    }
    
    if (this.recommendedRoleArn) {
      console.log('✅ MediaConvert IAM role: FOUND');
    } else {
      console.log('❌ MediaConvert IAM role: NEEDS CREATION');
    }

    console.log('\n🔧 VERCEL ENVIRONMENT VARIABLES TO ADD:');
    
    if (this.mediaConvertEndpoint) {
      console.log(`✅ MEDIACONVERT_ENDPOINT=${this.mediaConvertEndpoint}`);
    } else {
      console.log('❌ MEDIACONVERT_ENDPOINT=<need to get from AWS console>');
    }
    
    if (this.recommendedRoleArn) {
      console.log(`✅ MEDIACONVERT_ROLE_ARN=${this.recommendedRoleArn}`);
    } else {
      console.log('❌ MEDIACONVERT_ROLE_ARN=<need to create IAM role>');
    }

    console.log('\n📖 DETAILED SETUP GUIDE:');
    console.log('   📄 See MEDIACONVERT_SETUP_GUIDE.md for complete instructions');
    
    console.log('\n🚀 NEXT STEPS:');
    if (!this.recommendedRoleArn) {
      console.log('   1. Create MediaConvert IAM role (see guide)');
    }
    if (!this.mediaConvertEndpoint) {
      console.log('   2. Get MediaConvert endpoint from AWS console');
    }
    console.log('   3. Add environment variables to Vercel');
    console.log('   4. Redeploy your application');
    console.log('   5. Test thumbnail generation');
  }

  provideTroubleshootingHelp() {
    console.log('\n🔧 TROUBLESHOOTING HELP');
    console.log('=' .repeat(60));
    
    console.log('\n❌ COMMON ISSUES:');
    console.log('');
    console.log('1. "Access denied" errors:');
    console.log('   - Check AWS credentials have MediaConvert permissions');
    console.log('   - Verify IAM user has necessary policies attached');
    console.log('');
    console.log('2. "MediaConvert not available":');
    console.log('   - MediaConvert might not be available in your region');
    console.log('   - Try switching to us-east-1 or us-west-2');
    console.log('');
    console.log('3. "No endpoints found":');
    console.log('   - MediaConvert service might not be activated');
    console.log('   - Go to AWS MediaConvert console to activate');
    console.log('');
    console.log('📞 NEED MORE HELP?');
    console.log('   - Check AWS CloudTrail for API call logs');
    console.log('   - Review IAM permissions using AWS Policy Simulator');
    console.log('   - Contact AWS support if service issues persist');
  }
}

// Run the setup helper
const setup = new MediaConvertSetup();
setup.setupMediaConvert().then(() => {
  console.log('\n🏁 MediaConvert setup helper completed');
}).catch(error => {
  console.error('\n💥 Setup helper failed:', error);
});
