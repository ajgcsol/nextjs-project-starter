-- Law School Institutional Repository Database Schema
-- Optimized for Small Institution (100-500 users)
-- PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- For local auth, nullable for SSO users
    profile_picture_url TEXT,
    department VARCHAR(255),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Microsoft 365 SSO fields
    microsoft_id VARCHAR(255) UNIQUE,
    microsoft_tenant_id VARCHAR(255),
    
    -- Indexes
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Role Assignments
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id)
);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    professor_id UUID NOT NULL REFERENCES users(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(code, semester, year)
);

-- Course Enrollments
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    
    UNIQUE(course_id, student_id)
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_points INTEGER DEFAULT 100,
    is_published BOOLEAN DEFAULT false,
    allow_late_submissions BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment Submissions
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN DEFAULT false,
    grade DECIMAL(5,2),
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES users(id),
    
    UNIQUE(assignment_id, student_id)
);

-- File Attachments (for assignments, articles, etc.)
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Polymorphic relationship
    attachable_type VARCHAR(50) NOT NULL, -- 'assignment_submission', 'article', 'event', etc.
    attachable_id UUID NOT NULL,
    
    -- S3 or local storage info
    storage_provider VARCHAR(20) DEFAULT 'local' CHECK (storage_provider IN ('local', 's3', 'azure')),
    storage_key TEXT,
    storage_bucket VARCHAR(255)
);

-- Articles (Law Review)
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    content TEXT,
    author_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'revision_requested', 'approved', 'published', 'rejected')),
    submission_date TIMESTAMP WITH TIME ZONE,
    publication_date TIMESTAMP WITH TIME ZONE,
    volume VARCHAR(20),
    issue VARCHAR(20),
    page_start INTEGER,
    page_end INTEGER,
    keywords TEXT[], -- PostgreSQL array
    doi VARCHAR(255),
    citation_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Article Versions (Track Changes)
CREATE TABLE article_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    changes_summary TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(article_id, version_number)
);

-- Article Sections (for editorial workflow)
CREATE TABLE article_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    section_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    start_line INTEGER,
    end_line INTEGER,
    assigned_editor_id UUID REFERENCES users(id),
    assigned_reviewer_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'reviewed', 'approved', 'needs_revision')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(article_id, section_number)
);

-- Track Changes
CREATE TABLE track_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('insert', 'delete', 'modify')),
    original_content TEXT,
    new_content TEXT,
    start_line INTEGER,
    end_line INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    made_by UUID NOT NULL REFERENCES users(id),
    made_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted BOOLEAN, -- null = pending, true = accepted, false = rejected
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Comments (for articles, sections, assignments)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general' CHECK (comment_type IN ('general', 'suggestion', 'correction', 'bluebook', 'plagiarism')),
    is_resolved BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Polymorphic relationship
    commentable_type VARCHAR(50) NOT NULL,
    commentable_id UUID NOT NULL,
    
    -- Position in document (for inline comments)
    start_line INTEGER,
    end_line INTEGER,
    start_char INTEGER,
    end_char INTEGER
);

-- Bluebook Citations
CREATE TABLE bluebook_citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    suggested_format TEXT,
    is_valid BOOLEAN DEFAULT false,
    citation_type VARCHAR(50), -- 'case', 'statute', 'book', 'article', etc.
    source_url TEXT,
    permalink TEXT,
    start_line INTEGER,
    end_line INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checked_by UUID REFERENCES users(id)
);

-- Plagiarism Reports
CREATE TABLE plagiarism_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL,
    report_data JSONB, -- Store detailed results from plagiarism check
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID NOT NULL REFERENCES users(id),
    service_used VARCHAR(50) DEFAULT 'ollama' -- 'ollama', 'turnitin', etc.
);

-- Editorial Workflow Steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    step_order INTEGER NOT NULL,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    UNIQUE(article_id, step_order)
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) DEFAULT 'general',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    virtual_link TEXT,
    is_virtual BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    max_attendees INTEGER,
    registration_required BOOLEAN DEFAULT false,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event Registrations
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(20) DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'no_show', 'cancelled')),
    
    UNIQUE(event_id, user_id)
);

