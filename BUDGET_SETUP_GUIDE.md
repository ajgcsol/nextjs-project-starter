# Budget-Friendly Setup Guide for Small Law Schools

## 🎯 Cheapest Option Without Sacrificing Quality

For small law schools (100-500 users), here's the most cost-effective setup that maintains professional quality:

## 💰 Recommended Budget Setup: **~$75-85/month**

### Option 1: Supabase + Vercel + Mux (Recommended)

| Service | Cost | What You Get |
|---------|------|--------------|
| **Supabase Pro** | $25/month | Database + Auth + Storage + CDN |
| **Vercel Pro** | $20/month | App hosting + Functions + Analytics |
| **Mux** | $30-40/month | Video processing + streaming |
| **Domain** | $1/month | Custom domain (.edu if eligible) |
| **Total** | **$76-86/month** | Complete professional system |

---

## 🗄️ Database Setup (Supabase - Cheapest Quality Option)

### Why Supabase Over AWS RDS?
- **Cost**: $25/month vs $50+/month for AWS RDS
- **Included**: Database + Authentication + Storage + CDN
- **Quality**: Built on PostgreSQL, enterprise-grade
- **Ease**: No server management required

### Step-by-Step Database Setup

#### 1. Create Supabase Account
```bash
# Go to https://supabase.com
# Sign up with your institutional email
# Create new project: "law-school-repository"
```

#### 2. Get Your Credentials
```bash
# From Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. Set Up Database Schema
```bash
# In Supabase Dashboard > SQL Editor, run:
```

```sql
-- Copy the entire contents of database/schema.sql
-- Paste into Supabase SQL Editor
-- Click "Run" to create all tables and relationships
```

#### 4. Configure Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Faculty can manage their courses
CREATE POLICY "Faculty can manage own courses" ON courses
  FOR ALL USING (professor_id = auth.uid());

-- Students can view enrolled courses
CREATE POLICY "Students can view enrolled courses" ON courses
  FOR SELECT USING (
    id IN (
      SELECT course_id FROM course_enrollments 
      WHERE student_id = auth.uid()
    )
  );
```

#### 5. Set Up Authentication
```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sign up new user
export async function signUp(email, password, userData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  return { data, error }
}

// Sign in user
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}
```

---

## 🎥 Video Storage Setup (Mux - Best Value)

### Why Mux Over AWS MediaConvert?
- **Cost**: ~$30-40/month vs $90+/month for AWS
- **Simplicity**: One service vs multiple AWS services
- **Quality**: Professional video streaming
- **Features**: Automatic transcoding, analytics, thumbnails

### Step-by-Step Video Setup

#### 1. Create Mux Account
```bash
# Go to https://mux.com
# Sign up for account
# Get API credentials from Dashboard
```

#### 2. Install Mux SDK
```bash
npm install @mux/mux-node @mux/mux-player-react
```

