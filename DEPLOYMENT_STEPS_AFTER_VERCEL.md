# Post-Deployment Steps - Run These After Vercel Deploy

## Step 1: Run Database Migration (REQUIRED)

After your Vercel deployment completes, run this script in your terminal:

```bash
node run-database-migration.js
```

**Alternative method (if the script doesn't work):**

```bash
curl -X POST https://law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app/api/database/execute-migration \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer migration-token" \
  -d '{"migrationName": "002_add_mux_integration_fields", "dryRun": false}'
```

**What this does:**
- Adds all the Mux integration columns to your database
- Creates webhook tracking tables
- Sets up indexes for performance
- **This is REQUIRED for thumbnails to work**

## Step 2: Test the System

Run the analysis script to verify everything is working:

```bash
node fix-thumbnails-immediate.js
```

**Expected output:**
- ✅ Video upload is working
- ✅ Database migration completed
- ✅ Webhook endpoint active

## Step 3: Configure Mux Webhook (Optional but Recommended)

1. Go to your Mux dashboard
2. Navigate to Settings > Webhooks
3. Add this webhook URL:
   ```
   https://law-school-repository-hqjtev09v-andrew-j-gregwares-projects.vercel.app/api/mux/webhook
   ```

## Step 4: Process Existing Videos (Optional)

To add thumbnails to your existing 14 videos:

```bash
node scripts/batch-process-existing-videos.js
```

## Step 5: Update Your Frontend

Change your video upload code to use the new synchronous endpoint:

```javascript
// OLD endpoint
const response = await fetch('/api/videos/upload', {

// NEW endpoint (ensures thumbnails are ready)
const response = await fetch('/api/videos/upload-with-sync-processing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title,
    s3Key,
    publicUrl,
    filename,
    size,
    mimeType,
    syncProcessing: true // This ensures thumbnails are ready before response
  })
});
```

## Troubleshooting

### If Step 1 fails:
- Check that your DATABASE_URL environment variable is set in Vercel
- Verify your Neon database is accessible
- Try the migration again - it's safe to run multiple times

### If thumbnails still don't appear:
- Make sure you completed Step 1 (database migration)
- Check that MUX_TOKEN_ID and MUX_TOKEN_SECRET are set in Vercel environment variables
- Try uploading a new video using the new endpoint

### If you get 404 errors:
- Wait a few minutes for Vercel deployment to fully propagate
- Check that the new API endpoints are deployed by visiting them in browser

## Success Indicators

After completing these steps, you should see:
- ✅ New video uploads have thumbnails within 30-90 seconds
- ✅ Database contains Mux asset information
- ✅ Webhook processing works correctly
- ✅ Existing videos can be processed for thumbnails

The most important step is **Step 1 - the database migration**. Without this, the new thumbnail system won't work.
