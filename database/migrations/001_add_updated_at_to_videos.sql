-- Add updated_at column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at 
BEFORE UPDATE ON videos 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add missing indexes for video performance
CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
CREATE INDEX IF NOT EXISTS idx_videos_is_processed ON videos(is_processed);
CREATE INDEX IF NOT EXISTS idx_videos_updated_at ON videos(updated_at);

-- Add full-text search index for videos
CREATE INDEX IF NOT EXISTS idx_videos_search ON videos USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));