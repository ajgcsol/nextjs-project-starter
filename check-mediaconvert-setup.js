/**
 * Check AWS MediaConvert configuration and help set it up for real thumbnail generation
 */

const https = require('https');

// Configuration
const API_BASE = 'https://nextjs-project-starter-ajgcsols-projects.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function checkAWSHealth() {
  console.log('🔍 Checking AWS service health...');
  
  try {
    const response = await makeRequest(`${API_BASE}/api/aws/health`);
    
    if (response.status === 200) {
      console.log('✅ AWS Health Check Results:');
      console.log('   S3:', response.data.services?.s3?.status || 'Unknown');
      console.log('   MediaConvert:', response.data.services?.mediaconvert?.status || 'Unknown');
      console.log('   Database:', response.data.services?.database?.status || 'Unknown');
      
      if (response.data.services?.mediaconvert?.status === 'error') {
        console.log('❌ MediaConvert Error:', response.data.services.mediaconvert.message);
      }
      
      return response.data;
    } else {
      console.log('❌ AWS health check failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Failed to check AWS health:', error.message);
    return null;
  }
}

async function testSingleVideoThumbnail() {
  console.log('\n🎬 Testing single video thumbnail generation...');
  
  try {
    // First get a list of videos
    const listResponse = await makeRequest(
      `${API_BASE}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=1`
    );
    
    if (listResponse.status === 200 && listResponse.data.videos?.length > 0) {
      const video = listResponse.data.videos[0];
      console.log(`📹 Testing with video: ${video.title} (${video.id})`);
      console.log(`📁 S3 Key: ${video.s3_key || 'NONE'}`);
      
      // Try to generate thumbnail
      const generateResponse = await makeRequest(
        `${API_BASE}/api/videos/generate-thumbnails`,
        {
          method: 'POST',
          body: {
            videoId: video.id,
            batchMode: false
          }
        }
      );
      
      if (generateResponse.status === 200) {
        console.log('✅ Thumbnail generation response:', generateResponse.data);
        
        if (generateResponse.data.method === 'mediaconvert') {
          console.log('🎉 SUCCESS: MediaConvert is working!');
          console.log('📸 Job ID:', generateResponse.data.jobId);
          return true;
        } else {
          console.log('⚠️ Using fallback method:', generateResponse.data.method);
          console.log('📋 This means MediaConvert is not properly configured');
          return false;
        }
      } else {
        console.log('❌ Thumbnail generation failed:', generateResponse.data);
        return false;
      }
    } else {
      console.log('📋 No videos found to test with');
      return false;
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 AWS MediaConvert Configuration Checker');
  console.log('=' .repeat(60));
  
  // Step 1: Check AWS health
  const healthData = await checkAWSHealth();
  
  // Step 2: Test single video thumbnail
  const mediaConvertWorking = await testSingleVideoThumbnail();
  
  // Step 3: Provide recommendations
  console.log('\n📋 DIAGNOSIS & RECOMMENDATIONS');
  console.log('=' .repeat(60));
  
  if (mediaConvertWorking) {
    console.log('✅ MediaConvert is properly configured and working!');
    console.log('🎯 You can now generate real video frame thumbnails');
    console.log('📝 Run the generate-real-thumbnails.js script to process all videos');
  } else {
    console.log('❌ MediaConvert is NOT working properly');
    console.log('\n🔧 Required Environment Variables:');
    console.log('   - MEDIACONVERT_ROLE_ARN: IAM role for MediaConvert');
    console.log('   - MEDIACONVERT_ENDPOINT: MediaConvert service endpoint');
    console.log('   - AWS_ACCESS_KEY_ID: AWS access key');
    console.log('   - AWS_SECRET_ACCESS_KEY: AWS secret key');
    console.log('   - S3_BUCKET_NAME: S3 bucket for video storage');
    
    console.log('\n📋 Setup Steps:');
    console.log('1. Create IAM role with MediaConvert permissions');
    console.log('2. Get MediaConvert endpoint for your region');
    console.log('3. Add environment variables to Vercel');
    console.log('4. Redeploy the application');
    
    console.log('\n⚠️ Until MediaConvert is configured, only placeholder thumbnails will be generated');
  }
  
  console.log('\n🔗 Useful Links:');
  console.log('   AWS MediaConvert Console: https://console.aws.amazon.com/mediaconvert/');
  console.log('   IAM Console: https://console.aws.amazon.com/iam/');
  console.log('   Vercel Environment Variables: https://vercel.com/dashboard');
}

// Run the checker
main().catch(error => {
  console.error('💥 Checker failed:', error);
  process.exit(1);
});
