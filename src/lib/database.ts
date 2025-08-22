import { Pool } from 'pg';

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Increased from 2s to 60s - this should fix the timeout issue
});

// Database query function with error handling
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Transaction helper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Database health check
export async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as current_time');
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      connection: 'failed'
    };
  }
}

// User management functions
export const UserDB = {
  async create(userData: {
    email: string;
    name: string;
    password_hash?: string;
    department?: string;
    microsoft_id?: string;
  }) {
    const { rows } = await query(
      `INSERT INTO users (email, name, password_hash, department, microsoft_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userData.email, userData.name, userData.password_hash, userData.department, userData.microsoft_id]
    );
    return rows[0];
  },

  async findByEmail(email: string) {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async findById(id: string) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  async updateLastLogin(id: string) {
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  },

  async getUserRoles(userId: string) {
    const { rows } = await query(
      `SELECT r.name, r.permissions 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.id 
       WHERE ur.user_id = $1`,
      [userId]
    );
    return rows;
  },

  async assignRole(userId: string, roleName: string, assignedBy?: string) {
    await query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
       SELECT $1, r.id, $3
       FROM roles r
       WHERE r.name = $2`,
      [userId, roleName, assignedBy]
    );
  }
};

// Course management functions
export const CourseDB = {
  async create(courseData: {
    name: string;
    code: string;
    semester: string;
    year: number;
    professor_id: string;
    description?: string;
  }) {
    const { rows } = await query(
      `INSERT INTO courses (name, code, semester, year, professor_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [courseData.name, courseData.code, courseData.semester, courseData.year, courseData.professor_id, courseData.description]
    );
    return rows[0];
  },

  async findByProfessor(professorId: string) {
    const { rows } = await query(
      'SELECT * FROM active_courses_with_stats WHERE professor_id = $1',
      [professorId]
    );
    return rows;
  },

  async enrollStudent(courseId: string, studentId: string) {
    const { rows } = await query(
      `INSERT INTO course_enrollments (course_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (course_id, student_id) DO NOTHING
       RETURNING *`,
      [courseId, studentId]
    );
    return rows[0];
  },

  async getEnrolledStudents(courseId: string) {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, ce.enrolled_at, ce.status
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.course_id = $1`,
      [courseId]
    );
    return rows;
  }
};

// Assignment management functions
export const AssignmentDB = {
  async create(assignmentData: {
    course_id: string;
    title: string;
    description?: string;
    instructions?: string;
    due_date: Date;
    max_points?: number;
  }) {
    const { rows } = await query(
      `INSERT INTO assignments (course_id, title, description, instructions, due_date, max_points)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [assignmentData.course_id, assignmentData.title, assignmentData.description, 
       assignmentData.instructions, assignmentData.due_date, assignmentData.max_points || 100]
    );
    return rows[0];
  },

  async findByCourse(courseId: string) {
    const { rows } = await query(
      'SELECT * FROM assignments WHERE course_id = $1 ORDER BY due_date ASC',
      [courseId]
    );
    return rows;
  },

  async submitAssignment(submissionData: {
    assignment_id: string;
    student_id: string;
    content: string;
  }) {
    const { rows } = await query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, content, is_late)
       VALUES ($1, $2, $3, (SELECT due_date < CURRENT_TIMESTAMP FROM assignments WHERE id = $1))
       ON CONFLICT (assignment_id, student_id) 
       DO UPDATE SET content = $3, submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [submissionData.assignment_id, submissionData.student_id, submissionData.content]
    );
    return rows[0];
  },

  async gradeSubmission(submissionId: string, grade: number, feedback: string, gradedBy: string) {
    const { rows } = await query(
      `UPDATE assignment_submissions 
       SET grade = $2, feedback = $3, status = 'graded', graded_at = CURRENT_TIMESTAMP, graded_by = $4
       WHERE id = $1
       RETURNING *`,
      [submissionId, grade, feedback, gradedBy]
    );
    return rows[0];
  }
};

// Article management functions
export const ArticleDB = {
  async create(articleData: {
    title: string;
    abstract?: string;
    content: string;
    author_id: string;
    keywords?: string[];
  }) {
    const { rows } = await query(
      `INSERT INTO articles (title, abstract, content, author_id, keywords)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [articleData.title, articleData.abstract, articleData.content, articleData.author_id, articleData.keywords]
    );
    return rows[0];
  },

  async findPublished(limit = 20, offset = 0) {
    const { rows } = await query(
      'SELECT * FROM published_articles_with_authors LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return rows;
  },

  async findByAuthor(authorId: string) {
    const { rows } = await query(
      'SELECT * FROM articles WHERE author_id = $1 ORDER BY created_at DESC',
      [authorId]
    );
    return rows;
  },

  async updateStatus(articleId: string, status: string, updatedBy?: string) {
    const { rows } = await query(
      `UPDATE articles 
       SET status = $2, 
           publication_date = CASE WHEN $2 = 'published' THEN CURRENT_TIMESTAMP ELSE publication_date END
       WHERE id = $1
       RETURNING *`,
      [articleId, status]
    );
    return rows[0];
  },

  async search(searchTerm: string, limit = 20) {
    const { rows } = await query(
      `SELECT *, ts_rank(to_tsvector('english', title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(content, '')), plainto_tsquery('english', $1)) as rank
       FROM articles 
       WHERE to_tsvector('english', title || ' ' || COALESCE(abstract, '') || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', $1)
       AND status = 'published'
       ORDER BY rank DESC
       LIMIT $2`,
      [searchTerm, limit]
    );
    return rows;
  }
};

// Event management functions
export const EventDB = {
  async create(eventData: {
    title: string;
    description?: string;
    event_type?: string;
    start_date: Date;
    end_date?: Date;
    location?: string;
    virtual_link?: string;
    is_virtual?: boolean;
    is_public?: boolean;
    max_attendees?: number;
    registration_required?: boolean;
    registration_deadline?: Date;
    created_by: string;
  }) {
    const { rows } = await query(
      `INSERT INTO events (title, description, event_type, start_date, end_date, location, 
                          virtual_link, is_virtual, is_public, max_attendees, registration_required, 
                          registration_deadline, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [eventData.title, eventData.description, eventData.event_type, eventData.start_date,
       eventData.end_date, eventData.location, eventData.virtual_link, eventData.is_virtual,
       eventData.is_public, eventData.max_attendees, eventData.registration_required,
       eventData.registration_deadline, eventData.created_by]
    );
    return rows[0];
  },

  async findUpcoming(limit = 10) {
    const { rows } = await query(
      `SELECT * FROM events 
       WHERE start_date > CURRENT_TIMESTAMP AND is_public = true
       ORDER BY start_date ASC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async registerUser(eventId: string, userId: string) {
    const { rows } = await query(
      `INSERT INTO event_registrations (event_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING *`,
      [eventId, userId]
    );
    return rows[0];
  }
};

// File attachment functions
export const FileDB = {
  async create(fileData: {
    filename: string;
    original_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_by: string;
    attachable_type: string;
    attachable_id: string;
    storage_provider?: string;
    storage_key?: string;
    storage_bucket?: string;
  }) {
    const { rows } = await query(
      `INSERT INTO file_attachments (filename, original_name, file_path, file_size, mime_type,
                                   uploaded_by, attachable_type, attachable_id, storage_provider,
                                   storage_key, storage_bucket)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [fileData.filename, fileData.original_name, fileData.file_path, fileData.file_size,
       fileData.mime_type, fileData.uploaded_by, fileData.attachable_type, fileData.attachable_id,
       fileData.storage_provider, fileData.storage_key, fileData.storage_bucket]
    );
    return rows[0];
  },

  async findByAttachable(attachableType: string, attachableId: string) {
    const { rows } = await query(
      'SELECT * FROM file_attachments WHERE attachable_type = $1 AND attachable_id = $2',
      [attachableType, attachableId]
    );
    return rows;
  }
};

// Video management functions
export const VideoDB = {
  async create(videoData: {
    title: string;
    description?: string;
    filename: string;
    file_path: string;
    file_size: number;
    duration?: number;
    thumbnail_path?: string;
    video_quality?: string;
    uploaded_by: string;
    course_id?: string;
    s3_key?: string;
    s3_bucket?: string;
    is_processed?: boolean;
    is_public?: boolean;
    // Mux integration fields
    mux_asset_id?: string;
    mux_playback_id?: string;
    mux_status?: string;
    mux_thumbnail_url?: string;
    mux_streaming_url?: string;
    mux_mp4_url?: string;
    audio_enhanced?: boolean;
  }) {
    const { rows } = await query(
      `INSERT INTO videos (title, description, filename, file_path, file_size, duration, 
                          thumbnail_path, video_quality, uploaded_by, course_id, 
                          s3_key, s3_bucket, is_processed, is_public,
                          mux_asset_id, mux_playback_id, mux_status, mux_thumbnail_url,
                          mux_streaming_url, mux_mp4_url, audio_enhanced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [videoData.title, videoData.description, videoData.filename, videoData.file_path,
       videoData.file_size, videoData.duration, videoData.thumbnail_path, 
       videoData.video_quality || 'HD', videoData.uploaded_by, videoData.course_id,
       videoData.s3_key, videoData.s3_bucket, videoData.is_processed || false, videoData.is_public || false,
       videoData.mux_asset_id, videoData.mux_playback_id, videoData.mux_status, videoData.mux_thumbnail_url,
       videoData.mux_streaming_url, videoData.mux_mp4_url, videoData.audio_enhanced || false]
    );
    return rows[0];
  },

  async findById(id: string) {
    const { rows } = await query('SELECT * FROM videos WHERE id = $1', [id]);
    return rows[0];
  },

  async findAll(limit = 20, offset = 0) {
    const { rows } = await query(
      `SELECT v.*, u.name as uploader_name 
       FROM videos v 
       LEFT JOIN users u ON v.uploaded_by = CAST(u.id AS TEXT)
       ORDER BY v.uploaded_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async findPublic(limit = 20, offset = 0) {
    const { rows } = await query(
      `SELECT v.*, u.name as uploader_name 
       FROM videos v 
       LEFT JOIN users u ON v.uploaded_by = CAST(u.id AS TEXT)
       WHERE v.is_public = true AND v.is_processed = true
       ORDER BY v.uploaded_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async findByCourse(courseId: string) {
    const { rows } = await query(
      'SELECT * FROM videos WHERE course_id = $1 ORDER BY uploaded_at DESC',
      [courseId]
    );
    return rows;
  },

  async update(id: string, updates: {
    title?: string;
    description?: string;
    is_public?: boolean;
    is_processed?: boolean;
    thumbnail_path?: string;
    duration?: number;
    mediaconvert_job_id?: string;
    hls_manifest_path?: string;
  }) {
    const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
    const values = fields.map(key => updates[key as keyof typeof updates]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) return null;

    const { rows } = await query(
      `UPDATE videos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  },

  // Enhanced update method for S3 keys and media paths
  async updateMediaPaths(id: string, updates: {
    s3_key?: string;
    s3_bucket?: string;
    file_path?: string;
    thumbnail_path?: string;
    thumbnail_s3_key?: string;
  }) {
    const fields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== undefined);
    const values = fields.map(key => updates[key as keyof typeof updates]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) return null;

    console.log(`🔧 Updating media paths for video ${id}:`, updates);

    const { rows } = await query(
      `UPDATE videos SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    
    if (rows[0]) {
      console.log(`✅ Successfully updated media paths for video ${id}`);
    }
    
    return rows[0];
  },

  // Repair database record with discovered S3 keys
  async repairVideoRecord(videoId: string, videoS3Key?: string, thumbnailS3Key?: string, videoUrl?: string, thumbnailUrl?: string) {
    const updates: any = {};
    
    if (videoS3Key) {
      updates.s3_key = videoS3Key;
    }
    
    if (videoUrl) {
      updates.file_path = videoUrl;
    }
    
    if (thumbnailUrl) {
      updates.thumbnail_path = thumbnailUrl;
    }
    
    // Store thumbnail S3 key in a JSON metadata field if the column doesn't exist
    // For now, we'll just log it since the schema doesn't have a thumbnail_s3_key column
    if (thumbnailS3Key) {
      console.log(`📝 Thumbnail S3 key for video ${videoId}: ${thumbnailS3Key}`);
    }

    if (Object.keys(updates).length === 0) {
      console.log(`⚠️ No updates to apply for video ${videoId}`);
      return null;
    }

    console.log(`🔧 Repairing video record ${videoId} with:`, updates);

    try {
      const result = await this.updateMediaPaths(videoId, updates);
      
      if (result) {
        console.log(`✅ Successfully repaired video record ${videoId}`);
      } else {
        console.log(`❌ Failed to repair video record ${videoId} - video not found`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error repairing video record ${videoId}:`, error);
      throw error;
    }
  },

  // Find videos with missing S3 keys or media paths
  async findVideosNeedingRepair() {
    const { rows } = await query(
      `SELECT id, title, filename, file_path, thumbnail_path, s3_key, s3_bucket, uploaded_at
       FROM videos 
       WHERE s3_key IS NULL 
          OR file_path IS NULL 
          OR file_path = '' 
          OR file_path LIKE '#placeholder-%'
          OR thumbnail_path IS NULL
          OR thumbnail_path LIKE '/api/videos/thumbnail/%'
       ORDER BY uploaded_at DESC`,
      []
    );
    return rows;
  },

  // Batch repair multiple video records
  async batchRepairVideos(repairs: Array<{
    videoId: string;
    videoS3Key?: string;
    thumbnailS3Key?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
  }>) {
    const results = [];
    
    for (const repair of repairs) {
      try {
        const result = await this.repairVideoRecord(
          repair.videoId,
          repair.videoS3Key,
          repair.thumbnailS3Key,
          repair.videoUrl,
          repair.thumbnailUrl
        );
        results.push({ videoId: repair.videoId, success: !!result, result });
      } catch (error) {
        results.push({ 
          videoId: repair.videoId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  },

  async delete(id: string) {
    const { rows } = await query('DELETE FROM videos WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  },

  async search(searchTerm: string, limit = 20) {
    const { rows } = await query(
      `SELECT v.*, u.name as uploader_name,
              ts_rank(to_tsvector('english', v.title || ' ' || COALESCE(v.description, '')), plainto_tsquery('english', $1)) as rank
       FROM videos v
       LEFT JOIN users u ON v.uploaded_by = CAST(u.id AS TEXT)
       WHERE to_tsvector('english', v.title || ' ' || COALESCE(v.description, '')) @@ plainto_tsquery('english', $1)
       AND v.is_public = true AND v.is_processed = true
       ORDER BY rank DESC
       LIMIT $2`,
      [searchTerm, limit]
    );
    return rows;
  },

  async searchByFilename(pattern: string, limit = 10) {
    const { rows } = await query(
      `SELECT * FROM videos 
       WHERE filename ILIKE $1 
          OR file_path ILIKE $1
          OR s3_key ILIKE $1
       ORDER BY uploaded_at DESC
       LIMIT $2`,
      [pattern, limit]
    );
    return rows;
  },

  async incrementViews(id: string, viewerId?: string, watchDuration?: number, ipAddress?: string, userAgent?: string) {
    await transaction(async (client) => {
      // Increment view count
      await client.query('UPDATE videos SET view_count = view_count + 1 WHERE id = $1', [id]);
      
      // Log detailed view
      await client.query(
        `INSERT INTO video_views (video_id, viewer_id, watch_duration, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, viewerId, watchDuration, ipAddress, userAgent]
      );
    });
  },

  async getVideoStats(id: string) {
    const { rows } = await query(
      `SELECT 
        v.view_count,
        COUNT(vv.id) as detailed_views,
        AVG(vv.watch_duration) as avg_watch_duration,
        COUNT(DISTINCT vv.viewer_id) as unique_viewers
       FROM videos v
       LEFT JOIN video_views vv ON v.id = vv.video_id
       WHERE v.id = $1
       GROUP BY v.id, v.view_count`,
      [id]
    );
    return rows[0];
  },

  async findVideosWithoutThumbnails(limit: number = 10) {
    const { rows } = await query(
      `SELECT * FROM videos 
       WHERE (thumbnail_path IS NULL OR thumbnail_path = '' OR thumbnail_path LIKE '%Video Thumbnail%')
       AND file_path IS NOT NULL 
       ORDER BY uploaded_at DESC 
       LIMIT $1`,
      [limit]
    );
    return rows;
  },

  async findVideosWithBrokenThumbnails(limit: number = 10, offset: number = 0) {
    const { rows } = await query(
      `SELECT * FROM videos 
       WHERE (
         thumbnail_path IS NULL 
         OR thumbnail_path = '' 
         OR thumbnail_path LIKE '%Video Thumbnail%'
         OR thumbnail_path LIKE '/api/videos/thumbnail/%'
         OR thumbnail_path LIKE '%placeholder%'
         OR thumbnail_path LIKE '%error%'
         OR thumbnail_path LIKE '%404%'
         OR thumbnail_path LIKE '%broken%'
         OR thumbnail_path LIKE '%missing%'
       )
       AND file_path IS NOT NULL 
       ORDER BY uploaded_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async findAllVideosForThumbnailRegeneration(limit: number = 50, offset: number = 0) {
    const { rows } = await query(
      `SELECT * FROM videos 
       WHERE file_path IS NOT NULL 
       ORDER BY uploaded_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  },

  async updateVideoPath(videoId: string, s3Key: string, filePath: string) {
    const { rows } = await query(
      `UPDATE videos 
       SET s3_key = $2, 
           file_path = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [videoId, s3Key, filePath]
    );
    return rows[0];
  }
};

// Analytics and reporting functions
export const AnalyticsDB = {
  async getUserStats(userId: string) {
    const { rows } = await query(
      'SELECT * FROM user_dashboard_stats WHERE user_id = $1',
      [userId]
    );
    return rows[0];
  },

  async getSystemStats() {
    const { rows } = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM courses WHERE is_active = true) as active_courses,
        (SELECT COUNT(*) FROM articles WHERE status = 'published') as published_articles,
        (SELECT COUNT(*) FROM events WHERE start_date > CURRENT_TIMESTAMP) as upcoming_events,
        (SELECT COUNT(*) FROM videos WHERE is_processed = true) as processed_videos
    `);
    return rows[0];
  },

  async getPopularContent(limit = 10) {
    const { rows } = await query(
      `SELECT title, view_count, download_count, 'article' as type FROM articles 
       WHERE status = 'published' 
       UNION ALL
       SELECT title, view_count, 0 as download_count, 'video' as type FROM videos 
       WHERE is_public = true
       ORDER BY view_count DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }
};

export default pool;
