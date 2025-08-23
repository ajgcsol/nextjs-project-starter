-- Migration: Add unique constraint on mux_asset_id to prevent duplicate video entries
-- This migration ensures each Mux Asset ID can only exist once in the videos table

-- Step 1: First, let's identify and handle any existing duplicates
-- Create a temporary table to store duplicate resolution data
CREATE TABLE IF NOT EXISTS temp_duplicate_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mux_asset_id VARCHAR(255),
    primary_video_id UUID,
    duplicate_video_ids UUID[],
    resolution_action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Find existing duplicate videos by mux_asset_id
-- This query will help us identify duplicates before applying the constraint
INSERT INTO temp_duplicate_videos (mux_asset_id, primary_video_id, duplicate_video_ids, resolution_action)
SELECT 
    mux_asset_id,
    (array_agg(id ORDER BY created_at DESC))[1] as primary_video_id,
    array_agg(id ORDER BY created_at DESC) as duplicate_video_ids,
    'merge_required' as resolution_action
FROM videos 
WHERE mux_asset_id IS NOT NULL 
GROUP BY mux_asset_id 
HAVING COUNT(*) > 1;

-- Step 3: Create a function to merge duplicate video metadata
CREATE OR REPLACE FUNCTION merge_duplicate_videos()
RETURNS TABLE(
    merged_count INTEGER,
    primary_videos UUID[],
    deleted_videos UUID[]
) AS $$
DECLARE
    duplicate_record RECORD;
    primary_video RECORD;
    duplicate_video RECORD;
    merged_counter INTEGER := 0;
    primary_ids UUID[] := '{}';
    deleted_ids UUID[] := '{}';
BEGIN
    -- Process each group of duplicates
    FOR duplicate_record IN 
        SELECT mux_asset_id, primary_video_id, duplicate_video_ids 
        FROM temp_duplicate_videos 
        WHERE resolution_action = 'merge_required'
    LOOP
        -- Get the primary video (most recent)
        SELECT * INTO primary_video 
        FROM videos 
        WHERE id = duplicate_record.primary_video_id;
        
        -- Merge metadata from duplicates into primary video
        FOR duplicate_video IN 
            SELECT * FROM videos 
            WHERE id = ANY(duplicate_record.duplicate_video_ids) 
            AND id != duplicate_record.primary_video_id
        LOOP
            -- Update primary video with merged metadata
            UPDATE videos SET
                -- Keep the most complete title
                title = CASE 
                    WHEN LENGTH(COALESCE(title, '')) < LENGTH(COALESCE(duplicate_video.title, '')) 
                    THEN duplicate_video.title 
                    ELSE title 
                END,
                -- Keep the most complete description
                description = CASE 
                    WHEN LENGTH(COALESCE(description, '')) < LENGTH(COALESCE(duplicate_video.description, '')) 
                    THEN duplicate_video.description 
                    ELSE description 
                END,
                -- Keep the larger file size (more complete upload)
                file_size = CASE 
                    WHEN COALESCE(file_size, 0) < COALESCE(duplicate_video.file_size, 0) 
                    THEN duplicate_video.file_size 
                    ELSE file_size 
                END,
                -- Keep the longer duration
                duration = CASE 
                    WHEN COALESCE(duration, 0) < COALESCE(duplicate_video.duration, 0) 
                    THEN duplicate_video.duration 
                    ELSE duration 
                END,
                -- Prefer processed videos
                is_processed = COALESCE(is_processed, FALSE) OR COALESCE(duplicate_video.is_processed, FALSE),
                -- Keep the best thumbnail
                thumbnail_path = CASE 
                    WHEN thumbnail_path IS NULL OR thumbnail_path LIKE '%placeholder%' 
                    THEN COALESCE(duplicate_video.thumbnail_path, thumbnail_path)
                    ELSE thumbnail_path 
                END,
                -- Keep Mux URLs if missing
                mux_thumbnail_url = COALESCE(mux_thumbnail_url, duplicate_video.mux_thumbnail_url),
                mux_streaming_url = COALESCE(mux_streaming_url, duplicate_video.mux_streaming_url),
                mux_mp4_url = COALESCE(mux_mp4_url, duplicate_video.mux_mp4_url),
                -- Keep the most recent update
                updated_at = GREATEST(COALESCE(updated_at, created_at), COALESCE(duplicate_video.updated_at, duplicate_video.created_at))
            WHERE id = duplicate_record.primary_video_id;
            
            -- Add to deleted list
            deleted_ids := array_append(deleted_ids, duplicate_video.id);
        END LOOP;
        
        -- Add to primary list
        primary_ids := array_append(primary_ids, duplicate_record.primary_video_id);
        merged_counter := merged_counter + 1;
    END LOOP;
    
    -- Delete the duplicate records (keep only primary)
    DELETE FROM videos 
    WHERE id = ANY(deleted_ids);
    
    -- Update resolution status
    UPDATE temp_duplicate_videos 
    SET resolution_action = 'merged_completed'
    WHERE resolution_action = 'merge_required';
    
    RETURN QUERY SELECT merged_counter, primary_ids, deleted_ids;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Execute the merge function (commented out for safety - run manually)
-- SELECT * FROM merge_duplicate_videos();

-- Step 5: Add the unique constraint on mux_asset_id
-- This will prevent future duplicates
ALTER TABLE videos 
ADD CONSTRAINT unique_mux_asset_id 
UNIQUE (mux_asset_id);

-- Step 6: Create optimized indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id_unique 
ON videos(mux_asset_id) 
WHERE mux_asset_id IS NOT NULL;

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_videos_mux_status_created 
ON videos(mux_status, created_at) 
WHERE mux_asset_id IS NOT NULL;

-- Create index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_videos_filename_created 
ON videos(filename, created_at);

