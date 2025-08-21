# Quick S3 Fix for PowerUser Access

Since you have PowerUser access with a third-party access key, you can fix this directly through the API endpoint I created.

## Option 1: Use Your Third-Party AWS Credentials

1. **Update your local `.env.local` file** with your PowerUser credentials:
```bash
AWS_ACCESS_KEY_ID=your-poweruser-access-key
AWS_SECRET_ACCESS_KEY=your-poweruser-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=law-school-repository-content
```

2. **Run the fix script locally**:
```bash
node fix-s3-permissions.js
```

## Option 2: Update Vercel Environment Variables

1. **Add your PowerUser credentials to Vercel**:
```bash
npx vercel env add AWS_ACCESS_KEY_ID production
# Enter your PowerUser access key when prompted

npx vercel env add AWS_SECRET_ACCESS_KEY production  
# Enter your PowerUser secret key when prompted
```

2. **Redeploy and run the fix endpoint**:
```bash
npx vercel --prod
```

3. **Call the fix endpoint**:
```bash
curl https://law-school-repository.vercel.app/api/aws/fix-permissions
```

## Option 3: Manual AWS CLI Fix (If you have AWS CLI)

```bash
# Set your PowerUser credentials
aws configure

# Fix the bucket policy
aws s3api put-bucket-policy --bucket law-school-repository-content --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedURLAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::law-school-repository-content/*"
    }
  ]
}'

# Fix CORS
aws s3api put-bucket-cors --bucket law-school-repository-content --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD", "PUT"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}'
```

## What This Fixes

The current issue is that your S3 bucket `law-school-repository-content` is blocking access to presigned URLs with 403 Forbidden errors. This fix:

1. **Adds a bucket policy** that allows public GetObject access (needed for presigned URLs)
2. **Sets CORS configuration** to allow cross-origin requests from your Vercel app

## Test After Fix

Once you've applied the fix using any of the above methods:

1. **Wait 1-2 minutes** for AWS changes to propagate
2. **Test this URL**: 
   ```
   curl -I https://law-school-repository.vercel.app/api/videos/stream/56184f11-7e2c-4b03-a214-948ce7c5e1e8
   ```
3. **Follow the redirect URL** - it should return 200 OK instead of 403 Forbidden
4. **Test video playback** at: https://law-school-repository.vercel.app/dashboard/videos

## Expected Result

After the fix, your video logs should show successful playback instead of network errors. The 3.3-second delay you saw was actually the video upload completing successfully - the real issue was the playback permissions.

Which option would you prefer to try first?