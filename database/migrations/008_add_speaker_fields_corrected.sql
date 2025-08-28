-- Migration: Add speaker identification fields (corrected)
-- Add the columns first, then create indexes

-- Add speaker identification columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_identifications JSONB;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS speaker_count INTEGER DEFAULT 0;

-- Create indexes after columns exist
CREATE INDEX IF NOT EXISTS idx_videos_speaker_count ON videos(speaker_count);
CREATE INDEX IF NOT EXISTS idx_videos_speaker_identifications ON videos USING gin(speaker_identifications);