import { NextRequest, NextResponse } from 'next/server';
import { VideoDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing database connection...');
    
    // Test 1: Check if we can query the database
    const videos = await VideoDB.findAll(5, 0);
    
    return NextResponse.json({
      success: true,
      database: {
        connectionStatus: 'connected',
        videoCount: videos.length,
        sampleVideos: videos.map(v => ({
          id: v.id,
          title: v.title,
          thumbnail_path: v.thumbnail_path,
          file_path: v.file_path,
          is_public: v.is_public,
          is_processed: v.is_processed
        }))
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  } catch (error) {
    console.error('🔧 Database test failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasDatabaseUrl: !!process.env.DATABASE_URL
        }
      },
      { status: 500 }
    );
  }
}