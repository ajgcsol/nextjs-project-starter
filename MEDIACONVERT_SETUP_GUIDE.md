# 🎬 AWS MediaConvert Setup Guide - Fix Real Thumbnail Generation

## 📋 **OVERVIEW**
This guide will help you set up AWS MediaConvert to extract real video frames for thumbnails instead of generating SVG placeholders.

## 🎯 **WHAT YOU'LL ACHIEVE**
- ✅ Real video frame extraction for thumbnails
- ✅ Automatic thumbnail generation during video upload
- ✅ Batch thumbnail processing for existing videos
- ✅ Professional-quality video thumbnails

---

## 🚀 **STEP 1: CREATE MEDIACONVERT IAM ROLE**

### **1.1 Go to AWS IAM Console**
1. Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **"Roles"** in the left sidebar
3. Click **"Create role"**

### **1.2 Configure Role**
1. **Select trusted entity**: Choose **"AWS service"**
2. **Use case**: Select **"MediaConvert"**
3. Click **"Next"**

### **1.3 Attach Permissions**
The role needs these permissions (AWS will suggest them):
- `AmazonS3FullAccess` (or create custom policy for your bucket)
- `AmazonAPIGatewayInvokeFullAccess`

**Custom S3 Policy (Recommended):**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObjectVersion"
            ],
            "Resource": [
                "arn:aws:s3:::law-school-repository-content/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::law-school-repository-content"
            ]
        }
    ]
}
```

### **1.4 Name the Role**
- **Role name**: `MediaConvert-ThumbnailGeneration-Role`
- **Description**: `Role for MediaConvert to access S3 for thumbnail generation`
- Click **"Create role"**

### **1.5 Copy the Role ARN**
After creation, copy the **Role ARN** - it looks like:
```
arn:aws:iam::123456789012:role/MediaConvert-ThumbnailGeneration-Role
```

---

## 🌐 **STEP 2: GET MEDIACONVERT ENDPOINT**

### **2.1 Go to MediaConvert Console**
1. Open [AWS MediaConvert Console](https://console.aws.amazon.com/mediaconvert/)
2. Make sure you're in the **same region** as your S3 bucket (likely `us-east-1`)

### **2.2 Get Account-Specific Endpoint**
1. In the MediaConvert console, look for **"Account-specific endpoint"**
2. It will look like: `https://abc123def.mediaconvert.us-east-1.amazonaws.com`
3. **Copy this URL** - you'll need it for the environment variable

### **2.3 Test MediaConvert Access**
1. Try creating a test job in the console to verify your permissions
2. Make sure you can access your S3 bucket from MediaConvert

---

## ⚙️ **STEP 3: ADD ENVIRONMENT VARIABLES TO VERCEL**

### **3.1 Go to Vercel Dashboard**
1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your `law-school-repository` project
3. Click on the project name

### **3.2 Add Environment Variables**
1. Go to **"Settings"** tab
2. Click **"Environment Variables"** in the left sidebar
3. Add these two new variables:

**Variable 1:**
- **Name**: `MEDIACONVERT_ROLE_ARN`
- **Value**: `arn:aws:iam::123456789012:role/MediaConvert-ThumbnailGeneration-Role`
- **Environment**: Select **"Production"**, **"Preview"**, and **"Development"**

**Variable 2:**
- **Name**: `MEDIACONVERT_ENDPOINT`
- **Value**: `https://abc123def.mediaconvert.us-east-1.amazonaws.com`
- **Environment**: Select **"Production"**, **"Preview"**, and **"Development"**

