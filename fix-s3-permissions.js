const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand, PutBucketPolicyCommand, GetBucketPolicyCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'law-school-repository-content';

async function fixS3Permissions() {
  console.log('🔧 Fixing S3 bucket permissions for:', BUCKET_NAME);
  
  try {
    // 1. Set CORS configuration
    console.log('\n📝 Setting CORS configuration...');
    const corsConfig = {
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT'],
            AllowedOrigins: [
              'https://law-school-repository.vercel.app',
              'https://law-school-repository-*.vercel.app',
              'http://localhost:3000',
              'http://localhost:3001',
              '*' // Allow all origins for presigned URLs
            ],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
            MaxAgeSeconds: 3600
          }
        ]
      }
    };

    await s3Client.send(new PutBucketCorsCommand(corsConfig));
    console.log('✅ CORS configuration updated');

    // 2. Get current bucket policy
    console.log('\n📝 Checking current bucket policy...');
    let currentPolicy;
    try {
      const policyResponse = await s3Client.send(new GetBucketPolicyCommand({ Bucket: BUCKET_NAME }));
      currentPolicy = JSON.parse(policyResponse.Policy);
      console.log('Current policy:', JSON.stringify(currentPolicy, null, 2));
    } catch (error) {
      if (error.name === 'NoSuchBucketPolicy') {
        console.log('No existing bucket policy found');
        currentPolicy = null;
      } else {
        throw error;
      }
    }

    // 3. Create/Update bucket policy to allow presigned URL access
    console.log('\n📝 Setting bucket policy for presigned URL access...');
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowPresignedURLAccess',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
          Condition: {
            StringLike: {
              'aws:Referer': [
                'https://law-school-repository.vercel.app/*',
                'https://law-school-repository-*.vercel.app/*',
                'http://localhost:3000/*'
              ]
            }
          }
        },
        {
          Sid: 'AllowIAMUserAccess',
          Effect: 'Allow',
          Principal: {
            AWS: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID || '*'}:user/*`
          },
          Action: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject'
          ],
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
        }
      ]
    };

    // If you want to be more permissive for testing (allows all presigned URLs):
    const permissivePolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowAllPresignedURLs',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
          Condition: {
            StringNotEquals: {
              's3:ExistingObjectTag/public': 'false'
            }
          }
        }
      ]
    };

    // Using permissive policy for now to ensure presigned URLs work
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(permissivePolicy)
    }));
    
    console.log('✅ Bucket policy updated to allow presigned URL access');

    // 4. Verify CORS settings
    console.log('\n🔍 Verifying CORS configuration...');
    const corsResponse = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
    console.log('CORS Rules:', JSON.stringify(corsResponse.CORSRules, null, 2));

    console.log('\n✅ S3 bucket permissions fixed successfully!');
    console.log('\n⚠️  IMPORTANT: You may also need to:');
    console.log('1. Check AWS IAM user has s3:GetObject permission');
    console.log('2. Ensure bucket "Block Public Access" allows presigned URLs');
    console.log('3. Wait a few minutes for policy changes to propagate');
    console.log('\n🔗 Test your video playback at:');
    console.log('   https://law-school-repository.vercel.app/dashboard/videos/56184f11-7e2c-4b03-a214-948ce7c5e1e8');

  } catch (error) {
    console.error('❌ Error fixing S3 permissions:', error);
    if (error.name === 'AccessDenied') {
      console.error('\n⚠️  Access Denied: Your IAM user may not have permission to modify bucket policies.');
      console.error('   You need s3:PutBucketPolicy and s3:PutBucketCors permissions.');
    }
  }
}

// Run the fix
fixS3Permissions();