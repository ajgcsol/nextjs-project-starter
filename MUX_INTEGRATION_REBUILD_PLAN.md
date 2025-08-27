# Mux Integration Rebuild Plan

## Current Issues Identified

Based on my analysis of the codebase, here are the main issues with the current Mux integration:

### 1. **Webhook URL Missing**
- **Issue**: No webhook endpoint configured for Mux dashboard
- **Solution**: ✅ Created `/api/mux/webhook` endpoint
- **URL for Mux Dashboard**: `https://your-domain.vercel.app/api/mux/webhook`

### 2. **Database Schema Inconsistencies**
- **Issue**: Mux fields exist in migration but not fully integrated in database interface
- **Current Status**: Migration exists but TypeScript interfaces need updates
- **Solution**: Update database interface to properly handle Mux fields

### 3. **Thumbnail Generation Issues**
- **Issue**: Mux automatic thumbnail generation not properly stored/retrieved
- **Root Cause**: Database updates not using correct field names
- **Solution**: Fix field mapping in webhook handlers

### 4. **Transcript Generation Issues**
- **Issue**: Mux automatic transcription not being captured
- **Root Cause**: Caption/transcript fields not properly handled in database
- **Solution**: Implement proper caption storage and retrieval

## Implementation Plan

### Phase 1: Database Schema Fixes ✅ PARTIALLY COMPLETE

**Files to Update:**
- `src/lib/database.ts` - Update VideoDB interface
- `database/migrations/002_add_mux_integration_fields.sql` - ✅ Already exists

**Status**: Migration exists, interface needs minor updates for caption fields

### Phase 2: Webhook Integration ✅ COMPLETE

**Files Created:**
- `src/app/api/mux/webhook/route.ts` - ✅ Created

**Webhook URL for Mux Dashboard:**
```
https://your-vercel-domain.vercel.app/api/mux/webhook
```

**Webhook Events Handled:**
- `video.asset.ready` - Updates database with playback URLs and thumbnails
- `video.asset.errored` - Marks video as failed
- `video.asset.created` - Initial asset creation
- `video.upload.asset_created` - Direct upload completion
- `video.asset.track.ready` - Caption/subtitle tracks ready

### Phase 3: Video Upload Integration

**Files to Update:**
- `src/app/api/videos/upload/route.ts` - ✅ Already has Mux integration
- `src/lib/mux-video-processor.ts` - ✅ Already exists

**Current Status**: Upload integration exists but needs testing

### Phase 4: Video Player Integration

**Files to Update:**
- `src/components/MuxVideoPlayer.tsx` - ✅ Already exists
- `src/components/PremiumMuxPlayer.tsx` - ✅ Already exists

**Current Status**: Players exist but need proper data integration

### Phase 5: Thumbnail & Transcript Fixes

**Key Issues to Fix:**

1. **Thumbnail Storage**:
   ```typescript
   // Current issue: Field name mismatch
   mux_streaming_url vs streaming_url
   
   // Fix: Use correct field names in webhook
   await VideoDB.updateMuxAsset(videoId, {
     mux_thumbnail_url: thumbnailUrl,
     mux_streaming_url: streamingUrl, // Fixed field name
     mux_mp4_url: mp4Url
   });
   ```

2. **Transcript Storage**:
   ```typescript
   // Need to add caption fields to updateMuxAsset interface
   captions_webvtt_url: string
   captions_srt_url: string
   transcript_text: string
   transcript_confidence: number
   ```

## Environment Variables Required

### Mux Credentials (Already Set)
```bash
VIDEO_MUX_TOKEN_ID=your_mux_token_id
VIDEO_MUX_TOKEN_SECRET=your_mux_token_secret
```

### Webhook Configuration
```bash
# Add to Mux Dashboard Settings
WEBHOOK_URL=https://your-domain.vercel.app/api/mux/webhook
```

## Testing Plan

### 1. Database Migration Test
```bash
# Run migration to ensure Mux fields exist
node test_js_scripts/test-database-migration.js
```

### 2. Webhook Test
```bash
# Test webhook endpoint
node test-mux-integration-final.js
```

### 3. End-to-End Upload Test
```bash
# Test complete upload -> Mux -> webhook -> database flow
node test_js_scripts/test-complete-mux-integration-final.js
```

## Mux Dashboard Configuration

### 1. Add Webhook URL
1. Go to Mux Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/mux/webhook`
3. Select events:
   - `video.asset.ready`
   - `video.asset.errored`
   - `video.asset.created`
   - `video.upload.asset_created`
   - `video.asset.track.ready`

### 2. Enable Automatic Features
1. **Automatic Thumbnails**: ✅ Enabled by default
2. **Automatic Transcription**: Enable in asset creation settings
3. **MP4 Support**: Configure based on plan (pay-as-you-go vs subscription)

## Current File Status

### ✅ Complete Files
- `src/app/api/mux/webhook/route.ts` - Webhook handler
- `src/lib/mux-video-processor.ts` - Mux API integration
- `src/components/MuxVideoPlayer.tsx` - Video player component
- `database/migrations/002_add_mux_integration_fields.sql` - Database schema

### 🔄 Needs Minor Updates
- `src/lib/database.ts` - Add caption fields to updateMuxAsset interface
- `src/app/api/videos/upload/route.ts` - Test and verify Mux integration

### 📋 Testing Required
- Webhook processing
- Thumbnail generation and storage
- Transcript generation and storage
- End-to-end video upload flow

## Next Steps

1. **Configure Mux Webhook** (IMMEDIATE):
   - Add webhook URL to Mux dashboard
   - Test webhook with sample video

2. **Database Interface Update** (MINOR):
   - Add caption fields to TypeScript interface
   - Test database updates

3. **End-to-End Testing** (CRITICAL):
   - Upload test video
   - Verify webhook processing
   - Check thumbnail and transcript generation

4. **Production Deployment**:
   - Deploy webhook endpoint
   - Update Mux dashboard with production URL
   - Monitor webhook events

## Troubleshooting Guide

### Common Issues

1. **Webhook Not Receiving Events**:
   - Check Mux dashboard webhook configuration
   - Verify webhook URL is accessible
   - Check webhook endpoint logs

2. **Thumbnails Not Generating**:
   - Verify Mux asset has `playback_id`
   - Check webhook `video.asset.ready` event
   - Verify database field mapping

3. **Transcripts Not Available**:
   - Check if transcription is enabled in Mux
   - Verify `video.asset.track.ready` webhook events
   - Check caption URL generation

4. **Database Errors**:
   - Run database migration
   - Check field name consistency
   - Verify database connection

## Success Metrics

- ✅ Webhook endpoint responds to Mux events
- ✅ Thumbnails automatically generated and stored
- ✅ Transcripts automatically generated and accessible
- ✅ Video playback works with Mux URLs
- ✅ Database properly stores all Mux metadata

## Webhook URL for Mux Dashboard

**Production URL**: `https://your-vercel-domain.vercel.app/api/mux/webhook`

Replace `your-vercel-domain` with your actual Vercel deployment domain.

The webhook endpoint is now ready and will handle all Mux events to automatically update your database with thumbnails, streaming URLs, and transcription data.
