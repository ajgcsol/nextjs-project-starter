# Implementation Plan

## Overview
Fix the broken video upload system by resolving database schema mismatches, completing the Mux integration migration, and removing MediaConvert dependencies to create a clean, working Mux-only video processing pipeline.

The current system fails because the upload route attempts to insert Mux-specific database fields that don't exist in the production schema, causing complete upload failures. The user has requested replacing MediaConvert with Mux entirely, but the migration is incomplete and the error handling is inadequate. This implementation will complete the Mux transition, fix the database schema, and ensure robust error handling for a production-ready video upload system.

## Types
Define comprehensive type interfaces for Mux integration and database operations.

```typescript
// Enhanced Mux integration types
interface MuxVideoRecord {
  id: string;
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
  // Mux-specific fields
  mux_asset_id?: string;
  mux_playback_id?: string;
  mux_upload_id?: string;
  mux_status?: 'pending' | 'preparing' | 'ready' | 'errored';
  mux_thumbnail_url?: string;
  mux_streaming_url?: string;
  mux_mp4_url?: string;
  mux_duration_seconds?: number;
  mux_aspect_ratio?: string;
  mux_created_at?: Date;
  mux_ready_at?: Date;
  audio_enhanced?: boolean;
  audio_enhancement_job_id?: string;
  transcription_job_id?: string;
  captions_webvtt_url?: string;
  captions_srt_url?: string;
  transcript_text?: string;
  transcript_confidence?: number;
}

interface DatabaseMigrationResult {
  success: boolean;
  tablesCreated: string[];
  columnsAdded: string[];
  indexesCreated: string[];
  error?: string;
}

interface UploadResult {
  success: boolean;
  video?: MuxVideoRecord;
  muxAsset?: {
    assetId: string;
    playbackId: string;
    status: string;
    thumbnailUrl?: string;
    streamingUrl?: string;
  };
  error?: string;
  fallbackUsed?: boolean;
}
```

## Files
Modify existing files and create new migration utilities to complete Mux integration.

**Files to Modify:**
- `src/app/api/videos/upload/route.ts`: Fix database insertion with proper error handling and Mux field validation
- `src/lib/database.ts`: Update VideoDB.create method to handle missing Mux columns gracefully
- `src/app/api/database/run-mux-migration/route.ts`: Enhance migration endpoint with better error reporting
- `database/migrations/002_add_mux_integration_fields.sql`: Ensure migration uses proper PostgreSQL syntax

**Files to Create:**
- `src/lib/database-migration-utils.ts`: Utility functions for checking and applying database migrations
- `src/app/api/videos/mux-status/route.ts`: Endpoint for checking Mux processing status
- `test-database-schema-fix.js`: Test script to verify database schema after migration

**Files to Remove/Clean:**
- Remove MediaConvert references from `src/lib/thumbnailGenerator.ts`
- Clean up MediaConvert imports in upload route
- Remove unused MediaConvert test scripts

## Functions
Implement robust database migration and error handling functions.

**New Functions:**
- `DatabaseMigrationUtils.checkMuxColumnsExist()`: Check if Mux columns exist in videos table
- `DatabaseMigrationUtils.applyMuxMigration()`: Apply Mux migration with proper error handling
- `VideoDB.createWithFallback()`: Create video record with graceful Mux field handling
- `MuxIntegrationValidator.validateMuxCredentials()`: Validate Mux API credentials
- `UploadErrorHandler.handleDatabaseSchemaError()`: Handle database schema mismatches gracefully

**Modified Functions:**
- `VideoDB.create()`: Add try-catch for missing Mux columns with automatic fallback
- `MuxVideoProcessor.createAssetFromS3()`: Enhanced error handling and status reporting
- `POST /api/videos/upload`: Restructure to handle database schema issues gracefully

**Removed Functions:**
- Remove all MediaConvert-related functions from upload route
- Remove MediaConvert fallback logic
- Clean up unused MediaConvert imports

## Classes
Update existing classes to support clean Mux-only integration.

**Modified Classes:**
- `MuxVideoProcessor`: Enhanced with better error handling and status tracking
- `VideoDB`: Updated create method with schema-aware field insertion
- `ThumbnailGenerator`: Remove MediaConvert dependencies, use Mux-only thumbnail generation

**New Classes:**
- `DatabaseMigrationManager`: Handle database schema migrations and validation
- `MuxIntegrationManager`: Centralized Mux operations and status management

## Dependencies
Current dependencies are sufficient - no new packages required.

**Existing Dependencies Used:**
- `@mux/mux-node`: Already installed and configured
- `pg`: PostgreSQL client for database operations
- `@aws-sdk/client-s3`: For S3 operations (keeping for file storage)

**Dependencies to Remove:**
- Remove MediaConvert-related AWS SDK imports where not needed
- Clean up unused MediaConvert configuration

## Testing
Comprehensive testing strategy to ensure reliable video upload functionality.

**Test Files to Create:**
- `test-mux-database-integration.js`: Test Mux database operations with and without schema
- `test-upload-with-schema-migration.js`: Test upload process during migration
- `test-mux-error-handling.js`: Test error scenarios and fallback behavior

**Test Files to Update:**
- Update existing Mux test scripts to validate new error handling
- Modify upload test scripts to test schema migration scenarios

**Testing Strategy:**
1. Test database migration process
2. Test upload with missing Mux columns (should use fallback)
3. Test upload after migration (should use full Mux integration)
4. Test Mux API error scenarios
5. Test database connection failures

## Implementation Order
Logical sequence to minimize disruption and ensure successful integration.

1. **Database Migration Preparation**
   - Create database migration utilities
   - Add schema validation functions
   - Test migration SQL on development database

2. **Upload Route Error Handling**
   - Modify VideoDB.create to handle missing columns gracefully
   - Update upload route to use fallback insertion method
   - Add comprehensive error logging

3. **Database Schema Migration**
   - Apply Mux migration to production database
   - Verify all Mux columns are created correctly
   - Test database operations with new schema

4. **Mux Integration Validation**
   - Test Mux asset creation with new database fields
   - Validate Mux webhook handling
   - Test audio enhancement and transcription features

5. **MediaConvert Cleanup**
   - Remove MediaConvert imports and references
   - Clean up unused MediaConvert test scripts
   - Update documentation to reflect Mux-only approach

6. **Production Testing**
   - Test complete upload flow with real files
   - Validate Mux processing pipeline
   - Verify thumbnail generation and video streaming

7. **Performance Optimization**
   - Optimize database queries for Mux fields
   - Implement proper indexing for Mux asset lookups
   - Add monitoring for Mux processing status

8. **Documentation and Cleanup**
   - Update API documentation
   - Clean up test files and scripts
   - Document Mux integration for future maintenance
