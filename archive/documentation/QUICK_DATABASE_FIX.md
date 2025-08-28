# 🚀 Quick Database Fix - Get Videos Working Now

## Problem
Your current DATABASE_URL points to `10.0.2.167:5432` which is unreachable.

## Solution: Use Neon (Free PostgreSQL)

### Step 1: Create Neon Database (2 minutes)
1. Go to https://neon.tech
2. Sign up with GitHub (free)
3. Create a new project called "law-school-repository"
4. Copy the connection string (looks like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`)

### Step 2: Update Vercel Environment Variable (1 minute)
1. Go to https://vercel.com/dashboard
2. Select your "nextjs-project-starter" project
3. Go to Settings → Environment Variables
4. Find `DATABASE_URL` and update it with your Neon connection string
5. Click "Save"

### Step 3: Redeploy (1 minute)
1. Go to Deployments tab
2. Click "Redeploy" on the latest deployment
3. Wait for deployment to complete

### Step 4: Initialize Database (1 minute)
1. Visit: https://law-school-repository.vercel.app/api/database/init
2. This will create the required tables

## Test It Works
1. Try uploading a video at: https://law-school-repository.vercel.app/dashboard/videos
2. Video should now save successfully and appear in the dashboard

## Alternative: Railway Database
If you prefer Railway:
1. Go to https://railway.app
2. Create new project → Add PostgreSQL
3. Copy the DATABASE_URL from the Connect tab
4. Update in Vercel as above

## Why This Fixes Everything
- ✅ Videos will save to database after S3 upload
- ✅ Dashboard will show uploaded videos
- ✅ CloudFront URLs will work for fast video playback
- ✅ Thumbnails will display properly

**Total time: ~5 minutes to get everything working**
