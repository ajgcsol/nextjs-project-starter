-- Migration: Add missing video fields for thumbnail and streaming
-- This migration adds fields that were missing from the videos table

-- Add missing columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS thumbnail_timestamp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streaming_url TEXT,
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private',
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS tags TEXT,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS stream_url TEXT,
ADD COLUMN IF NOT EXISTS size BIGINT,
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS audio_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS audio_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS transcript VARCHAR(500),
ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS transcript_word_count INTEGER,
ADD COLUMN IF NOT EXISTS captions_url TEXT,
ADD COLUMN IF NOT EXISTS captions_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_videos_s3_key ON videos(s3_key);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON videos(created_by);

-- Add comments for documentation
COMMENT ON COLUMN videos.thumbnail_timestamp IS 'Timestamp in seconds for custom thumbnail generation';
COMMENT ON COLUMN videos.streaming_url IS 'Direct streaming URL for the video';
COMMENT ON COLUMN videos.s3_key IS 'S3 object key for the uploaded video file';
COMMENT ON COLUMN videos.status IS 'Processing status: pending, processing, ready, failed';
COMMENT ON COLUMN videos.visibility IS 'Video visibility: private, public, unlisted';
COMMENT ON COLUMN videos.category IS 'Video category or subject classification';
COMMENT ON COLUMN videos.tags IS 'Comma-separated tags for video organization';
COMMENT ON COLUMN videos.views IS 'Number of times the video has been viewed';
COMMENT ON COLUMN videos.created_by IS 'User identifier who created the video';
COMMENT ON COLUMN videos.stream_url IS 'Streaming URL for video playback';
COMMENT ON COLUMN videos.size IS 'File size in bytes';
COMMENT ON COLUMN videos.processing_status IS 'Current processing status';
COMMENT ON COLUMN videos.audio_job_id IS 'Audio enhancement job identifier';
COMMENT ON COLUMN videos.audio_status IS 'Audio processing status';
COMMENT ON COLUMN videos.transcript IS 'Video transcript text (first 500 chars)';
COMMENT ON COLUMN videos.transcript_confidence IS 'Transcript confidence score';
COMMENT ON COLUMN videos.transcript_word_count IS 'Number of words in transcript';
COMMENT ON COLUMN videos.captions_url IS 'URL to captions/subtitles file';
COMMENT ON COLUMN videos.captions_status IS 'Caption processing status';
COMMENT ON COLUMN videos.webhook_received_at IS 'When webhook notification was received';