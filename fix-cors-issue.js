#!/usr/bin/env node

/**
 * Fix CORS Issue for Video Playback
 * Updates S3 bucket CORS configuration to allow the current Vercel deployment
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');

const CURRENT_VERCEL_URL = 'https://law-school-repository-k6ax0tyrl-andrew-j-gregwares-projects.vercel.app';
const BUCKET_NAME = 'law-school-repository-content';

console.log('🔧 Fixing CORS Issue for Video Playback');
console.log('=' .repeat(50));
console.log(`🌐 Current Vercel URL: ${CURRENT_VERCEL_URL}`);
console.log(`📦 S3 Bucket: ${BUCKET_NAME}`);
console.log('');

// Configure AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Get current CORS configuration
 */
async function getCurrentCorsConfig() {
  try {
    console.log('📋 Getting current CORS configuration...');
    
    const command = new GetBucketCorsCommand({
      Bucket: BUCKET_NAME
    });
    
    const response = await s3Client.send(command);
    console.log('✅ Current CORS configuration:');
    console.log(JSON.stringify(response.CORSRules, null, 2));
    
    return response.CORSRules;
  } catch (error) {
    console.log('⚠️ No existing CORS configuration found or error:', error.message);
    return null;
  }
}

/**
 * Update CORS configuration
 */
async function updateCorsConfig() {
  try {
    console.log('\n🔧 Updating CORS configuration...');
    
    // Create comprehensive CORS configuration
    const corsConfiguration = {
      CORSRules: [
        {
          ID: 'AllowVercelOrigins',
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: [
            // Current deployment
            CURRENT_VERCEL_URL,
            // Previous deployment (for backward compatibility)
            'https://law-school-repository-fme904k4e-andrew-j-gregwares-projects.vercel.app',
            // Vercel preview deployments
            'https://*.vercel.app',
            // Local development
            'http://localhost:3000',
            'http://localhost:3001',
            // Production domain (if any)
            'https://law-school-repository.vercel.app'
          ],
          ExposeHeaders: [
            'ETag',
            'Content-Length',
            'Content-Range',
            'Accept-Ranges'
          ],
          MaxAgeSeconds: 3600
        },
        {
          ID: 'AllowAllOrigins',
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: [
            'ETag',
            'Content-Length',
            'Content-Range',
            'Accept-Ranges'
          ],
          MaxAgeSeconds: 3600
        }
      ]
    };
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ CORS configuration updated successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update CORS configuration:', error);
    return false;
  }
}

/**
 * Test CORS configuration
 */
async function testCorsConfig() {
  try {
    console.log('\n🧪 Testing CORS configuration...');
    
    // Test with a sample video URL
    const testVideoUrl = 'https://d24qjgz9z4yzof.cloudfront.net/videos/1755741431209-91gw2aefgli.mp4';
    
    console.log(`📹 Testing video URL: ${testVideoUrl}`);
    
    const response = await fetch(testVideoUrl, {
      method: 'HEAD',
      headers: {
        'Origin': CURRENT_VERCEL_URL
      }
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 CORS Headers:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`   Access-Control-Expose-Headers: ${response.headers.get('Access-Control-Expose-Headers')}`);
    
    if (response.headers.get('Access-Control-Allow-Origin') === CURRENT_VERCEL_URL || 
        response.headers.get('Access-Control-Allow-Origin') === '*') {
      console.log('✅ CORS test passed!');
      return true;
    } else {
      console.log('❌ CORS test failed - origin not allowed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function fixCorsIssue() {
  try {
    console.log('🚀 Starting CORS fix process...\n');
    
    // Step 1: Get current configuration
    await getCurrentCorsConfig();
    
    // Step 2: Update CORS configuration
    const updateSuccess = await updateCorsConfig();
    
    if (!updateSuccess) {
      console.log('❌ Failed to update CORS configuration');
      return;
    }
    
    // Step 3: Wait a moment for changes to propagate
    console.log('\n⏳ Waiting for CORS changes to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Test the configuration
    const testSuccess = await testCorsConfig();
    
    // Final results
    console.log('\n🎉 CORS Fix Results');
    console.log('=' .repeat(50));
    console.log(`✅ CORS Configuration Updated: ${updateSuccess ? 'Success' : 'Failed'}`);
    console.log(`✅ CORS Test: ${testSuccess ? 'Passed' : 'Failed'}`);
    
    if (updateSuccess && testSuccess) {
      console.log('\n🎊 SUCCESS: Video playback should now work!');
      console.log('🔄 You may need to refresh the browser and clear cache');
      console.log(`🌐 Test URL: ${CURRENT_VERCEL_URL}/dashboard/videos/bd8369d3-b0ca-48af-9454-ae4ff91e466a`);
    } else {
      console.log('\n⚠️ Some issues remain - manual CloudFront configuration may be needed');
    }
    
  } catch (error) {
    console.error('❌ CORS fix process failed:', error);
  }
}

// Run the fix
fixCorsIssue();
