import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';
import { AWSFileManager } from '@/lib/aws-integration';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🗑️ Delete request for video ID:', id);
    
    // Get video details before deletion
    const video = await VideoDB.findById(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    console.log('🗑️ Found video to delete:', {
      id: video.id,
      title: video.title,
      s3Key: video.s3_key,
      thumbnailPath: video.thumbnail_path
    });

    // Delete from S3 if s3_key exists
    if (video.s3_key) {
      try {
        console.log('🗑️ Deleting video file from S3:', video.s3_key);
        await AWSFileManager.deleteFile(video.s3_key);
        console.log('✅ Video file deleted from S3');
      } catch (s3Error) {
        console.warn('⚠️ Failed to delete video file from S3:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }
    }

    // Delete thumbnail from S3 if it exists and is an S3 URL
    if (video.thumbnail_path && video.thumbnail_path.includes('amazonaws.com')) {
      try {
        // Extract S3 key from thumbnail URL
        const thumbnailS3Key = video.thumbnail_path.split('/').slice(-2).join('/'); // Get last two parts (folder/filename)
        console.log('🗑️ Deleting thumbnail from S3:', thumbnailS3Key);
        await AWSFileManager.deleteFile(thumbnailS3Key);
        console.log('✅ Thumbnail deleted from S3');
      } catch (thumbnailError) {
        console.warn('⚠️ Failed to delete thumbnail from S3:', thumbnailError);
        // Continue with database deletion
      }
    }

    // Delete from database
    console.log('🗑️ Deleting video from database...');
    const deleteResult = await VideoDB.delete(id);
    
    if (!deleteResult) {
      return NextResponse.json(
        { error: 'Failed to delete video from database' },
        { status: 500 }
      );
    }

    console.log('✅ Video deleted successfully:', {
      id,
      title: video.title
    });

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully',
      deletedVideo: {
        id: video.id,
        title: video.title,
        filename: video.filename
      }
    });

  } catch (error) {
    console.error('❌ Delete video error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('📹 Get video request for ID:', id);
    
    const video = await VideoDB.findById(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Format the video data for response
    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      filename: video.filename,
      duration: video.duration || 0,
      size: video.size || 0,
      uploadDate: video.created_at,
      status: video.status || 'ready',
      visibility: video.visibility || 'private',
      category: video.category || '',
      tags: video.tags ? video.tags.split(',').filter(Boolean) : [],
      views: video.views || 0,
      createdBy: video.created_by || 'Unknown',
      streamUrl: video.stream_url,
      thumbnailUrl: video.thumbnail_path,
      s3Key: video.s3_key
    };

    return NextResponse.json({
      success: true,
      video: formattedVideo
    });

  } catch (error) {
    console.error('❌ Get video error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log('📝 Update video request for ID:', id, 'with data:', body);
    
    const video = await VideoDB.findById(id);
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Update video in database
    const updateResult = await VideoDB.update(id, body);
    
    if (!updateResult) {
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      );
    }

    // Get updated video
    const updatedVideo = await VideoDB.findById(id);

    return NextResponse.json({
      success: true,
      message: 'Video updated successfully',
      video: updatedVideo
    });

  } catch (error) {
    console.error('❌ Update video error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
