const { Pool } = require('pg');

async function addMissingColumns() {
  console.log('🔧 Adding missing columns to production database...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1
  });
  
  try {
    // Add missing columns
    console.log('Adding streaming_url column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS streaming_url TEXT');
    
    console.log('Adding transcript_status column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_status VARCHAR(50)');
    
    console.log('Adding transcript_text column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_text TEXT');
    
    console.log('Adding transcript_confidence column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2)');
    
    console.log('Adding speaker_count column...');
    await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_count INTEGER DEFAULT 0');
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND column_name IN ('streaming_url', 'transcript_status', 'transcript_text', 'transcript_confidence', 'speaker_count')
    `);
    
    console.log('✅ Schema fix completed successfully!');
    console.log('📊 Added columns:', result.rows.map(r => r.column_name));
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    await pool.end();
    process.exit(1);
  }
}

addMissingColumns();