import { NextRequest, NextResponse } from 'next/server';
import liteVideoDatabase from '@/lib/videoDatabase-lite';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Increment view count
    liteVideoDatabase.incrementViews(id);
    
    return NextResponse.json({
      success: true,
      message: 'View count incremented'
    });
  } catch (error) {
    console.error('Error incrementing view:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}