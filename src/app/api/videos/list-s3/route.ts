import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing all videos in S3 bucket...');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
    const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';

    // List all objects in the videos/ folder
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'videos/',
      MaxKeys: 1000
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos found in S3 bucket',
        videos: [],
        count: 0
      });
    }

    console.log(`📹 Found ${response.Contents.length} objects in videos/ folder`);

    const videos = response.Contents
      .filter(object => object.Key && !object.Key.endsWith('/')) // Filter out folders
      .map((object, index) => {
        const fileName = object.Key!.replace('videos/', '');
        const fileSize = object.Size || 0;
        const lastModified = object.LastModified || new Date();
        const cloudFrontUrl = `https://${cloudFrontDomain}/${object.Key}`;
        
        // Extract video ID from filename (assuming format: timestamp-randomstring.extension)
        const videoId = fileName.split('.')[0];
        
        return {
          id: videoId,
          title: fileName.replace(/\.[^/.]+$/, ""), // Remove extension for title
          description: `Video uploaded on ${lastModified.toLocaleDateString()}`,
          filename: fileName,
          s3_key: object.Key,
          size: fileSize,
          duration: 0, // Unknown without processing
          uploadDate: lastModified.toISOString(),
          status: 'ready',
          visibility: 'private',
          category: 'uploaded',
          tags: [],
          views: 0,
          createdBy: 'System',
          thumbnailUrl: `/api/videos/thumbnail/${videoId}`,
          streamUrl: `/api/videos/stream/${videoId}`,
          cloudFrontUrl: cloudFrontUrl,
          file_path: cloudFrontUrl
        };
      });

    return NextResponse.json({
      success: true,
      videos: videos,
      count: videos.length,
      bucket: bucketName,
      cloudfront: cloudFrontDomain,
      source: 's3_direct'
    });

  } catch (error) {
    console.error('❌ Error listing S3 videos:', error);
    
    let errorMessage = 'Failed to list S3 videos';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.name === 'CredentialsError' || error.message.includes('InvalidAccessKeyId')) {
        errorMessage = 'AWS credentials invalid or missing';
        errorDetails = 'Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables';
      } else if (error.name === 'NoSuchBucket') {
        errorMessage = 'S3 bucket not found';
        errorDetails = 'Check if the bucket name is correct in S3_BUCKET_NAME environment variable';
      } else if (error.name === 'AccessDenied') {
        errorMessage = 'Access denied to S3 bucket';
        errorDetails = 'Check if the AWS credentials have S3 read permissions';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorDetails,
        videos: [],
        count: 0
      },
      { status: 500 }
    );
  }
}
