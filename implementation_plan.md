# Implementation Plan

## Overview
Fix video streaming and thumbnail functionality by implementing robust fallback mechanisms that can dynamically discover and serve both S3 video files and thumbnails even when database records are incomplete or missing S3 key mappings.

The current system has a critical disconnect between the PostgreSQL database records and actual S3 file storage. Videos and thumbnails are successfully uploaded to S3 and accessible via CloudFront, but both the streaming API and thumbnail API fail because database records don't contain correct S3 key mappings. This implementation will create a multi-layered fallback system that can discover both video files and thumbnails through various methods, ensuring complete media functionality regardless of database inconsistencies.

## Types
Define enhanced video streaming and thumbnail interfaces and error handling types.

```typescript
interface VideoStreamResponse {
  success: boolean;
  videoUrl?: string;
  method?: 'database' | 'cloudfront_discovery' | 'presigned_fallback';
  error?: string;
  metadata?: {
    s3Key?: string;
    cloudFrontUrl?: string;
    directUrl?: string;
    discoveryAttempts?: string[];
  };
}

interface ThumbnailResponse {
  success: boolean;
  thumbnailUrl?: string;
  method?: 'database' | 'cloudfront_discovery' | 'placeholder_fallback';
  error?: string;
  metadata?: {
    s3Key?: string;
    cloudFrontUrl?: string;
    discoveryAttempts?: string[];
  };
}

interface MediaDiscoveryResult {
  found: boolean;
  url?: string;
  s3Key?: string;
  method: string;
  responseTime?: number;
  mediaType: 'video' | 'thumbnail';
}

interface DatabaseVideoRecord {
  id: string;
  title: string;
  filename: string;
  file_path: string;
  thumbnail_path?: string;
  s3_key?: string;
  s3_bucket?: string;
  is_processed: boolean;
  uploaded_at: string;
}
```

## Files
Modify existing streaming and thumbnail endpoints and create supporting utilities.

**Modified Files:**
- `src/app/api/videos/stream/[id]/route.ts` - Complete rewrite with robust fallback mechanism
- `src/app/api/videos/thumbnail/[id]/route.ts` - Enhanced with thumbnail discovery fallbacks
- `src/lib/videoDatabase.ts` - Add media discovery utilities (optional enhancement)

**New Files:**
- `src/lib/mediaDiscovery.ts` - Video and thumbnail file discovery utilities
- `src/app/api/videos/repair-database/route.ts` - Database repair endpoint for fixing S3 key mappings
- `src/app/api/videos/repair-thumbnails/route.ts` - Thumbnail repair endpoint for fixing thumbnail paths

**Configuration Updates:**
- Environment variables validation for CloudFront domain
- S3 bucket policy validation for thumbnails folder access
- Error logging enhancements in monitoring system

## Functions
Implement comprehensive video and thumbnail discovery and streaming functions.

**New Functions:**
- `discoverVideoByCloudFront(videoId: string): Promise<MediaDiscoveryResult>` - Test CloudFront URLs with common S3 key patterns for videos
- `discoverThumbnailByCloudFront(videoId: string): Promise<MediaDiscoveryResult>` - Test CloudFront URLs with common S3 key patterns for thumbnails
- `discoverMediaByS3Listing(videoId: string, mediaType: 'video' | 'thumbnail'): Promise<MediaDiscoveryResult>` - Query S3 bucket for matching files
- `generatePresignedFallback(s3Key: string): Promise<string>` - Generate presigned URL as last resort
- `validateMediaUrl(url: string): Promise<boolean>` - Test if media URL is accessible
- `repairDatabaseRecord(videoId: string, videoS3Key?: string, thumbnailS3Key?: string): Promise<void>` - Update database with discovered S3 keys
- `generatePlaceholderThumbnail(videoId: string): Response` - Enhanced placeholder thumbnail generation

**Modified Functions:**
- `GET /api/videos/stream/[id]` - Complete rewrite with multi-stage fallback logic
- `GET /api/videos/thumbnail/[id]` - Enhanced with thumbnail discovery fallbacks
- `POST /api/videos/thumbnail/[id]` - Improved S3 key storage and CloudFront URL handling
- Video and thumbnail monitoring and error logging functions

## Classes
Enhance existing video management classes with discovery capabilities for both videos and thumbnails.

**Modified Classes:**
- `VideoDB` class in `src/lib/database.ts` - Add methods for updating S3 keys and thumbnail paths
- `AWSFileManager` class in `src/lib/aws-integration.ts` - Add S3 listing capabilities for media discovery

**New Classes:**
- `MediaDiscoveryService` - Centralized video and thumbnail file discovery and URL resolution
- `VideoStreamingService` - High-level video streaming with automatic fallbacks
- `ThumbnailService` - High-level thumbnail serving with automatic fallbacks and placeholder generation

## Dependencies
No new external dependencies required.

All functionality will use existing dependencies:
- `@aws-sdk/client-s3` - Already installed for S3 operations
- `pg` - Already installed for PostgreSQL operations
- Next.js built-in fetch API for URL validation
- Existing monitoring and logging infrastructure

## Testing
Comprehensive testing approach for video streaming and thumbnail reliability.

**Test Files:**
- `src/app/api/videos/stream/[id]/route.test.ts` - Unit tests for streaming endpoint
- `src/app/api/videos/thumbnail/[id]/route.test.ts` - Unit tests for thumbnail endpoint
- `src/lib/mediaDiscovery.test.ts` - Tests for discovery mechanisms
- Integration tests for end-to-end video playback and thumbnail display

**Existing Test Modifications:**
- Update video upload tests to verify S3 key storage for both videos and thumbnails
- Add video player component tests for error handling
- Add thumbnail display tests for fallback scenarios
- Database connection tests for video and thumbnail queries

**Validation Strategies:**
- Test with known working video IDs from S3 console (e.g., `1755747422456-n7j0zzbh069`)
- Test with database records missing S3 keys and thumbnail paths
- Test CloudFront URL construction and validation for both videos and thumbnails
- Test thumbnail fallback to placeholder generation
- Performance testing for discovery mechanisms
- Test S3 bucket policy compliance for thumbnails folder access

## Implementation Order
Logical sequence to minimize conflicts and ensure successful integration.

1. **Create Media Discovery Service** - Build core discovery utilities in `src/lib/mediaDiscovery.ts` for both videos and thumbnails
2. **Enhance Database Layer** - Add S3 key and thumbnail path update methods to VideoDB class
3. **Rewrite Streaming Endpoint** - Implement multi-stage fallback in `/api/videos/stream/[id]/route.ts`
4. **Enhance Thumbnail Endpoint** - Implement discovery fallbacks in `/api/videos/thumbnail/[id]/route.ts`
5. **Add Database Repair Endpoints** - Create repair endpoints for fixing existing video and thumbnail records
6. **Update Error Handling** - Enhance monitoring and logging for media streaming failures
7. **Test with Known Media** - Verify functionality with `1755747422456-n7j0zzbh069.mp4` and its thumbnail
8. **Validate Component Integration** - Ensure VideoPlayer and thumbnail components handle new URLs
9. **Performance Optimization** - Add caching and optimize discovery performance for both media types
10. **S3 Policy Validation** - Ensure bucket policy allows access to both videos and thumbnails folders
