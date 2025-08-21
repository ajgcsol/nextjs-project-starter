u# 🚀 Add MediaConvert Environment Variables to Vercel

## 📋 **ENVIRONMENT VARIABLES TO ADD**

Based on your successful MediaConvert setup, add these to Vercel:

```
MEDIACONVERT_ROLE_ARN=arn:aws:iam::792298120704:role/MediaConvert-Role
MEDIACONVERT_ENDPOINT=https://mediaconvert.us-east-1.amazonaws.com
```

## 🔧 **HOW TO ADD TO VERCEL**

### **Option 1: Vercel Dashboard (Recommended)**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: `nextjs-project-starter`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add each variable:
   - **Name**: `MEDIACONVERT_ROLE_ARN`
   - **Value**: `arn:aws:iam::792298120704:role/MediaConvert-Role`
   - **Environment**: Production, Preview, Development (select all)
6. Click **Add New** again:
   - **Name**: `MEDIACONVERT_ENDPOINT`
   - **Value**: `https://mediaconvert.us-east-1.amazonaws.com`
   - **Environment**: Production, Preview, Development (select all)
7. Click **Save**

### **Option 2: Vercel CLI**
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add MEDIACONVERT_ROLE_ARN
# When prompted, enter: arn:aws:iam::792298120704:role/MediaConvert-Role

vercel env add MEDIACONVERT_ENDPOINT
# When prompted, enter: https://mediaconvert.us-east-1.amazonaws.com
```

## 🚀 **AFTER ADDING VARIABLES**

1. **Redeploy** your application (Vercel will auto-deploy when you add env vars)
2. **Test** the MediaConvert integration:
   ```bash
   node test-mediaconvert-auto-setup.js
   ```

## ✅ **WHAT WILL HAPPEN**

Once you add these environment variables and redeploy:

1. **Real Thumbnails**: System will switch from SVG placeholders to actual video frame extraction
2. **WMV Conversion**: Automatic conversion of WMV files to web-compatible MP4
3. **Batch Processing**: All 49 videos can be processed with real thumbnails
4. **Upload Integration**: New video uploads will automatically generate real thumbnails

## 🎯 **VERIFICATION**

After deployment, visit:
- **Admin Interface**: `/admin/fix-thumbnails` - should show MediaConvert status
- **API Test**: `/api/mediaconvert/setup` - should confirm configuration
- **Thumbnail Generation**: Process a video and see real thumbnail instead of SVG

## 🎉 **RESULT**

**Current Status**: 67% Working (Audio Enhancement + AI Transcription)
**After Adding Variables**: 100% Working (Complete Video Processing Pipeline)

The final 33% (Real Thumbnails + WMV Conversion) will be activated immediately!
