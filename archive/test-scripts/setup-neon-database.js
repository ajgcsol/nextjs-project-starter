// Setup Neon Database with Mux Integration
const { Pool } = require('pg');

// Use the connection string from init-neon-db.ps1
const DATABASE_URL = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('🔗 Connecting to Neon database...');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully:', testResult.rows[0].current_time);

    // Create videos table with Mux fields
    console.log('📋 Creating videos table with Mux integration...');
    
    const createVideosTable = `
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT,
        file_size BIGINT,
        duration INTEGER,
        thumbnail_path TEXT,
        video_quality VARCHAR(50) DEFAULT 'HD',
        uploaded_by VARCHAR(255),
        course_id UUID,
        s3_key TEXT,
        s3_bucket VARCHAR(255),
        is_processed BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Mux Integration Fields
        mux_asset_id VARCHAR(255),
        mux_playback_id VARCHAR(255),
        mux_status VARCHAR(50) DEFAULT 'pending',
        mux_thumbnail_url TEXT,
        mux_streaming_url TEXT,
        mux_mp4_url TEXT,
        audio_enhanced BOOLEAN DEFAULT false,
        captions_generated BOOLEAN DEFAULT false,
        mux_created_at TIMESTAMP,
        mux_updated_at TIMESTAMP
      );
    `;

    await pool.query(createVideosTable);
    console.log('✅ Videos table created with Mux fields');

    // Create users table
    console.log('📋 Creating users table...');
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255),
        department VARCHAR(255),
        microsoft_id VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createUsersTable);
    console.log('✅ Users table created');

    // Create video_views table for analytics
    console.log('📋 Creating video_views table...');
    const createVideoViewsTable = `
      CREATE TABLE IF NOT EXISTS video_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        watch_duration INTEGER,
        ip_address INET,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createVideoViewsTable);
    console.log('✅ Video views table created');

    // Verify tables exist
    console.log('🔍 Verifying table creation...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('videos', 'users', 'video_views')
      ORDER BY table_name;
    `);

    console.log('📊 Created tables:', tablesResult.rows.map(row => row.table_name));

    // Check videos table structure
    const videosColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'videos' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Videos table columns:');
    videosColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });

    console.log('🎉 Database setup complete!');
    return true;

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Set environment variable and run setup
process.env.DATABASE_URL = DATABASE_URL;
setupDatabase().then(success => {
  if (success) {
    console.log('✅ Ready to test Mux + Database integration!');
    process.exit(0);
  } else {
    console.log('❌ Database setup failed');
    process.exit(1);
  }
});
