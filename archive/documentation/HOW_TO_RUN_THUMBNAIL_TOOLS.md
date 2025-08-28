# 🛠️ How to Run Thumbnail Tools & Ensure Upload Integration

## 🚀 **QUICK START - Testing Tools**

### **1. Test Current MediaConvert Status**
```bash
# Run the comprehensive debug script
node debug-mediaconvert-thumbnail.js
```
**Expected Output:**
- ✅ Should show `method: 'mediaconvert'` (not `enhanced_svg`)
- ✅ Should return MediaConvert job IDs
- ✅ Should show clean environment variables (no `\r\n`)

### **2. Test Individual Video Thumbnail Generation**
```bash
# Test specific video with S3 key
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails" \
  -H "Content-Type: application/json" \
  -d '{"videoId": "d65ae252-b52b-4862-93ca-6f0818fec8f4", "forceRegenerate": true}'
```

### **3. Test Batch Thumbnail Generation**
```bash
# Generate thumbnails for multiple videos
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails" \
  -H "Content-Type: application/json" \
  -d '{"batchMode": true, "limit": 5, "forceRegenerate": true}'
```

### **4. Check Videos Needing Thumbnails**
```bash
# List videos without proper thumbnails
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=10"
```

---

## 📹 **ENSURING THUMBNAILS DURING VIDEO UPLOAD**

### **Current Upload Integration Status:**

The thumbnail generation is **automatically integrated** into the video upload process through:

1. **Upload Route Integration** (`src/app/api/videos/upload/route.ts`)
2. **Background Processing** (ThumbnailGenerator.generateThumbnailBackground)
3. **Database Updates** (Automatic thumbnail path storage)

### **How It Works During Upload:**

```javascript
// In upload route - this happens automatically:
1. Video uploaded to S3 → Gets S3 key
2. Video record created in database → Gets video ID  
3. Background thumbnail generation triggered → ThumbnailGenerator.generateThumbnailBackground()
4. MediaConvert job created → Real thumbnail extracted
5. Database updated → Thumbnail path stored
```

### **Testing Upload Integration:**

#### **Option A: Test via Web Interface**
1. Go to: `https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/dashboard/videos`
2. Upload a new video file
3. Check if thumbnail appears automatically
4. Verify in database that `thumbnail_path` is populated

#### **Option B: Test via API**
```bash
# Upload a video file (replace with actual file)
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/upload" \
  -F "video=@test-video.mp4" \
  -F "title=Test Upload Thumbnail" \
  -F "description=Testing automatic thumbnail generation"
```

---

## 🔧 **DEBUGGING UPLOAD INTEGRATION**

### **Check Upload Route Integration:**

```bash
# Check if upload route has thumbnail integration
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/upload" \
  -X OPTIONS -v
```

### **Monitor Background Processing:**
```bash
# Check recent video uploads and their thumbnail status
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos" | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const recent = data.videos.slice(0, 5);
    recent.forEach(v => {
      console.log(\`Video: \${v.title}\`);
      console.log(\`  ID: \${v.id}\`);
      console.log(\`  S3 Key: \${v.s3_key || 'MISSING'}\`);
      console.log(\`  Thumbnail: \${v.thumbnailUrl}\`);
      console.log(\`  Method: \${v.thumbnailUrl?.includes('svg') ? 'SVG' : 'Real'}\`);
      console.log('---');
    });
  "
```

---

## 🎯 **FORCE THUMBNAIL GENERATION FOR EXISTING VIDEOS**

### **Regenerate All Broken Thumbnails:**
```bash
# Process all videos missing thumbnails
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails" \
  -H "Content-Type: application/json" \
  -d '{"batchMode": true, "limit": 50, "forceRegenerate": false}'
```

### **Force Regenerate Specific Video:**
```bash
# Replace VIDEO_ID with actual video ID
VIDEO_ID="d65ae252-b52b-4862-93ca-6f0818fec8f4"
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails" \
  -H "Content-Type: application/json" \
  -d "{\"videoId\": \"$VIDEO_ID\", \"forceRegenerate\": true}"
```

