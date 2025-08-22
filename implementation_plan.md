# Implementation Plan

Replace MediaConvert with Mux as the default video processing service, implementing automatic audio enhancement, transcription, and modern video player features during upload.

This implementation will completely replace the broken MediaConvert integration with a fully functional Mux-based video processing pipeline. The system will automatically handle video conversion (including WMV to MP4), generate real thumbnails, enhance audio quality, create transcriptions/captions, and provide a modern streaming experience. S3 will continue to be used for initial upload storage, but Mux will handle all processing, streaming, and advanced features.

## Types

Define comprehensive TypeScript interfaces for Mux integration with enhanced video processing capabilities.

```typescript
// Enhanced Mux Asset Creation Result
interface MuxAssetCreationResult {
  success: boolean;
  assetId?: string;
  playbackId?: string;
  uploadId?: string;
  uploadUrl?: string;
  thumbnailUrl?: string;
  streamingUrl?: string;
  mp4Url?: string;
  duration?: number;
  aspectRatio?: string;
  audioTrackId?: string;
  captionTrackId?: string;
  processingStatus: 'preparing' | 'ready' | 'errored';
  error?: string;
}

// Mux Processing Options
interface MuxProcessingOptions {
  generateThumbnails: boolean;
  enhanceAudio: boolean;
  generateCaptions: boolean;
  captionLanguage: string;
  normalizeAudio: boolean;
  playbackPolicy: 'public' | 'signed';
  mp4Support: 'none' | 'standard' | 'high';
  maxResolution: '1080p' | '1440p' | '2160p';
}

// Enhanced Video Database Schema
interface VideoRecord {
  id: string;
  title: string;
  description: string;
  filename: string;
  file_path: string;
  file_size: number;
  duration: number;
  thumbnail_path: string;
  // New Mux fields
  mux_asset_id?: string;
  mux_playback_id?: string;
  mux_upload_id?: string;
  mux_status: 'pending' | 'preparing' | 'ready' | 'errored';
  mux_thumbnail_url?: string;
  mux_streaming_url?: string;
  mux_mp4_url?: string;
  audio_enhanced: boolean;
  audio_enhancement_job_id?: string;
  transcript_text?: string;
  transcript_confidence?: number;
  captions_vtt_url?: string;
  captions_srt_url?: string;
  transcription_job_id?: string;
  processing_completed_at?: string;
}

// Modern Video Player Props
interface ModernVideoPlayerProps {
  src: string;
  muxPlaybackId?: string;
  title?: string;
  poster?: string;
  captions?: CaptionTrack[];
  qualities?: string[];
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  responsive?: boolean;
  pictureInPicture?: boolean;
  airplay?: boolean;
  chromecast?: boolean;
  analytics?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onQualityChange?: (quality: string) => void;
  onCaptionChange?: (language: string) => void;
}

interface CaptionTrack {
  label: string;
  src: string;
  srcLang: string;
  default?: boolean;
  kind: 'subtitles' | 'captions';
}
```

## Files

Comprehensive file modifications to replace MediaConvert with Mux integration and enhance video processing capabilities.

**New Files to Create:**
- `src/lib/mux-video-processor.ts` - Enhanced Mux integration with full video processing pipeline
- `src/components/MuxVideoPlayer.tsx` - Modern video player with Mux streaming integration
- `src/app/api/mux/webhook/route.ts` - Mux webhook handler for processing status updates
- `src/app/api/videos/mux-upload/route.ts` - Mux direct upload endpoint
- `src/lib/mux-audio-processor.ts` - Real audio enhancement using Mux capabilities
- `src/lib/mux-transcription.ts` - Real transcription service using Mux
- `src/hooks/useMuxPlayer.ts` - React hook for Mux player state management
- `src/types/mux.ts` - Comprehensive Mux type definitions

