-- Migration: Add missing video fields cleanly
-- Each statement on separate lines for proper parsing

-- Add missing columns that we need
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_timestamp INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS streaming_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS s3_key VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS stream_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_job_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_status VARCHAR(50);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript VARCHAR(500);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_word_count INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_status VARCHAR(50);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP;

-- Add Mux columns if not already added
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_aspect_ratio VARCHAR(20);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS mux_ready_at TIMESTAMP;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS audio_enhancement_job_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS captions_srt_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2);

-- Create tables
CREATE TABLE IF NOT EXISTS mux_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    mux_asset_id VARCHAR(255),
    mux_upload_id VARCHAR(255),
    video_id UUID,
    event_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audio_enhancement_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    input_audio_url TEXT,
    output_audio_url TEXT,
    enhancement_options JSONB,
    processing_method VARCHAR(50),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    language VARCHAR(10) DEFAULT 'en-US',
    transcript_text TEXT,
    confidence DECIMAL(3,2),
    word_count INTEGER,
    webvtt_url TEXT,
    srt_url TEXT,
    transcription_options JSONB,
    processing_method VARCHAR(50),
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status);
CREATE INDEX IF NOT EXISTS idx_videos_s3_key ON videos(s3_key);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_visibility ON videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON videos(created_by);
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_processed ON mux_webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_asset_id ON mux_webhook_events(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_video_id ON audio_enhancement_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_enhancement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_video_id ON transcription_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);