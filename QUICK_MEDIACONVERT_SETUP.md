# 🚀 QUICK MediaConvert Setup - Fix Thumbnails Now

## 🎯 **SIMPLE 3-STEP PROCESS**

### **STEP 1: Get MediaConvert Endpoint**
1. Go to [AWS MediaConvert Console](https://console.aws.amazon.com/mediaconvert/)
2. Make sure you're in **us-east-1** region (same as your S3 bucket)
3. Look for **"Account-specific endpoint"** on the page
4. Copy the URL (looks like: `https://abc123def.mediaconvert.us-east-1.amazonaws.com`)

### **STEP 2: Create IAM Role**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/home#/roles)
2. Click **"Create role"**
3. Choose **"AWS service"** → **"MediaConvert"**
4. Click **"Next"** (permissions will be auto-selected)
5. Name it: `MediaConvert-ThumbnailRole`
6. Click **"Create role"**
7. Copy the **Role ARN** (looks like: `arn:aws:iam::123456789012:role/MediaConvert-ThumbnailRole`)

### **STEP 3: Add to Vercel**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project → **Settings** → **Environment Variables**
3. Add these two variables:

```
MEDIACONVERT_ENDPOINT=https://abc123def.mediaconvert.us-east-1.amazonaws.com
MEDIACONVERT_ROLE_ARN=arn:aws:iam::123456789012:role/MediaConvert-ThumbnailRole
```

4. **Redeploy** your app (Deployments tab → Redeploy)

---

## ✅ **TEST IT WORKS**

After redeployment:
1. Go to: `https://your-app.vercel.app/admin/fix-thumbnails`
2. Click **"Process All Videos"**
3. Check console logs for **"MediaConvert job created"**
4. Check [AWS MediaConvert Console](https://console.aws.amazon.com/mediaconvert/) for jobs

---

## 🎉 **RESULT**

✅ **Real video thumbnails** instead of SVG placeholders  
✅ **Automatic thumbnails** for new uploads  
✅ **Batch processing** for existing videos  

---

## 🆘 **NEED HELP?**

**Can't find MediaConvert endpoint?**
- Make sure you're in the right AWS region
- MediaConvert might need to be activated first

**Role creation failed?**
- Make sure your AWS user has IAM permissions
- Try using an admin account

**Still getting SVG placeholders?**
- Check Vercel deployment logs for errors
- Verify environment variables are set correctly
- Check AWS CloudTrail for MediaConvert API calls

---

## 📞 **QUICK DEBUG**

Test if MediaConvert is configured:
```bash
curl "https://your-app.vercel.app/api/aws/health"
```

Should show MediaConvert as "healthy" after setup.
