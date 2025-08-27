# Implementation Plan

Fix duplicate video record creation and improve video metadata display with proper edit controls.

The current Mux integration is working but creates duplicate database records during video upload. The system needs streamlined video processing to create a single record with complete metadata, proper duration display, file size information, and edit/publish controls. The user reported that "test-6" created 2 records - one for thumbnail and one for video, indicating race conditions in the upload process.

## Types

Enhanced video record management with atomic operations and complete metadata extraction.

```typescript
interface VideoRecord {
  id: string;
  title: string;
  description?: string;
  filename: string;
  file_path: string;
  file_size: number;
  duration: number; // Required - extracted from Mux or file
  thumbnail_path: string; // Required - Mux thumbnail URL
  video_quality: string;
  uploaded_by: string;
  course_id?: string;
  s3_key?: string;
  s3_bucket?: string;
  is_processed: boolean;
  is_public: boolean;
  // Mux fields
  mux_asset_id?: string;
  mux_playback_id?: string;
  mux_status: 'pending' | 'preparing' | 'ready' | 'errored';
  mux_thumbnail_url?: string;
  mux_streaming_url?: string;
  mux_duration_seconds?: number;
  mux_aspect_ratio?: string;
  // Metadata
  width?: number;
  height?: number;
  bitrate?: number;
  created_at: Date;
  updated_at: Date;
}

interface VideoUploadResult {
  success: boolean;
  video: VideoRecord;
  muxAssetCreated: boolean;
  thumbnailGenerated: boolean;
  processingTime: number;
  duplicatesPrevented: number;
}

interface VideoEditRequest {
  id: string;
  title?: string;
  description?: string;
  is_public?: boolean;
  category?: string;
  tags?: string[];
}
```

## Files

Streamline video upload process and enhance video management interface.

**Modified Files:**
- `src/app/api/videos/upload/route.ts` - Remove duplicate prevention logic, implement atomic video creation with complete metadata
- `src/lib/database.ts` - Simplify VideoDB.create method, remove complex findOrCreateByMuxAsset logic
- `src/app/dashboard/videos/page.tsx` - Add edit controls, improve metadata display, add publish/unpublish functionality
- `src/app/api/videos/[id]/route.ts` - Enhance video update endpoint with proper validation

**New Files:**
- `src/app/api/videos/edit/route.ts` - Dedicated video editing endpoint
- `src/components/VideoEditModal.tsx` - Modal component for editing video metadata
- `src/lib/video-metadata-extractor.ts` - Extract complete metadata from Mux assets

## Functions

Atomic video creation and enhanced metadata management.

**Modified Functions:**
- `VideoDB.create()` in `src/lib/database.ts` - Simplify to single record creation, remove duplicate prevention
- `POST()` in `src/app/api/videos/upload/route.ts` - Implement atomic upload with 5-second processing delay
- `fetchVideos()` in `src/app/dashboard/videos/page.tsx` - Enhanced to display complete metadata
- `handlePublishVideo()` in `src/app/dashboard/videos/page.tsx` - Add proper publish/unpublish toggle

**New Functions:**
- `createVideoWithCompleteMetadata()` - Atomic video creation with all metadata
- `extractMuxMetadata()` - Get duration, dimensions, bitrate from Mux asset
- `updateVideoMetadata()` - Update video information with validation
- `preventDuplicateUploads()` - Simple duplicate prevention using filename + timestamp

## Classes

Enhanced video processing with metadata extraction.

**Modified Classes:**
- `MuxVideoProcessor` in `src/lib/mux-video-processor.ts` - Add metadata extraction methods
- `VideoDB` in `src/lib/database.ts` - Remove complex duplicate prevention, simplify create method

**New Classes:**
- `VideoMetadataExtractor` - Extract complete video metadata from various sources
- `VideoEditValidator` - Validate video edit requests
- `AtomicVideoCreator` - Handle single-transaction video creation

## Dependencies

No new dependencies required - using existing Mux SDK and database libraries.

Existing dependencies:
- `@mux/mux-node` - Already installed for Mux integration
- `pg` - PostgreSQL client for database operations
- `uuid` - For generating unique identifiers

## Testing

Comprehensive testing for duplicate prevention and metadata accuracy.

**Test Files:**
- `test-atomic-video-creation.js` - Test single record creation
- `test-video-metadata-extraction.js` - Verify complete metadata extraction
- `test-video-edit-functionality.js` - Test edit controls and publish/unpublish

**Validation:**
- Upload same video multiple times - should create only one record
- Verify duration, file size, dimensions are correctly displayed
- Test edit functionality - title, description, visibility changes
- Confirm publish/unpublish toggles work correctly

## Implementation Order

Sequential implementation to prevent conflicts and ensure data integrity.

1. **Simplify Database Layer** - Remove complex duplicate prevention from VideoDB.create()
2. **Enhance Metadata Extraction** - Add complete metadata extraction from Mux assets
3. **Implement Atomic Upload** - Modify upload route to create single record with 5-second processing delay
4. **Add Edit Controls** - Implement video editing modal and update functionality
5. **Enhance Dashboard Display** - Show complete metadata (duration, file size, dimensions)
6. **Add Publish Controls** - Implement publish/unpublish toggle functionality
7. **Test Duplicate Prevention** - Verify no duplicate records are created
8. **Deploy and Validate** - Test on production environment
