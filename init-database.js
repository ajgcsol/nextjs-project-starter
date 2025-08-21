const { Pool } = require('pg');

// Use the DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set the DATABASE_URL environment variable with your Neon connection string');
  process.exit(1);
}

console.log('🔗 Using DATABASE_URL:', DATABASE_URL.replace(/:[^:@]*@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const schema = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  department VARCHAR(100),
  microsoft_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  year INTEGER NOT NULL,
  professor_id UUID REFERENCES users(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code, semester, year)
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, student_id)
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP NOT NULL,
  max_points INTEGER DEFAULT 100,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create assignment_submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_late BOOLEAN DEFAULT false,
  grade DECIMAL(5,2),
  feedback TEXT,
  status VARCHAR(20) DEFAULT 'submitted',
  graded_at TIMESTAMP,
  graded_by UUID REFERENCES users(id),
  UNIQUE(assignment_id, student_id)
);

-- Create articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  abstract TEXT,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id),
  keywords TEXT[],
  status VARCHAR(20) DEFAULT 'draft',
  publication_date TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  location VARCHAR(255),
  virtual_link VARCHAR(500),
  is_virtual BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  max_attendees INTEGER,
  registration_required BOOLEAN DEFAULT false,
  registration_deadline TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'registered',
  UNIQUE(event_id, user_id)
);

-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  attachable_type VARCHAR(50) NOT NULL,
  attachable_id UUID NOT NULL,
  storage_provider VARCHAR(50) DEFAULT 'local',
  storage_key VARCHAR(500),
  storage_bucket VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create videos table with S3 support
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  duration INTEGER,
  thumbnail_path VARCHAR(500),
  video_quality VARCHAR(20) DEFAULT 'HD',
  uploaded_by VARCHAR(255) NOT NULL,
  course_id UUID REFERENCES courses(id),
  s3_key VARCHAR(500),
  s3_bucket VARCHAR(100),
  is_processed BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  mediaconvert_job_id VARCHAR(255),
  hls_manifest_path VARCHAR(500),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create video_views table for detailed analytics
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES users(id),
  watch_duration INTEGER,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, permissions) VALUES 
  ('admin', '{"all": true}'),
  ('professor', '{"courses": ["create", "read", "update", "delete"], "assignments": ["create", "read", "update", "delete"], "videos": ["create", "read", "update", "delete"]}'),
  ('student', '{"courses": ["read"], "assignments": ["read", "submit"], "videos": ["read"]}'),
  ('editor', '{"articles": ["create", "read", "update", "delete"], "events": ["create", "read", "update", "delete"]}')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_course ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id);

-- Create views for common queries
CREATE OR REPLACE VIEW active_courses_with_stats AS
SELECT 
  c.*,
  COUNT(DISTINCT ce.student_id) as enrolled_students,
  COUNT(DISTINCT a.id) as total_assignments,
  COUNT(DISTINCT v.id) as total_videos
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
LEFT JOIN assignments a ON c.id = a.course_id
LEFT JOIN videos v ON c.id = v.course_id
WHERE c.is_active = true
GROUP BY c.id;

CREATE OR REPLACE VIEW published_articles_with_authors AS
SELECT 
  a.*,
  u.name as author_name,
  u.email as author_email
FROM articles a
JOIN users u ON a.author_id = u.id
WHERE a.status = 'published'
ORDER BY a.publication_date DESC;

CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
  u.id as user_id,
  u.name,
  u.email,
  COUNT(DISTINCT c.id) as courses_count,
  COUNT(DISTINCT a.id) as articles_count,
  COUNT(DISTINCT v.id) as videos_count,
  COUNT(DISTINCT e.id) as events_count
FROM users u
LEFT JOIN courses c ON u.id = c.professor_id AND c.is_active = true
LEFT JOIN articles a ON u.id = a.author_id
LEFT JOIN videos v ON v.uploaded_by = CAST(u.id AS TEXT)
LEFT JOIN events e ON u.id = e.created_by
GROUP BY u.id, u.name, u.email;

COMMIT;
`;

async function initDatabase() {
  try {
    console.log('🔄 Connecting to Neon database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    console.log('🔄 Executing database schema...');
    await client.query(schema);
    console.log('✅ Database schema initialized successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`✅ Database has ${result.rows[0].table_count} tables`);
    
    client.release();
    
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
