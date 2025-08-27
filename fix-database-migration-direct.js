const https = require('https');

// Direct SQL migration - doesn't rely on file system
const MUX_MIGRATION_SQL = `
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
`;

async function runDirectMigration() {
    console.log('🔧 Starting Direct Mux Database Migration...');
    console.log('🌐 Target URL: https://law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app');
    
    try {
        // Step 1: Check current status
        console.log('\n📊 Step 1: Checking migration status...');
        const statusResult = await makeRequest('/api/database/migrate-mux', 'GET');
        console.log('🔍 Current status:', statusResult);
        
        // Step 2: Run direct SQL migration
        console.log('\n🔧 Step 2: Running direct SQL migration...');
        
        const migrationData = {
            directSql: MUX_MIGRATION_SQL,
            migrationName: 'mux_integration_direct',
            dryRun: false
        };
        
        const migrationResult = await makeRequest('/api/database/execute-migration', 'POST', migrationData, {
            'Authorization': 'Bearer migration-token'
        });
        
        console.log('✅ Migration result:', migrationResult);
        
        // Step 3: Verify migration
        console.log('\n🔍 Step 3: Verifying migration...');
        const verifyResult = await makeRequest('/api/database/migrate-mux', 'GET');
        console.log('📋 Verification result:', verifyResult);
        
        if (verifyResult.muxColumnsCount >= 8) {
            console.log('\n🎉 SUCCESS: Mux integration migration completed!');
            console.log(`✅ Found ${verifyResult.muxColumnsCount} Mux columns in database`);
            console.log('🚀 Your application is now ready for Mux thumbnail generation!');
            
            console.log('\n📋 Next Steps:');
            console.log('1. Test video upload with thumbnails');
            console.log('2. Check that Mux assets are created');
            console.log('3. Verify thumbnails appear in video listings');
            
            return true;
        } else {
            console.log('\n⚠️ Migration may not be complete');
            console.log('📊 Please check the database manually');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check that the application is deployed and running');
        console.log('2. Verify DATABASE_URL is configured in Vercel');
        console.log('3. Ensure database server is accessible');
        console.log('4. Check application logs for detailed errors');
        return false;
    }
}

function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Migration-Script/1.0',
                ...headers
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonResponse);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${jsonResponse.error || responseData}`));
                    }
                } catch (parseError) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ message: responseData });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Run the migration
runDirectMigration().then(success => {
    if (success) {
        console.log('\n🎯 Migration completed successfully!');
        process.exit(0);
    } else {
        console.log('\n❌ Migration failed or incomplete');
        process.exit(1);
    }
}).catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});