**Existing Files to Modify:**
- `src/app/api/videos/upload/route.ts` - Replace MediaConvert calls with Mux asset creation
- `src/lib/thumbnailGenerator.ts` - Update to use enhanced Mux thumbnail generation
- `src/lib/audioProcessor.ts` - Replace simulation with real Mux audio processing
- `src/lib/transcriptionService.ts` - Replace simulation with real Mux transcription
- `src/components/VideoPlayer.tsx` - Enhance with Mux streaming and modern features
- `src/app/api/videos/stream/[id]/route.ts` - Update to serve Mux streaming URLs
- `src/app/dashboard/videos/page.tsx` - Update to display Mux processing status
- `src/app/dashboard/videos/[id]/page.tsx` - Enhanced video details with Mux data
- `database/migrations/002_add_mux_integration_fields.sql` - Execute database schema updates

**Files to Remove/Deprecate:**
- `src/lib/videoConverter.ts` - Replace MediaConvert logic with Mux processing
- All MediaConvert test scripts and setup files
- `src/app/api/mediaconvert/setup/route.ts` - No longer needed

**Configuration Updates:**
- `package.json` - Ensure @mux/mux-node is latest version
- Environment variables - Remove MediaConvert vars, ensure Mux vars are set

## Functions

Complete function implementation for Mux-based video processing pipeline.

**New Functions:**
- `MuxVideoProcessor.createAssetFromS3()` - Create Mux asset from S3 uploaded video
- `MuxVideoProcessor.createDirectUpload()` - Create Mux direct upload for large files
- `MuxVideoProcessor.getAssetStatus()` - Check Mux asset processing status
- `MuxVideoProcessor.generateThumbnails()` - Generate multiple thumbnail variants
- `MuxVideoProcessor.enhanceAudio()` - Real audio enhancement using Mux
- `MuxVideoProcessor.generateCaptions()` - Real transcription and caption generation
- `MuxVideoProcessor.getStreamingUrls()` - Get adaptive streaming URLs
- `MuxVideoProcessor.processWebhook()` - Handle Mux webhook events
- `useMuxPlayer()` - React hook for player state and controls
- `MuxVideoPlayer.handleQualityChange()` - Dynamic quality switching
- `MuxVideoPlayer.handleCaptionToggle()` - Caption display management

**Modified Functions:**
- `POST /api/videos/upload` - Replace MediaConvert asset creation with Mux
- `ThumbnailGenerator.generateThumbnail()` - Use Mux thumbnail API instead of MediaConvert
- `AudioProcessor.processVideoAudio()` - Use real Mux audio enhancement
- `TranscriptionService.transcribeVideo()` - Use real Mux transcription
- `GET /api/videos/stream/[id]` - Serve Mux streaming URLs instead of S3 direct links
- `VideoPlayer.changeQuality()` - Integrate with Mux adaptive streaming
- `VideoPlayer.toggleCaptions()` - Use Mux-generated caption tracks

**Removed Functions:**
- All MediaConvert job creation and management functions
- `VideoConverter.startConversion()` - Replaced by Mux automatic processing
- `VideoConverter.getJobStatus()` - Replaced by Mux webhook system
- `VideoConverter.needsConversion()` - Mux handles all formats automatically

## Classes

Enhanced class structure for comprehensive Mux integration.

**New Classes:**
- `MuxVideoProcessor` - Main class for all Mux video operations
  - Methods: createAsset, getStatus, generateThumbnails, enhanceAudio, generateCaptions
  - Handles: Asset lifecycle, webhook processing, error handling
- `MuxAudioProcessor` - Real audio enhancement using Mux capabilities
  - Methods: enhanceAudio, normalizeVolume, reduceNoise, extractAudio
  - Features: Real-time audio processing, quality enhancement
- `MuxTranscriptionService` - Real transcription using Mux
  - Methods: generateCaptions, getSupportedLanguages, getTranscriptText
  - Features: Multi-language support, speaker identification, confidence scoring
- `MuxPlayerController` - Advanced player state management
  - Methods: handlePlayback, manageQuality, syncCaptions, trackAnalytics
  - Features: Adaptive streaming, analytics integration, accessibility

**Modified Classes:**
- `ThumbnailGenerator` - Enhanced to use Mux thumbnail generation with multiple variants
- `AudioProcessor` - Updated to use real Mux audio processing instead of simulation
- `TranscriptionService` - Updated to use real Mux transcription instead of simulation
- `VideoPlayer` - Enhanced with modern features, Mux streaming, and accessibility

