# Hosting Recommendations for Small Law School Institutions

## Executive Summary

For a small law school institution (100-500 users), I recommend a **hybrid approach** combining cost-effective managed services with scalable cloud infrastructure. This provides the best balance of cost, performance, and maintenance requirements.

## Recommended Architecture for Small Institutions

### Option 1: Cost-Optimized Hybrid (Recommended)
**Monthly Cost: ~$85-120**

#### Database Hosting: **Supabase** (Recommended)
- **Cost**: $25/month (Pro plan)
- **Features**: 
  - Managed PostgreSQL with 8GB database size
  - Built-in authentication (alternative to Microsoft 365)
  - Real-time subscriptions
  - Automatic backups
  - Row Level Security (RLS)
  - Built-in API generation
- **Why**: Perfect for small institutions, includes auth, and scales well

#### Application Hosting: **Vercel** (Current)
- **Cost**: $20/month (Pro plan)
- **Features**:
  - Automatic deployments from Git
  - Global CDN
  - Serverless functions
  - Built-in analytics
- **Why**: Already integrated, excellent for Next.js

#### File Storage: **Supabase Storage**
- **Cost**: Included in Supabase Pro plan
- **Features**:
  - 100GB storage included
  - CDN delivery
  - Image transformations
  - Access control
- **Why**: Integrated with database, cost-effective

#### Video Processing: **Mux** (Alternative to AWS)
- **Cost**: $1/hour of video processed + $0.005/minute streamed
- **Estimated**: ~$30-40/month for small institution
- **Features**:
  - Automatic transcoding
  - Adaptive streaming
  - Analytics
  - Thumbnail generation
- **Why**: Much simpler than AWS MediaConvert, better for small teams

### Option 2: Full AWS (For Growth)
**Monthly Cost: ~$164** (as detailed in AWS guide)

Use this if you expect rapid growth or need enterprise features.

### Option 3: Self-Hosted (Budget Option)
**Monthly Cost: ~$40-60**

#### Database: **Railway** or **PlanetScale**
- Railway: $5/month for PostgreSQL
- PlanetScale: $29/month for MySQL (with branching)

#### Application: **Railway** or **DigitalOcean App Platform**
- Railway: $5-10/month
- DigitalOcean: $12/month

#### Storage: **DigitalOcean Spaces**
- $5/month for 250GB + CDN

## Detailed Setup Guide for Recommended Option

### 1. Supabase Database Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push database schema
supabase db push
```

**Environment Variables for Next.js:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### 2. Database Migration Script

Create a migration script to set up the database:

```javascript
// scripts/setup-database.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    // Read and execute schema
    const schemaSQL = fs.readFileSync(
      path.join(process.cwd(), 'database/schema.sql'), 
      'utf8'
    )
    
    const { error } = await supabase.rpc('exec_sql', { sql: schemaSQL })
    
    if (error) {
      console.error('Error setting up database:', error)
    } else {
      console.log('Database setup completed successfully!')
    }
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

setupDatabase()
```

### 3. Supabase Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Students can view courses they're enrolled in
CREATE POLICY "Students can view enrolled courses" ON courses
  FOR SELECT USING (
    id IN (
      SELECT course_id FROM course_enrollments 
      WHERE student_id = auth.uid()
    )
  );

-- Faculty can view their own courses
CREATE POLICY "Faculty can view own courses" ON courses
  FOR SELECT USING (professor_id = auth.uid());

-- Students can view assignments for their courses
CREATE POLICY "Students can view course assignments" ON assignments
  FOR SELECT USING (
    course_id IN (
      SELECT course_id FROM course_enrollments 
      WHERE student_id = auth.uid()
    )
  );

-- Students can manage their own submissions
CREATE POLICY "Students can manage own submissions" ON assignment_submissions
  FOR ALL USING (student_id = auth.uid());

-- Published articles are public
CREATE POLICY "Published articles are public" ON articles
  FOR SELECT USING (status = 'published');

-- Authors can manage their own articles
CREATE POLICY "Authors can manage own articles" ON articles
  FOR ALL USING (author_id = auth.uid());
```

### 4. Supabase Storage Setup

```javascript
// lib/supabase-storage.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function uploadFile(file, bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file)
  
  if (error) throw error
  return data
}

export async function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

export async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  
  if (error) throw error
}

// Create storage buckets
export async function setupStorageBuckets() {
  const buckets = [
    { name: 'documents', public: false },
    { name: 'videos', public: false },
    { name: 'images', public: true },
    { name: 'assignments', public: false }
  ]
  
  for (const bucket of buckets) {
    await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 52428800 // 50MB
    })
  }
}
```

