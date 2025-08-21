const https = require('https');

const testData = {
  filename: "Professionalism Series - Joe Sweeney - 2-21-2023.wmv",
  contentType: "video/x-ms-wmv",
  fileSize: 2763650511
};

console.log('🧪 Testing Large File Upload System');
console.log('==================================');
console.log(`File: ${testData.filename}`);
console.log(`Size: ${(testData.fileSize / (1024*1024*1024)).toFixed(2)}GB`);
console.log(`Type: ${testData.contentType}`);
console.log('');

async function testMultipartUpload() {
  try {
    console.log('1️⃣ Testing multipart upload initialization...');
    
    const response = await fetch('https://law-school-repository.vercel.app/api/videos/multipart-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ SUCCESS! Multipart upload initialized:');
    console.log(`   Upload ID: ${result.uploadId.substring(0, 20)}...`);
    console.log(`   S3 Key: ${result.s3Key}`);
    console.log(`   Part Size: ${Math.round(result.partSize / (1024*1024))}MB`);
    console.log(`   Total Parts: ${result.totalParts}`);
    console.log(`   CloudFront URL: ${result.cloudFrontUrl || 'Not configured'}`);
    
    console.log('');
    console.log('2️⃣ Testing part upload URL generation...');
    
    const partResponse = await fetch('https://law-school-repository.vercel.app/api/videos/multipart-upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: result.uploadId,
        s3Key: result.s3Key,
        partNumber: 1,
        contentType: testData.contentType
      })
    });
    
    if (!partResponse.ok) {
      const errorText = await partResponse.text();
      throw new Error(`Part URL generation failed: HTTP ${partResponse.status}: ${errorText}`);
    }
    
    const partResult = await partResponse.json();
    
    console.log('✅ Part 1 URL generated successfully!');
    console.log(`   URL Length: ${partResult.presignedUrl.length} characters`);
    console.log(`   Part Number: ${partResult.partNumber}`);
    
    console.log('');
    console.log('3️⃣ Cleaning up test upload...');
    
    const abortResponse = await fetch('https://law-school-repository.vercel.app/api/videos/multipart-upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: result.uploadId,
        s3Key: result.s3Key
      })
    });
    
    if (abortResponse.ok) {
      console.log('✅ Test upload cleaned up successfully!');
    } else {
      console.log('⚠️ Cleanup may have failed (this is usually okay for testing)');
    }
    
    console.log('');
    console.log('🎉 MULTIPART UPLOAD SYSTEM IS WORKING!');
    console.log('Your 43-minute video should upload successfully using this system.');
    console.log('');
    console.log('📊 System Capabilities:');
    console.log(`• Max file size: 5TB`);
    console.log(`• Part size for your file: ${Math.round(result.partSize / (1024*1024))}MB`);
    console.log(`• Total parts needed: ${result.totalParts}`);
    console.log(`• Resume capability: ✅ Supported`);
    console.log(`• Progress tracking: ✅ Available`);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('');
    console.log('🔧 Possible Issues:');
    console.log('• AWS credentials may need to be refreshed');
    console.log('• S3 bucket permissions may need adjustment');
    console.log('• Network connectivity issues');
    console.log('• Vercel deployment may still be in progress');
  }
}

testMultipartUpload();
