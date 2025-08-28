-- Migration: Add speaker identification fields
-- This migration adds fields to store speaker identification data

-- Add speaker identification columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_identifications JSONB;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_count INTEGER DEFAULT 0;

-- Create index for speaker searches
CREATE INDEX IF NOT EXISTS idx_videos_speaker_count ON videos(speaker_count);
CREATE INDEX IF NOT EXISTS idx_videos_speaker_identifications ON videos USING gin(speaker_identifications);

-- Add comments for documentation
COMMENT ON COLUMN videos.speaker_identifications IS 'JSON data containing speaker identification and naming information';
COMMENT ON COLUMN videos.speaker_count IS 'Number of identified speakers in the video';