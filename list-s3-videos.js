const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIA3Q6FIgepTNX7X',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
  }
});

const bucketName = 'law-school-repository-content';
const cloudFrontDomain = 'd24qjgz9z4yzof.cloudfront.net';

async function listAllVideos() {
  try {
    console.log('🔍 Scanning S3 bucket for all videos...');
    console.log(`📦 Bucket: ${bucketName}`);
    console.log(`🌐 CloudFront: ${cloudFrontDomain}`);
    console.log('');

    // List all objects in the videos/ folder
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'videos/',
      MaxKeys: 1000
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No videos found in S3 bucket');
      return;
    }

    console.log(`📹 Found ${response.Contents.length} objects in videos/ folder:`);
    console.log('');

    const videos = [];
    
    response.Contents.forEach((object, index) => {
      if (!object.Key) return;
      
      const fileName = object.Key.replace('videos/', '');
      const fileSize = object.Size || 0;
      const lastModified = object.LastModified || new Date();
      const cloudFrontUrl = `https://${cloudFrontDomain}/${object.Key}`;
      
      // Extract video ID from filename (assuming format: timestamp-randomstring.extension)
      const videoId = fileName.split('.')[0];
      
      console.log(`${index + 1}. ${fileName}`);
      console.log(`   📁 S3 Key: ${object.Key}`);
      console.log(`   📊 Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   📅 Modified: ${lastModified.toISOString()}`);
      console.log(`   🔗 CloudFront URL: ${cloudFrontUrl}`);
      console.log(`   🆔 Video ID: ${videoId}`);
      console.log('');
      
      videos.push({
        id: videoId,
        filename: fileName,
        s3_key: object.Key,
        size: fileSize,
        lastModified: lastModified.toISOString(),
        cloudFrontUrl: cloudFrontUrl
      });
    });

    // Generate JSON for database update
    console.log('📋 JSON for database update:');
    console.log(JSON.stringify(videos, null, 2));
    
    return videos;

  } catch (error) {
    console.error('❌ Error listing S3 videos:', error);
    
    if (error.name === 'CredentialsError') {
      console.log('🔑 AWS credentials issue. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set correctly.');
    } else if (error.name === 'NoSuchBucket') {
      console.log('📦 Bucket not found. Check if the bucket name is correct.');
    } else if (error.name === 'AccessDenied') {
      console.log('🚫 Access denied. Check if the AWS credentials have S3 read permissions.');
    }
  }
}

// Run the script
listAllVideos().then(() => {
  console.log('✅ S3 video listing complete');
}).catch(error => {
  console.error('💥 Script failed:', error);
});
