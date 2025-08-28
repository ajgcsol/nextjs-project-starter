# AWS S3 Video Playback Fix Instructions

## Problem
Videos upload successfully but won't play. The S3 bucket is blocking access to presigned URLs with a 403 Forbidden error.

## Solution Steps

### Step 1: Log into AWS Console
1. Go to https://console.aws.amazon.com/
2. Sign in with an account that has admin/root access (not the limited IAM user)

### Step 2: Navigate to S3
1. In the AWS Console, search for "S3" in the top search bar
2. Click on "S3" to open the S3 dashboard
3. Find and click on your bucket: `law-school-repository-content`

### Step 3: Fix Bucket Permissions

#### Option A: Quick Fix (Less Secure, But Works Immediately)
1. Click on the **"Permissions"** tab
2. Scroll down to **"Block public access (bucket settings)"**
3. Click **"Edit"**
4. **UNCHECK** all four boxes:
   - [ ] Block all public access
   - [ ] Block public access to buckets and objects granted through new access control lists (ACLs)
   - [ ] Block public access to buckets and objects granted through any access control lists (ACLs)
   - [ ] Block public and cross-account access to buckets and objects through any public bucket or access point policies
5. Click **"Save changes"**
6. Type `confirm` in the dialog and click **"Confirm"**

#### Option B: Proper Fix with Bucket Policy (More Secure)
1. Keep "Block public access" settings as they are
2. Click on the **"Permissions"** tab
3. Scroll down to **"Bucket policy"**
4. Click **"Edit"**
5. Replace the entire policy with this:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowPresignedURLAccess",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::law-school-repository-content/*",
            "Condition": {
                "StringLike": {
                    "aws:userid": "AIDAIDAI*"
                }
            }
        },
        {
            "Sid": "AllowIAMUserFullAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::792298120704:user/CSOLRepository"
            },
            "Action": "s3:*",
            "Resource": [
                "arn:aws:s3:::law-school-repository-content",
                "arn:aws:s3:::law-school-repository-content/*"
            ]
        }
    ]
}
```

6. Click **"Save changes"**

### Step 4: Set CORS Configuration
1. Still in the **"Permissions"** tab
2. Scroll down to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"**
4. Replace with this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD",
            "PUT",
            "POST"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

5. Click **"Save changes"**

### Step 5: Update IAM User Permissions (Optional but Recommended)
1. Go to IAM service (search "IAM" in AWS Console)
2. Click **"Users"** in the left sidebar
3. Find and click on `CSOLRepository`
4. Click **"Add permissions"** → **"Attach existing policies directly"**
5. Search for and check: `AmazonS3FullAccess` (or create a custom policy)
6. Click **"Next: Review"** then **"Add permissions"**

### Step 6: Test Video Playback
1. Wait 2-3 minutes for changes to propagate
2. Go to: https://law-school-repository.vercel.app/dashboard/videos
3. Click on any video to test playback
4. The video should now play without errors

## If Videos Still Don't Play

### Check CloudFront Distribution
1. In AWS Console, go to CloudFront
2. Find your distribution (domain: d24qjgz9z4yzof.cloudfront.net)
3. Click on it, then go to **"Origins"** tab
4. Edit the S3 origin
5. Under **"S3 bucket access"**, select:
   - **"Yes use OAI (Origin Access Identity)"**
   - Create new OAI if needed
   - Select **"Yes, update the bucket policy"**
6. Save changes and wait 15-20 minutes for CloudFront to deploy

### Alternative: Direct S3 URLs
If CloudFront continues to have issues, you can temporarily use direct S3 URLs:
1. The app is already configured to use presigned S3 URLs
2. Just ensure the bucket policy above is applied
3. Videos will stream directly from S3 (may be slower but will work)

## Verification
Run this command to test if permissions are fixed:
```bash
curl -I https://law-school-repository.vercel.app/api/videos/stream/56184f11-7e2c-4b03-a214-948ce7c5e1e8
```

You should see a 302 redirect to an S3 URL. When you follow that URL, it should return 200 OK instead of 403 Forbidden.

## Need Help?
- AWS Support: https://console.aws.amazon.com/support/
- Check IAM user ARN: `arn:aws:iam::792298120704:user/CSOLRepository`
- Bucket name: `law-school-repository-content`
- Region: `us-east-1`

## Security Note
After videos are working, consider tightening the bucket policy to only allow specific domains instead of "*" in AllowedOrigins.