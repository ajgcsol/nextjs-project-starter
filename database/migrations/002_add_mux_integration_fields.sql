-- Migration: Add Mux integration fields to videos table
-- This migration adds fields to store Mux asset information for video processing

-- Add Mux-related columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS mux_asset_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_playback_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_upload_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS mux_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS mux_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS mux_streaming_url TEXT,
ADD COLUMN IF NOT EXISTS mux_mp4_url TEXT,
ADD COLUMN IF NOT EXISTS mux_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS mux_aspect_ratio VARCHAR(20),
ADD COLUMN IF NOT EXISTS mux_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS mux_ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS audio_enhanced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS audio_enhancement_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS transcription_job_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS captions_webvtt_url TEXT,
ADD COLUMN IF NOT EXISTS captions_srt_url TEXT,
ADD COLUMN IF NOT EXISTS transcript_text TEXT,
ADD COLUMN IF NOT EXISTS transcript_confidence DECIMAL(3,2);

-- Create index on mux_asset_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status);

-- Create table for tracking Mux webhook events
CREATE TABLE IF NOT EXISTS mux_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    mux_asset_id VARCHAR(255),
    mux_upload_id VARCHAR(255),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    event_data JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- Create index on webhook events for processing
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_processed ON mux_webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_asset_id ON mux_webhook_events(mux_asset_id);

-- Create table for audio enhancement jobs
CREATE TABLE IF NOT EXISTS audio_enhancement_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
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

-- Create table for transcription jobs
CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
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

-- Create indexes for job tracking
CREATE INDEX IF NOT EXISTS idx_audio_jobs_video_id ON audio_enhancement_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_audio_jobs_status ON audio_enhancement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_video_id ON transcription_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);

-- Add comments for documentation
COMMENT ON COLUMN videos.mux_asset_id IS 'Mux Asset ID for video processing and streaming';
COMMENT ON COLUMN videos.mux_playback_id IS 'Mux Playback ID for video streaming';
COMMENT ON COLUMN videos.mux_status IS 'Mux asset processing status: pending, preparing, ready, errored';
COMMENT ON COLUMN videos.mux_thumbnail_url IS 'URL for Mux-generated thumbnail';
COMMENT ON COLUMN videos.audio_enhanced IS 'Whether audio enhancement has been applied';
COMMENT ON COLUMN videos.transcript_text IS 'Full transcript text from transcription service';

COMMENT ON TABLE mux_webhook_events IS 'Stores Mux webhook events for processing video status updates';
COMMENT ON TABLE audio_enhancement_jobs IS 'Tracks audio enhancement processing jobs';
COMMENT ON TABLE transcription_jobs IS 'Tracks video transcription and captioning jobs';