-- Step 7: Create a view for easy duplicate monitoring
CREATE OR REPLACE VIEW duplicate_videos_monitor AS
SELECT 
    mux_asset_id,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as video_ids,
    array_agg(title ORDER BY created_at DESC) as titles,
    array_agg(created_at ORDER BY created_at DESC) as created_dates,
    MAX(created_at) as latest_upload,
    MIN(created_at) as first_upload
FROM videos 
WHERE mux_asset_id IS NOT NULL 
GROUP BY mux_asset_id 
HAVING COUNT(*) > 1;

-- Step 8: Create function to detect potential duplicates by filename and timing
CREATE OR REPLACE FUNCTION detect_potential_duplicates(
    time_window_seconds INTEGER DEFAULT 300
)
RETURNS TABLE(
    group_id UUID,
    filename TEXT,
    video_ids UUID[],
    titles TEXT[],
    upload_times TIMESTAMP[],
    time_diff_seconds INTEGER[]
) AS $$
BEGIN
    RETURN QUERY
    WITH potential_duplicates AS (
        SELECT 
            v1.filename,
            array_agg(DISTINCT v1.id ORDER BY v1.created_at DESC) as ids,
            array_agg(DISTINCT v1.title ORDER BY v1.created_at DESC) as video_titles,
            array_agg(DISTINCT v1.created_at ORDER BY v1.created_at DESC) as upload_dates
        FROM videos v1
        WHERE EXISTS (
            SELECT 1 FROM videos v2 
            WHERE v2.filename = v1.filename 
            AND v2.id != v1.id
            AND ABS(EXTRACT(EPOCH FROM (v1.created_at - v2.created_at))) <= time_window_seconds
        )
        GROUP BY v1.filename
        HAVING COUNT(DISTINCT v1.id) > 1
    )
    SELECT 
        gen_random_uuid() as group_id,
        pd.filename,
        pd.ids as video_ids,
        pd.video_titles as titles,
        pd.upload_dates as upload_times,
        ARRAY(
            SELECT EXTRACT(EPOCH FROM (upload_dates[i] - upload_dates[1]))::INTEGER
            FROM generate_subscripts(upload_dates, 1) i
        ) as time_diff_seconds
    FROM potential_duplicates pd;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add comments for documentation
COMMENT ON CONSTRAINT unique_mux_asset_id ON videos IS 'Ensures each Mux Asset ID appears only once, preventing duplicate video entries';
COMMENT ON FUNCTION merge_duplicate_videos() IS 'Merges duplicate video records by consolidating metadata into the most recent record';
COMMENT ON FUNCTION detect_potential_duplicates(INTEGER) IS 'Detects potential duplicate videos by filename and upload timing';
COMMENT ON VIEW duplicate_videos_monitor IS 'Monitors for any duplicate Mux Asset IDs in the videos table';
COMMENT ON TABLE temp_duplicate_videos IS 'Temporary table for tracking duplicate video resolution during migration';

-- Step 10: Create trigger to log duplicate attempts
CREATE OR REPLACE FUNCTION log_duplicate_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Log attempted duplicate insertion
    INSERT INTO mux_webhook_events (
        event_type, 
        mux_asset_id, 
        event_data, 
        processed
    ) VALUES (
        'duplicate_prevention',
        NEW.mux_asset_id,
        jsonb_build_object(
            'attempted_video_id', NEW.id,
            'existing_video_query', 'SELECT id FROM videos WHERE mux_asset_id = ''' || NEW.mux_asset_id || '''',
            'prevention_timestamp', NOW(),
            'error_message', 'Duplicate Mux Asset ID prevented by unique constraint'
        ),
        FALSE
    );
    
    RETURN NULL; -- This will never execute due to constraint violation
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate attempt logging
CREATE TRIGGER trigger_log_duplicate_attempts
    BEFORE INSERT ON videos
    FOR EACH ROW
    WHEN (NEW.mux_asset_id IS NOT NULL)
    EXECUTE FUNCTION log_duplicate_attempt();

-- Final step: Create a summary report function
CREATE OR REPLACE FUNCTION duplicate_migration_summary()
RETURNS TABLE(
    total_duplicates_found INTEGER,
    duplicates_merged INTEGER,
    constraint_applied BOOLEAN,
    indexes_created INTEGER,
    monitoring_views_created INTEGER
) AS $$
DECLARE
    duplicates_found INTEGER;
    duplicates_merged INTEGER;
    constraint_exists BOOLEAN;
    index_count INTEGER;
    view_count INTEGER;
BEGIN
    -- Count original duplicates found
    SELECT COUNT(*) INTO duplicates_found
    FROM temp_duplicate_videos;
    
    -- Count merged duplicates
    SELECT COUNT(*) INTO duplicates_merged
    FROM temp_duplicate_videos
    WHERE resolution_action = 'merged_completed';
    
    -- Check if constraint exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_mux_asset_id' 
        AND table_name = 'videos'
    ) INTO constraint_exists;
    
    -- Count indexes created
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'videos' 
    AND indexname LIKE 'idx_videos_mux%';
    
    -- Count views created
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_name = 'duplicate_videos_monitor';
    
    RETURN QUERY SELECT 
        duplicates_found,
        duplicates_merged,
        constraint_exists,
        index_count,
        view_count;
END;
$$ LANGUAGE plpgsql;

-- Instructions for manual execution:
-- 1. Run this migration to create the structure
-- 2. Review duplicates: SELECT * FROM temp_duplicate_videos;
-- 3. Execute merge: SELECT * FROM merge_duplicate_videos();
-- 4. Verify results: SELECT * FROM duplicate_migration_summary();
-- 5. Monitor ongoing: SELECT * FROM duplicate_videos_monitor;
