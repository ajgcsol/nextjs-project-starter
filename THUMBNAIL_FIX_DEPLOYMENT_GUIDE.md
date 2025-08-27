# Thumbnail Fix - Deployment Guide

## Current Issue
Thumbnails are not showing for uploaded videos because:
1. The new Mux integration code hasn't been deployed yet
2. Database is missing Mux integration columns
3. Webhook processing is not active
4. Existing videos need to be processed through Mux

## Immediate Solution

### Step 1: Run Analysis
```bash
node fix-thumbnails-immediate.js
```
This will analyze the current state and provide specific recommendations.

### Step 2: Deploy New Code
The following files need to be deployed to Vercel:
- `src/app/api/database/execute-migration/route.ts` - Database migration API
- `src/lib/mux-webhook-handler.ts` - Webhook processing logic
- `src/app/api/mux/webhook/route.ts` - Updated webhook endpoint
- `scripts/batch-process-existing-videos.js` - Batch processing script

### Step 3: Execute Database Migration
After deployment, run the migration:
```bash
curl -X POST https://your-domain.vercel.app/api/database/execute-migration \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'
```

### Step 4: Configure Mux Webhook
In your Mux dashboard, set the webhook URL to:
```
https://your-domain.vercel.app/api/mux/webhook
```

### Step 5: Process Existing Videos
```bash
node scripts/batch-process-existing-videos.js
```

## Root Cause Analysis

### Why Thumbnails Aren't Working
1. **Missing Mux Assets**: Videos are uploaded to S3 but Mux assets aren't created
2. **Database Schema**: Missing Mux columns prevent proper storage of thumbnail URLs
3. **Webhook Failures**: Mux webhooks fail due to missing database fields
4. **No Fallback**: Current system doesn't have proper fallback thumbnail generation

### What the Fix Does
1. **Database Migration**: Adds all necessary Mux columns and tables
2. **Webhook Handler**: Processes Mux events and updates database
3. **Asset Creation**: Automatically creates Mux assets during upload
4. **Batch Processing**: Handles existing videos that need Mux integration

## Expected Results After Fix

### New Video Uploads
- ✅ Mux asset created automatically
- ✅ Thumbnail generated within 30-60 seconds
- ✅ Transcription and captions generated
- ✅ Proper database storage with all Mux fields

### Existing Videos
- ✅ Processed through Mux batch system
- ✅ Thumbnails generated for all videos
- ✅ Database updated with Mux asset information

## Verification Steps

### 1. Test New Upload
```bash
# Upload a test video and verify thumbnail generation
curl -X POST https://your-domain.vercel.app/api/videos/upload \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Video",
    "s3Key": "test/video.mp4",
    "publicUrl": "https://bucket.s3.amazonaws.com/test/video.mp4",
    "filename": "video.mp4",
    "size": 10485760
  }'
```

### 2. Check Webhook Processing
```bash
# Verify webhook endpoint is working
curl -X GET https://your-domain.vercel.app/api/mux/webhook
```

### 3. Verify Database Migration
```bash
# Check migration status
curl -X GET https://your-domain.vercel.app/api/database/execute-migration
```

## Troubleshooting

### If Thumbnails Still Don't Show
1. Check Mux credentials in Vercel environment variables
2. Verify webhook URL is configured in Mux dashboard
3. Check database migration completed successfully
4. Review Vercel function logs for errors

### If Batch Processing Fails
1. Ensure all environment variables are set
2. Check database connectivity
3. Verify Mux API credentials
4. Run with smaller batch sizes

## Environment Variables Required
```
VIDEO_MUX_TOKEN_ID=your_mux_token_id
VIDEO_MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=q6ac7p1sv5fqvcs2c5oboh84mhjoctko
DATABASE_URL=your_neon_database_url
S3_BUCKET_NAME=your_s3_bucket
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## Success Metrics
- All new video uploads generate thumbnails within 60 seconds
- Existing videos have thumbnails after batch processing
- Webhook processing shows 200 status codes
- Database contains Mux asset IDs for all videos

## Next Steps After Fix
1. Monitor thumbnail generation for new uploads
2. Set up automated batch processing for future videos
3. Configure Mux webhook monitoring
4. Implement thumbnail fallback strategies