-- Videos
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    duration INTEGER, -- in seconds
    thumbnail_path TEXT,
    video_quality VARCHAR(20) DEFAULT 'HD',
    is_processed BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- AWS MediaConvert job info
    mediaconvert_job_id VARCHAR(255),
    hls_manifest_path TEXT,
    
    -- Course association (optional)
    course_id UUID REFERENCES courses(id)
);

-- Video Views (for analytics)
CREATE TABLE video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id), -- nullable for anonymous views
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    watch_duration INTEGER, -- seconds watched
    ip_address INET,
    user_agent TEXT
);

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_courses_professor_id ON courses(professor_id);
CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_articles_author_id ON articles(author_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_publication_date ON articles(publication_date);
CREATE INDEX idx_article_sections_article_id ON article_sections(article_id);
CREATE INDEX idx_track_changes_article_id ON track_changes(article_id);
CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX idx_bluebook_citations_article_id ON bluebook_citations(article_id);
CREATE INDEX idx_plagiarism_reports_article_id ON plagiarism_reports(article_id);
CREATE INDEX idx_workflow_steps_article_id ON workflow_steps(article_id);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_is_public ON events(is_public);
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX idx_videos_course_id ON videos(course_id);
CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_file_attachments_attachable ON file_attachments(attachable_type, attachable_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Full-text search indexes
CREATE INDEX idx_articles_search ON articles USING gin(to_tsvector('english', title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(content, '')));
CREATE INDEX idx_events_search ON events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Insert Default Roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["*"]'),
('faculty', 'Faculty Member', '["courses:*", "assignments:*", "videos:upload", "events:*", "articles:review"]'),
('video_editor', 'Video Editor', '["videos:*"]'),
('editor_in_chief', 'Editor-in-Chief', '["articles:*", "editorial:*", "reviews:*"]'),
('editor', 'Editor', '["articles:edit", "articles:review", "editorial:assign"]'),
('reviewer', 'Reviewer', '["articles:review", "articles:comment"]'),
('approver', 'Content Approver', '["articles:approve", "articles:publish"]'),
('researcher', 'Researcher', '["citations:validate", "sources:research"]'),
('student', 'Student', '["assignments:submit", "articles:submit", "courses:view"]'),
('public', 'Public User', '["content:view"]');

-- Insert Default System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('site_name', 'Law School Institutional Repository', 'string', 'Name of the institution', true),
('site_description', 'Academic repository for legal scholarship and course materials', 'string', 'Site description', true),
('max_file_size', '52428800', 'number', 'Maximum file upload size in bytes (50MB)', false),
('allowed_file_types', '["pdf", "docx", "doc", "txt", "mp4", "mov", "avi"]', 'json', 'Allowed file extensions', false),
('plagiarism_threshold', '25', 'number', 'Plagiarism score threshold for flagging', false),
('auto_backup_enabled', 'true', 'boolean', 'Enable automatic database backups', false),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false);

-- Create Functions for Common Operations

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_article_sections_updated_at BEFORE UPDATE ON article_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
    VALUES (
        COALESCE(current_setting('app.current_user_id', true)::UUID, NULL),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_articles AFTER INSERT OR UPDATE OR DELETE ON articles FOR EACH ROW EXECUTE FUNCTION log_audit_event();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Views for Common Queries

-- Active courses with enrollment counts
CREATE VIEW active_courses_with_stats AS
SELECT 
    c.*,
    COUNT(ce.student_id) as enrollment_count,
    COUNT(a.id) as assignment_count
FROM courses c
LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'active'
LEFT JOIN assignments a ON c.id = a.course_id
WHERE c.is_active = true
GROUP BY c.id;

-- Published articles with author info
CREATE VIEW published_articles_with_authors AS
SELECT 
    a.*,
    u.name as author_name,
    u.email as author_email,
    u.department as author_department
FROM articles a
JOIN users u ON a.author_id = u.id
WHERE a.status = 'published'
ORDER BY a.publication_date DESC;

-- User dashboard stats
CREATE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT ce.course_id) as enrolled_courses,
    COUNT(DISTINCT asub.id) as submitted_assignments,
    COUNT(DISTINCT a.id) as authored_articles,
    COUNT(DISTINCT er.event_id) as registered_events
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND ce.status = 'active'
LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
LEFT JOIN articles a ON u.id = a.author_id
LEFT JOIN event_registrations er ON u.id = er.user_id
GROUP BY u.id, u.name, u.email;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lawschool_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lawschool_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO lawschool_app;
