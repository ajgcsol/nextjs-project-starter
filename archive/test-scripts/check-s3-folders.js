const https = require('https');

// Check S3 bucket folders via the production API
async function checkS3Folders() {
  console.log('🔍 Checking S3 bucket folders via production API...');
  
  const deploymentUrl = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';
  
  try {
    // Use the list-s3 API endpoint to see what's in the bucket
    console.log('\n📋 Checking S3 bucket contents...');
    const s3Response = await makeRequest(`${deploymentUrl}/api/videos/list-s3`);
    
    console.log('✅ S3 API Response:', s3Response.status);
    if (s3Response.data) {
      console.log('📊 S3 Contents:', JSON.stringify(s3Response.data, null, 2));
      
      if (s3Response.data.videos && s3Response.data.videos.length > 0) {
        console.log('\n📁 Video file locations:');
        s3Response.data.videos.forEach((video, index) => {
          console.log(`${index + 1}. ${video.title || video.filename}`);
          console.log(`   S3 Key: ${video.s3Key || 'Not specified'}`);
          console.log(`   Folder: ${video.s3Key ? video.s3Key.split('/')[0] : 'Unknown'}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking S3 folders:', error.message);
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Run the check
checkS3Folders().catch(console.error);