#### 3. Configure Mux
```javascript
// lib/mux.js
import Mux from '@mux/mux-node'

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
)

export async function uploadVideo(videoUrl, title) {
  try {
    const asset = await Video.Assets.create({
      input: videoUrl,
      playback_policy: 'signed', // Private videos
      encoding_tier: 'baseline', // Cost-effective
      metadata: {
        title: title,
        uploaded_by: 'law_school_system'
      }
    })
    
    return {
      assetId: asset.id,
      playbackId: asset.playback_ids[0].id,
      status: asset.status
    }
  } catch (error) {
    console.error('Mux upload error:', error)
    throw error
  }
}

export function getStreamingUrl(playbackId) {
  return `https://stream.mux.com/${playbackId}.m3u8`
}
```

#### 4. Video Upload API
```javascript
// pages/api/videos/upload.js
import { uploadVideo } from '../../../lib/mux'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { videoUrl, title, courseId } = req.body
    
    // Upload to Mux
    const muxResult = await uploadVideo(videoUrl, title)
    
    // Save to database
    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        mux_asset_id: muxResult.assetId,
        mux_playback_id: muxResult.playbackId,
        course_id: courseId,
        status: 'processing'
      })
      .select()
    
    if (error) throw error
    
    res.status(200).json({ 
      success: true, 
      video: data[0],
      streamingUrl: getStreamingUrl(muxResult.playbackId)
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
}
```

---

## 🚀 Complete Setup Instructions

### 1. Environment Variables (.env.local)
```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# Video Processing (Mux)
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# App Configuration
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=https://your-domain.com

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# AI Services (Optional - Free with Ollama)
OLLAMA_API_URL=http://localhost:11434
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Connect your GitHub repository for auto-deployments
```

### 3. Set Up Custom Domain
```bash
# In Vercel Dashboard:
# 1. Go to your project
# 2. Settings > Domains
# 3. Add your domain (e.g., repository.lawschool.edu)
# 4. Configure DNS records as shown
```

---

## 💡 Cost Optimization Tips

### 1. Supabase Optimization
```sql
-- Use database functions for complex queries
CREATE OR REPLACE FUNCTION get_user_courses(user_id UUID)
RETURNS TABLE(course_id UUID, course_name TEXT, enrollment_count BIGINT)
LANGUAGE SQL
AS $$
  SELECT c.id, c.name, COUNT(ce.student_id)
  FROM courses c
  LEFT JOIN course_enrollments ce ON c.id = ce.course_id
  WHERE c.professor_id = user_id OR ce.student_id = user_id
  GROUP BY c.id, c.name;
$$;
```

### 2. Mux Optimization
```javascript
// Use webhook to update video status
// pages/api/webhooks/mux.js
export default async function handler(req, res) {
  const { type, data } = req.body
  
  if (type === 'video.asset.ready') {
    // Update database when video is ready
    await supabase
      .from('videos')
      .update({ 
        status: 'ready',
        duration: data.duration,
        aspect_ratio: data.aspect_ratio
      })
      .eq('mux_asset_id', data.id)
  }
  
  res.status(200).json({ received: true })
}
```

### 3. Storage Optimization
```javascript
// Automatic file cleanup
export async function cleanupOldFiles() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  // Delete old temporary files
  const { data } = await supabase.storage
    .from('temp-uploads')
    .list('', {
      limit: 100,
      offset: 0
    })
  
  const oldFiles = data.filter(file => 
    new Date(file.created_at) < thirtyDaysAgo
  )
  
  if (oldFiles.length > 0) {
    await supabase.storage
      .from('temp-uploads')
      .remove(oldFiles.map(file => file.name))
  }
}
```

---

## 📊 Cost Comparison

| Setup Option | Monthly Cost | Quality | Complexity |
|--------------|--------------|---------|------------|
| **Supabase + Mux** | $75-85 | ⭐⭐⭐⭐⭐ | ⭐⭐ (Easy) |
| AWS Full Stack | $164+ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Complex) |
| Self-Hosted | $40-60 | ⭐⭐⭐ | ⭐⭐⭐⭐ (Hard) |

---

## 🔧 Monitoring & Maintenance

### 1. Set Up Monitoring
```javascript
// lib/monitoring.js
export function trackUsage() {
  // Supabase has built-in analytics
  // Mux provides video analytics
  // Vercel provides app analytics
}

export async function checkSystemHealth() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    // Test video service
    const assets = await Video.Assets.list({ limit: 1 })
    
    return { status: 'healthy', timestamp: new Date() }
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}
```

### 2. Backup Strategy
```bash
# Supabase automatic backups (included in Pro plan)
# Daily backups for 7 days
# Weekly backups for 4 weeks
# Monthly backups for 3 months

# Additional backup script
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## 🎯 Getting Started Checklist

- [ ] Create Supabase account and project
- [ ] Set up database schema using provided SQL
- [ ] Configure Row Level Security policies
- [ ] Create Mux account and get API keys
- [ ] Set up Vercel project and deployment
- [ ] Configure environment variables
- [ ] Test video upload and streaming
- [ ] Set up custom domain
- [ ] Configure monitoring and alerts
- [ ] Create admin user account
- [ ] Test all user roles and permissions

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Mux Docs**: https://docs.mux.com
- **Vercel Docs**: https://vercel.com/docs
- **Project Issues**: Use GitHub Issues for technical problems

This setup provides enterprise-quality features at a fraction of the cost of traditional solutions, perfect for small law schools that need professional capabilities on a budget.