### **3.3 Verify Existing Variables**
Make sure these are already set (they should be):
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION` (should be `us-east-1`)
- ✅ `S3_BUCKET_NAME` (should be `law-school-repository-content`)

---

## 🚀 **STEP 4: REDEPLOY APPLICATION**

### **4.1 Trigger Deployment**
After adding the environment variables, you need to redeploy:

**Option A: Automatic Redeploy**
1. Go to **"Deployments"** tab in Vercel
2. Click **"Redeploy"** on the latest deployment

**Option B: Git Push**
1. Make a small change to any file (add a comment)
2. Commit and push to trigger automatic deployment

### **4.2 Wait for Deployment**
- Wait for the deployment to complete
- The new environment variables will be available after deployment

---

## 🧪 **STEP 5: TEST REAL THUMBNAIL GENERATION**

### **5.1 Test with Admin Interface**
1. Go to: `https://your-app.vercel.app/admin/fix-thumbnails`
2. Click **"Process All Videos"** or select specific videos
3. Watch the console logs for MediaConvert job creation

### **5.2 Test with New Upload**
1. Upload a new video through the upload interface
2. Check if a real thumbnail is generated automatically
3. Verify the thumbnail shows an actual video frame, not an SVG

### **5.3 Check MediaConvert Jobs**
1. Go to [AWS MediaConvert Console](https://console.aws.amazon.com/mediaconvert/)
2. Click **"Jobs"** to see if thumbnail extraction jobs are being created
3. Monitor job status (should show "COMPLETE" when finished)

---

## 🔧 **STEP 6: VERIFY THUMBNAIL GENERATION**

### **6.1 Check S3 Bucket**
1. Go to your S3 bucket: `law-school-repository-content`
2. Look for a `thumbnails/` folder
3. Verify that `.jpg` files are being created (not just `.svg` files)

### **6.2 Test Thumbnail URLs**
Real thumbnails should be accessible at:
```
https://d24qjgz9z4yzof.cloudfront.net/thumbnails/VIDEO_ID_frame_VIDEO_ID.0000001.jpg
```

### **6.3 Check Database Updates**
1. Verify that video records in the database have updated `thumbnail_path` values
2. The paths should point to real `.jpg` files, not SVG data URLs

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues:**

**1. "MediaConvert job creation failed"**
- ✅ Check that the IAM role ARN is correct
- ✅ Verify the role has S3 permissions
- ✅ Ensure MediaConvert endpoint URL is correct

**2. "Access denied" errors**
- ✅ Check IAM role permissions
- ✅ Verify S3 bucket policy allows MediaConvert access
- ✅ Ensure AWS credentials have MediaConvert permissions

**3. "Endpoint not found"**
- ✅ Verify you're using the account-specific MediaConvert endpoint
- ✅ Check that you're in the correct AWS region
- ✅ Ensure the endpoint URL includes `https://`

**4. Jobs created but no thumbnails**
- ✅ Check MediaConvert job logs in AWS console
- ✅ Verify input video file exists in S3
- ✅ Check output S3 path permissions

### **Debug Commands:**
```bash
# Check if environment variables are set
curl "https://your-app.vercel.app/api/aws/health"

# Test thumbnail generation for specific video
curl -X POST "https://your-app.vercel.app/api/videos/generate-thumbnails" \
  -H "Content-Type: application/json" \
  -d '{"videoId": "your-video-id"}'
```

---

## ✅ **SUCCESS INDICATORS**

You'll know MediaConvert is working when:

1. **✅ MediaConvert jobs appear** in AWS console
2. **✅ Real .jpg thumbnails** appear in S3 `thumbnails/` folder
3. **✅ Video thumbnails show actual frames** instead of SVG placeholders
4. **✅ New uploads automatically get real thumbnails**
5. **✅ Batch processing generates real video frames**

---

## 📞 **NEED HELP?**

If you encounter issues:

1. **Check AWS CloudTrail** for MediaConvert API calls
2. **Review MediaConvert job logs** in AWS console
3. **Verify IAM permissions** using AWS Policy Simulator
4. **Test with a small video file** first (under 100MB)

---

## 🎉 **FINAL RESULT**

After completing this setup:
- ✅ **Real video thumbnails** extracted from actual video frames
- ✅ **Automatic generation** during video upload
- ✅ **Batch processing** for existing videos
- ✅ **Professional quality** thumbnails at 10-second mark
- ✅ **CloudFront delivery** for fast thumbnail loading

Your video management system will finally have real video thumbnails instead of generic SVG placeholders!