**Removed Classes:**
- `VideoConverter` - Completely replaced by MuxVideoProcessor
- All MediaConvert-related classes and utilities

## Dependencies

Updated dependency management for Mux integration and modern video features.

**Existing Dependencies (Confirmed):**
- `@mux/mux-node: ^12.6.0` - Already installed, ensure latest version
- `@aws-sdk/client-s3: ^3.864.0` - Keep for initial upload storage
- `lucide-react: ^0.509.0` - For modern player controls icons

**New Dependencies to Add:**
- `@mux/mux-player-react: ^2.0.0` - Official Mux React player component
- `@mux/playback-core: ^0.15.0` - Core Mux playback functionality
- `hls.js: ^1.4.0` - HLS streaming support for browsers
- `video.js: ^8.0.0` - Fallback video player with plugin ecosystem
- `@videojs/themes: ^1.0.0` - Modern video player themes

**Development Dependencies:**
- `@types/video.js: ^3.3.0` - TypeScript definitions for Video.js

**Environment Variables Required:**
- `VIDEO_MUX_TOKEN_ID` - Already configured
- `VIDEO_MUX_TOKEN_SECRET` - Already configured
- `MUX_WEBHOOK_SECRET` - New, for webhook signature verification
- `MUX_ENVIRONMENT_KEY` - New, for Mux Data analytics

## Testing

Comprehensive testing strategy for Mux integration and video processing pipeline.

**New Test Files:**
- `test-mux-complete-integration.js` - End-to-end Mux processing test
- `test-mux-audio-enhancement.js` - Real audio processing validation
- `test-mux-transcription.js` - Real transcription and caption generation
- `test-mux-player-integration.js` - Modern player functionality testing
- `test-mux-webhook-handling.js` - Webhook processing validation

**Modified Test Files:**
- Update all existing thumbnail generation tests to use Mux
- Update video upload tests to validate Mux asset creation
- Update streaming tests to use Mux URLs instead of S3 direct links

**Testing Scenarios:**
- Upload various video formats (MP4, MOV, AVI, WMV) and verify Mux conversion
- Test audio enhancement on videos with poor audio quality
- Validate transcription accuracy and caption generation
- Test modern player features (quality switching, captions, PiP)
- Verify webhook processing for asset status updates
- Test batch processing of existing videos for Mux migration

## Implementation Order

Logical sequence of implementation to ensure smooth transition and minimize system disruption.

1. **Database Migration and Core Setup**
   - Execute Mux database migration to add required fields
   - Update environment variables and configuration
   - Install new dependencies and update existing ones

2. **Enhanced Mux Integration Library**
   - Create comprehensive MuxVideoProcessor class
   - Implement real audio enhancement using Mux capabilities
   - Implement real transcription service using Mux
   - Add webhook handling for processing status updates

3. **Upload Process Integration**
   - Update video upload endpoint to create Mux assets
   - Replace MediaConvert calls with Mux asset creation
   - Implement automatic processing pipeline (thumbnails, audio, captions)
   - Add progress tracking and status updates

4. **Modern Video Player Enhancement**
   - Create MuxVideoPlayer component with modern features
   - Implement adaptive streaming with quality switching
   - Add caption support with Mux-generated tracks
   - Integrate accessibility features and mobile responsiveness

5. **Streaming and Playback Updates**
   - Update video streaming endpoints to serve Mux URLs
   - Replace S3 direct links with Mux streaming URLs
   - Implement adaptive bitrate streaming
   - Add analytics and performance monitoring

6. **Dashboard and UI Updates**
   - Update video dashboard to show Mux processing status
   - Add controls for audio enhancement and transcription
   - Display processing progress and completion status
   - Implement batch processing interface for existing videos

7. **Testing and Validation**
   - Test complete upload-to-playback pipeline
   - Validate audio enhancement and transcription quality
   - Test modern player features across devices
   - Verify webhook processing and status updates

8. **Migration and Cleanup**
   - Create migration tools for existing videos to Mux
   - Remove deprecated MediaConvert code and files
   - Update documentation and deployment procedures
   - Monitor system performance and optimize as needed