### 5. Mux Video Integration

```bash
npm install @mux/mux-node @mux/mux-player-react
```

```javascript
// lib/mux-config.js
import Mux from '@mux/mux-node'

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
)

export async function createMuxAsset(videoUrl) {
  const asset = await Video.Assets.create({
    input: videoUrl,
    playback_policy: 'signed', // or 'public' for public videos
    encoding_tier: 'baseline' // cost-effective option
  })
  
  return asset
}

export async function getMuxPlaybackUrl(playbackId) {
  return `https://stream.mux.com/${playbackId}.m3u8`
}
```

### 6. Authentication Setup with Supabase

```javascript
// lib/auth.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function signUp(email, password, userData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  
  if (error) throw error
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

## Cost Breakdown for Small Institution

### Monthly Costs (Recommended Setup)

| Service | Plan | Cost | Features |
|---------|------|------|----------|
| Supabase | Pro | $25 | Database, Auth, Storage (100GB) |
| Vercel | Pro | $20 | Hosting, CDN, Functions |
| Mux | Pay-as-you-go | $30-40 | Video processing & streaming |
| Domain | - | $12/year | Custom domain |
| **Total** | | **$75-85/month** | |

### Annual Cost: ~$900-1,020

### Cost per user: $0.15-0.85/month (for 100-500 users)

## Scaling Path

### When to upgrade:
- **500+ users**: Consider AWS RDS for database
- **1000+ users**: Move to AWS for full infrastructure
- **High video usage**: Upgrade Mux plan or move to AWS MediaConvert
- **Enterprise features needed**: Consider AWS Cognito for advanced auth

### Migration strategy:
1. **Database**: Supabase → AWS RDS (easy migration)
2. **Storage**: Supabase Storage → AWS S3 (gradual migration)
3. **Video**: Mux → AWS MediaConvert (when cost-effective)
4. **Auth**: Supabase Auth → AWS Cognito (if needed)

## Backup and Security

### Automated Backups
```javascript
// scripts/backup-database.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backupDatabase() {
  // Supabase Pro includes automatic backups
  // Additional custom backup logic here
  const { data, error } = await supabase
    .from('users')
    .select('*')
  
  // Save to external storage if needed
}
```

### Security Checklist
- [ ] Enable RLS on all tables
- [ ] Set up proper authentication policies
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable SSL/HTTPS everywhere
- [ ] Set up monitoring and alerts
- [ ] Regular security updates
- [ ] Backup verification

## Monitoring and Analytics

### Supabase Dashboard
- Database performance metrics
- API usage statistics
- Storage usage
- Authentication metrics

### Vercel Analytics
- Page performance
- User engagement
- Error tracking
- Core Web Vitals

### Custom Monitoring
```javascript
// lib/analytics.js
export function trackEvent(eventName, properties) {
  // Custom analytics implementation
  if (typeof window !== 'undefined') {
    // Client-side tracking
    console.log('Event:', eventName, properties)
  }
}

export function trackPageView(page) {
  trackEvent('page_view', { page })
}
```

## Implementation Timeline

### Week 1: Infrastructure Setup
- [ ] Set up Supabase project
- [ ] Configure Vercel deployment
- [ ] Set up domain and SSL

### Week 2: Database Migration
- [ ] Run database schema
- [ ] Set up RLS policies
- [ ] Test authentication

### Week 3: File Storage
- [ ] Configure Supabase Storage
- [ ] Set up file upload APIs
- [ ] Test file operations

### Week 4: Video Integration
- [ ] Set up Mux account
- [ ] Implement video upload
- [ ] Test video streaming

### Week 5: Testing & Optimization
- [ ] Performance testing
- [ ] Security audit
- [ ] User acceptance testing

### Week 6: Go Live
- [ ] Final deployment
- [ ] Monitor performance
- [ ] User training

## Support and Maintenance

### Monthly Tasks
- Review usage metrics
- Check backup integrity
- Update dependencies
- Monitor performance

### Quarterly Tasks
- Security audit
- Cost optimization review
- Feature usage analysis
- Capacity planning

### Annual Tasks
- Full security assessment
- Disaster recovery testing
- Technology stack review
- Budget planning

This setup provides a robust, scalable, and cost-effective solution for small law school institutions while maintaining the flexibility to grow and adapt as needs change.
