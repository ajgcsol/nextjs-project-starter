import { NextResponse } from 'next/server';
import { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    
    console.log('🔧 Fixing bucket policy to allow video access...');
    
    // Get current policy
    const currentPolicyResponse = await s3Client.send(new GetBucketPolicyCommand({ Bucket: BUCKET_NAME }));
    const currentPolicy = JSON.parse(currentPolicyResponse.Policy);
    
    console.log('📋 Current policy:', currentPolicy);

    // Create updated policy that includes videos/* path
    const updatedPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: [
            'arn:aws:s3:::law-school-repository-content/public/*',
            'arn:aws:s3:::law-school-repository-content/videos/*',  // ✅ Add videos path
            'arn:aws:s3:::law-school-repository-content/thumbnails/*'  // ✅ Add thumbnails path
          ]
        },
        {
          Sid: 'DenyInsecureConnections',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:*',
          Resource: [
            'arn:aws:s3:::law-school-repository-content',
            'arn:aws:s3:::law-school-repository-content/*'
          ],
          Condition: {
            Bool: {
              'aws:SecureTransport': 'false'
            }
          }
        }
      ]
    };

    // Apply the updated policy
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: BUCKET_NAME,
      Policy: JSON.stringify(updatedPolicy)
    }));
    
    console.log('✅ Bucket policy updated successfully');

    return NextResponse.json({
      success: true,
      message: 'S3 bucket policy updated to allow video access',
      bucket: BUCKET_NAME,
      previousPolicy: currentPolicy,
      newPolicy: updatedPolicy,
      changes: [
        'Added videos/* to allowed paths',
        'Added thumbnails/* to allowed paths',
        'Preserved existing public/* access',
        'Kept secure transport requirement'
      ],
      testInstructions: [
        'Wait 1-2 minutes for policy to propagate',
        'Test video: https://law-school-repository.vercel.app/dashboard/videos/56184f11-7e2c-4b03-a214-948ce7c5e1e8',
        'Check stream: curl -I https://law-school-repository.vercel.app/api/videos/stream/56184f11-7e2c-4b03-a214-948ce7c5e1e8'
      ]
    });

  } catch (error: any) {
    console.error('❌ Error updating bucket policy:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.Code,
      details: 'Failed to update bucket policy'
    }, { status: 500 });
  }
}