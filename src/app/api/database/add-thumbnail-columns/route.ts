import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding missing thumbnail columns...');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Add missing thumbnail columns
    const addColumnsSQL = `
      ALTER TABLE videos 
        ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_timestamp INTEGER,
        ADD COLUMN IF NOT EXISTS thumbnail_method VARCHAR(50) DEFAULT 'auto',
        ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT,
        ADD COLUMN IF NOT EXISTS captions_generated BOOLEAN DEFAULT false;
    `;

    console.log('📝 Executing thumbnail columns SQL...');
    await pool.query(addColumnsSQL);

    // Check what columns exist now
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name LIKE ANY(ARRAY['%thumbnail%', '%caption%'])
      ORDER BY column_name;
    `);

    await pool.end();

    console.log('✅ Thumbnail columns migration completed');

    return NextResponse.json({
      success: true,
      message: 'Thumbnail columns added successfully',
      addedColumns: columnsResult.rows,
      columnsCount: columnsResult.rows.length
    });

  } catch (error) {
    console.error('❌ Thumbnail columns migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to add thumbnail columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}