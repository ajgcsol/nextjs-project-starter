import { query } from './database';

export interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export class DatabaseMigrationUtils {
  /**
   * Check if Mux columns exist in the videos table
   */
  static async checkMuxColumnsExist(): Promise<{
    exist: boolean;
    missingColumns: string[];
    existingColumns: string[];
  }> {
    try {
      console.log('🔍 Checking for Mux columns in videos table...');
      
      const result = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'videos' 
        AND table_schema = 'public'
        ORDER BY column_name
      `);
      
      const existingColumns = result.rows.map(row => row.column_name);
      console.log('📋 Existing columns:', existingColumns);
      
      const requiredMuxColumns = [
        'mux_asset_id',
        'mux_playback_id',
        'mux_upload_id',
        'mux_status',
        'mux_thumbnail_url',
        'mux_streaming_url',
        'mux_mp4_url',
        'mux_duration_seconds',
        'mux_aspect_ratio',
        'mux_created_at',
        'mux_ready_at',
        'audio_enhanced',
        'audio_enhancement_job_id',
        'transcription_job_id',
        'captions_webvtt_url',
        'captions_srt_url',
        'transcript_text',
        'transcript_confidence'
      ];
      
      const missingColumns = requiredMuxColumns.filter(col => !existingColumns.includes(col));
      const existingMuxColumns = requiredMuxColumns.filter(col => existingColumns.includes(col));
      
      console.log('✅ Existing Mux columns:', existingMuxColumns);
      console.log('❌ Missing Mux columns:', missingColumns);
      
      return {
        exist: missingColumns.length === 0,
        missingColumns,
        existingColumns: existingMuxColumns
      };
      
    } catch (error) {
      console.error('❌ Error checking Mux columns:', error);
      throw error;
    }
  }

  /**
   * Apply Mux migration to add missing columns
   */
  static async applyMuxMigration(): Promise<MigrationResult> {
    try {
      console.log('🚀 Starting Mux database migration...');
      
      // First check what's missing
      const columnCheck = await this.checkMuxColumnsExist();
      
      if (columnCheck.exist) {
        return {
          success: true,
          message: 'Mux columns already exist - no migration needed',
          details: {
            existingColumns: columnCheck.existingColumns,
            missingColumns: []
          }
        };
      }
      
      console.log('📝 Applying Mux migration SQL...');
      
      // Apply the migration SQL
      const migrationSQL = `
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
      `;
      
      await query(migrationSQL);
      console.log('✅ Mux columns added successfully');
      
      // Create indexes
      const indexSQL = `
        -- Create indexes on mux_asset_id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON videos(mux_asset_id);
        CREATE INDEX IF NOT EXISTS idx_videos_mux_status ON videos(mux_status);
      `;
      
      await query(indexSQL);
      console.log('✅ Mux indexes created successfully');
      
      // Create Mux webhook events table
      const webhookTableSQL = `
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
      `;
      
      await query(webhookTableSQL);
      console.log('✅ Mux webhook events table created');
      
      // Create webhook indexes
      const webhookIndexSQL = `
        CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_processed ON mux_webhook_events(processed, created_at);
        CREATE INDEX IF NOT EXISTS idx_mux_webhook_events_asset_id ON mux_webhook_events(mux_asset_id);
      `;
      
      await query(webhookIndexSQL);
      console.log('✅ Mux webhook indexes created');
      
      // Verify migration
      const verificationCheck = await this.checkMuxColumnsExist();
      
      if (verificationCheck.exist) {
        console.log('🎉 Mux migration completed successfully!');
        return {
          success: true,
          message: 'Mux migration completed successfully',
          details: {
            columnsAdded: verificationCheck.existingColumns,
            tablesCreated: ['mux_webhook_events'],
            indexesCreated: ['idx_videos_mux_asset_id', 'idx_videos_mux_status', 'idx_mux_webhook_events_processed', 'idx_mux_webhook_events_asset_id']
          }
        };
      } else {
        return {
          success: false,
          message: 'Migration completed but some columns are still missing',
          details: {
            missingColumns: verificationCheck.missingColumns,
            existingColumns: verificationCheck.existingColumns
          }
        };
      }
      
    } catch (error) {
      console.error('❌ Mux migration failed:', error);
      return {
        success: false,
        message: 'Mux migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if database connection is working
   */
  static async checkDatabaseConnection(): Promise<MigrationResult> {
    try {
      const result = await query('SELECT NOW() as current_time, version() as db_version');
      return {
        success: true,
        message: 'Database connection successful',
        details: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].db_version
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get comprehensive database status for Mux integration
   */
  static async getDatabaseStatus(): Promise<{
    connection: MigrationResult;
    muxColumns: { exist: boolean; missingColumns: string[]; existingColumns: string[] };
    videoCount: number;
    muxVideoCount: number;
  }> {
    try {
      const connection = await this.checkDatabaseConnection();
      const muxColumns = await this.checkMuxColumnsExist();
      
      // Get video counts
      const videoCountResult = await query('SELECT COUNT(*) as total FROM videos');
      const videoCount = parseInt(videoCountResult.rows[0].total);
      
      let muxVideoCount = 0;
      if (muxColumns.existingColumns.includes('mux_asset_id')) {
        const muxCountResult = await query('SELECT COUNT(*) as total FROM videos WHERE mux_asset_id IS NOT NULL');
        muxVideoCount = parseInt(muxCountResult.rows[0].total);
      }
      
      return {
        connection,
        muxColumns,
        videoCount,
        muxVideoCount
      };
      
    } catch (error) {
      throw error;
    }
  }
}

export default DatabaseMigrationUtils;