---

## 📊 **MONITORING & VERIFICATION**

### **Check MediaConvert Jobs in AWS:**
```bash
# List recent MediaConvert jobs (requires AWS CLI)
aws mediaconvert list-jobs --region us-east-1 --max-results 10
```

### **Check S3 Thumbnails:**
```bash
# List thumbnails in S3 bucket
aws s3 ls s3://law-school-repository-content/thumbnails/ --recursive
```

### **Verify Database Updates:**
```bash
# Check database for thumbnail paths
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos" | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const withThumbnails = data.videos.filter(v => v.thumbnailUrl && !v.thumbnailUrl.includes('svg'));
    console.log(\`Videos with real thumbnails: \${withThumbnails.length}\`);
    withThumbnails.forEach(v => console.log(\`  - \${v.title}: \${v.thumbnailUrl}\`));
  "
```

---

## 🚨 **TROUBLESHOOTING**

### **If Thumbnails Still Show as SVG:**

1. **Check Environment Variables:**
```bash
# Verify MediaConvert config
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/mediaconvert/setup"
```

2. **Check AWS Credentials:**
```bash
# Verify AWS access
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/aws/health"
```

3. **Force Clean Environment Variables:**
```bash
# Remove and re-add MediaConvert variables in Vercel
vercel env rm MEDIACONVERT_ENDPOINT production
vercel env rm MEDIACONVERT_ROLE_ARN production

# Add clean versions (without \r\n)
vercel env add MEDIACONVERT_ENDPOINT production
# Enter: https://mediaconvert.us-east-1.amazonaws.com

vercel env add MEDIACONVERT_ROLE_ARN production
# Enter: arn:aws:iam::792298120704:role/MediaConvert-Role
```

### **If Upload Integration Not Working:**

1. **Check Upload Route:**
```bash
# Verify upload route exists and responds
curl -I "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/upload"
```

2. **Test Background Processing:**
```bash
# Manually trigger background processing for existing video
node -e "
  const videoId = 'd65ae252-b52b-4862-93ca-6f0818fec8f4';
  const s3Key = 'videos/1755798554783-7u483xlorx5.wmv';
  
  fetch('https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, forceRegenerate: true })
  }).then(r => r.json()).then(console.log);
"
```

---

## ✅ **SUCCESS INDICATORS**

### **Thumbnails Working Correctly When:**
- ✅ `debug-mediaconvert-thumbnail.js` shows `method: 'mediaconvert'`
- ✅ API returns job IDs instead of SVG data URLs
- ✅ S3 bucket contains `.jpg` files in `/thumbnails/` folder
- ✅ Database `thumbnail_path` contains CloudFront URLs (not data URLs)
- ✅ New video uploads automatically get real thumbnails within 2-3 minutes

### **Upload Integration Working When:**
- ✅ New video uploads trigger automatic thumbnail generation
- ✅ Videos appear in dashboard with proper thumbnails
- ✅ No manual intervention needed for thumbnail creation
- ✅ Background processing completes without errors

---

## 🎯 **QUICK VERIFICATION CHECKLIST**

Run these commands in order to verify everything works:

```bash
# 1. Test MediaConvert status
node debug-mediaconvert-thumbnail.js

# 2. Test single video thumbnail
curl -X POST "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos/generate-thumbnails" -H "Content-Type: application/json" -d '{"videoId": "d65ae252-b52b-4862-93ca-6f0818fec8f4", "forceRegenerate": true}'

# 3. Check for real thumbnails in database
curl "https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/api/videos" | grep -o '"thumbnailUrl":"[^"]*"' | head -5

# 4. Upload a test video (via web interface)
# Go to: https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app/dashboard/videos

# 5. Verify automatic thumbnail generation worked
# Check if new video has real thumbnail (not SVG)
```

**If all steps show MediaConvert jobs being created and real thumbnails being generated, the integration is working correctly!**
