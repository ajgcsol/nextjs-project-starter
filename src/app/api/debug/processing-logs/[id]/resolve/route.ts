import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Debug log ID is required'
      }, { status: 400 });
    }

    console.log('✅ Marking debug entry as resolved:', id);

    // Update the debug log entry to mark as resolved
    const result = await sql`
      UPDATE debug_logs 
      SET 
        resolved = true,
        resolved_at = NOW()
      WHERE id = ${id}
      RETURNING id, resolved
    `;

    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Debug log entry not found'
      }, { status: 404 });
    }

    console.log('✅ Debug entry marked as resolved:', id);

    return NextResponse.json({
      success: true,
      id: result[0].id,
      resolved: result[0].resolved,
      message: 'Debug entry marked as resolved'
    });

  } catch (error) {
    console.error('❌ Failed to mark debug entry as resolved:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error resolving debug entry'
    }, { status: 500 });
  }
}