// Add Mux fields to existing videos table
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addMuxFields() {
  try {
    console.log('🔧 Adding Mux integration fields to videos table...');

    // Add Mux fields to existing videos table
    const addMuxColumns = `
      ALTER TABLE videos 
      ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT,
      ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT,
      ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT,
      ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS captions_generated BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS mux_updated_at TIMESTAMP;
    `;

    await pool.query(addMuxColumns);
    console.log('✅ Mux fields added successfully');

    // Verify the new columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND table_schema = 'public'
      AND column_name LIKE 'mux_%' OR column_name IN ('audio_enhanced', 'captions_generated')
      ORDER BY column_name;
    `);

    console.log('📋 Mux fields in videos table:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });

    console.log('🎉 Mux integration fields ready!');
    return true;

  } catch (error) {
    console.error('❌ Failed to add Mux fields:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Set environment variable and run
process.env.DATABASE_URL = DATABASE_URL;
addMuxFields().then(success => {
  if (success) {
    console.log('✅ Database ready for Mux integration!');
    process.exit(0);
  } else {
    console.log('❌ Failed to prepare database');
    process.exit(1);
  }
});
