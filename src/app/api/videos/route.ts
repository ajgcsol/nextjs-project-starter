import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📹 Fetching all videos from database...');
    
    // Get all videos from database
    const videos = await VideoDB.findAll();
    
    console.log(`📹 Found ${videos.length} videos in database`);
    
    // Transform videos for frontend
    const transformedVideos = videos.map(video => ({
      id: video.id,
      title: video.title || video.filename || 'Untitled Video',
      description: video.description || '',
      filename: video.filename || '',
      duration: video.duration || 0,
      size: video.file_size || 0,
      uploadDate: video.uploaded_at || video.created_at || new Date().toISOString(),
      status: video.is_processed ? 'ready' : 'processing',
      visibility: video.is_public ? 'public' : 'private',
      category: video.category || 'general',
      tags: video.tags ? (Array.isArray(video.tags) ? video.tags : video.tags.split(',')) : [],
      views: video.view_count || 0,
      createdBy: video.uploader_name || video.uploaded_by || 'Unknown',
      thumbnailUrl: video.thumbnail_path || `/api/videos/thumbnail/${video.id}`,
      streamUrl: `/api/videos/stream/${video.id}`,
      s3_key: video.s3_key,
      file_path: video.file_path
    }));

    return NextResponse.json({
      success: true,
      videos: transformedVideos,
      count: transformedVideos.length
    });

  } catch (error) {
    console.error('❌ Error fetching videos:', error);
    
    // If database connection fails, try multiple fallback methods
    
    // Fallback 1: Try to get videos directly from S3
    try {
      console.log('🔄 Trying S3 direct fallback...');
      const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const bucketName = process.env.S3_BUCKET_NAME || 'law-school-repository-content';
      const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd24qjgz9z4yzof.cloudfront.net';

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'videos/',
        MaxKeys: 1000
      });

      const s3Response = await s3Client.send(command);
      
      if (s3Response.Contents && s3Response.Contents.length > 0) {
        console.log(`📹 Found ${s3Response.Contents.length} videos in S3 bucket`);
        
        const s3Videos = s3Response.Contents
          .filter(object => object.Key && !object.Key.endsWith('/'))
          .map((object) => {
            const fileName = object.Key!.replace('videos/', '');
            const videoId = fileName.split('.')[0];
            const cloudFrontUrl = `https://${cloudFrontDomain}/${object.Key}`;
            
            return {
              id: videoId,
              title: fileName.replace(/\.[^/.]+$/, ""),
              description: `Video uploaded on ${object.LastModified?.toLocaleDateString() || 'Unknown date'}`,
              filename: fileName,
              duration: 0,
              size: object.Size || 0,
              uploadDate: object.LastModified?.toISOString() || new Date().toISOString(),
              status: 'ready',
              visibility: 'private',
              category: 'uploaded',
              tags: [],
              views: 0,
              createdBy: 'System',
              thumbnailUrl: `/api/videos/thumbnail/${videoId}`,
              streamUrl: `/api/videos/stream/${videoId}`,
              s3_key: object.Key,
              file_path: cloudFrontUrl
            };
          });

        return NextResponse.json({
          success: true,
          videos: s3Videos,
          count: s3Videos.length,
          source: 's3_fallback'
        });
      }
    } catch (s3Error) {
      console.error('❌ S3 fallback also failed:', s3Error);
    }
    
    // Fallback 2: Try to return videos from local JSON file
    try {
      console.log('🔄 Trying local JSON fallback...');
      const fs = require('fs');
      const path = require('path');
      
      const videosJsonPath = path.join(process.cwd(), 'database', 'videos.json');
      
      if (fs.existsSync(videosJsonPath)) {
        const videosData = JSON.parse(fs.readFileSync(videosJsonPath, 'utf8'));
        
        // Handle both array format and object with videos property
        const videosList = Array.isArray(videosData) ? videosData : (videosData.videos || []);
        
        console.log(`📁 Found ${videosList.length} videos in local JSON file`);
        
        // Transform local JSON videos to match expected format
        const transformedVideos = videosList.map((video: any) => ({
          id: video.id,
          title: video.title || 'Untitled Video',
          description: video.description || '',
          filename: video.originalFilename || video.filename || '',
          duration: video.duration || 0,
          size: video.size || 0,
          uploadDate: video.uploadDate || new Date().toISOString(),
          status: video.status || 'ready',
          visibility: video.visibility || 'private',
          category: video.category || 'general',
          tags: video.tags || [],
          views: video.views || 0,
          createdBy: video.createdBy || 'Unknown',
          thumbnailUrl: video.thumbnailPath || `/api/videos/thumbnail/${video.id}`,
          streamUrl: video.streamUrl || `/api/videos/stream/${video.id}`,
          s3_key: video.s3_key,
          file_path: video.file_path || video.streamUrl
        }));
        
        return NextResponse.json({
          success: true,
          videos: transformedVideos,
          count: transformedVideos.length,
          source: 'local_fallback'
        });
      }
    } catch (fallbackError) {
      console.error('❌ Local JSON fallback also failed:', fallbackError);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch videos',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        videos: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📹 Creating new video record:', body);
    
    // Create new video record
    const video = await VideoDB.create({
      title: body.title,
      description: body.description,
      filename: body.filename,
      file_path: body.file_path,
      file_size: body.size || body.file_size || 0,
      duration: body.duration,
      uploaded_by: body.created_by || body.uploaded_by || 'system',
      s3_key: body.s3_key,
      s3_bucket: body.s3_bucket || process.env.S3_BUCKET_NAME,
      is_processed: body.is_processed || false,
      is_public: body.visibility === 'public' || body.is_public || false
    });

    console.log('✅ Video record created:', video.id);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        s3_key: video.s3_key,
        file_path: video.file_path,
        size: video.file_size,
        duration: video.duration,
        status: 'processing',
        uploadDate: video.uploaded_at
      }
    });

  } catch (error) {
    console.error('❌ Error creating video:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
