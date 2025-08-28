# Database Connection Debug Guide

## Current Issue
```
Error: connect ETIMEDOUT 10.0.2.167:5432
```

The PostgreSQL database server at `10.0.2.167:5432` is completely unreachable.

## Diagnostic Steps

### 1. Check DATABASE_URL Environment Variable
In Vercel dashboard, verify the DATABASE_URL is correct:
```
postgresql://username:password@host:port/database
```

### 2. Test Database Server Connectivity
Try connecting to the database server directly:
```bash
# Test if server is reachable
telnet 10.0.2.167 5432

# Or using nc (netcat)
nc -zv 10.0.2.167 5432
```

### 3. Check Database Provider Status
If using a managed database service:
- **Neon**: Check Neon dashboard for database status
- **Supabase**: Check Supabase dashboard
- **Railway**: Check Railway dashboard
- **PlanetScale**: Check PlanetScale dashboard
- **AWS RDS**: Check AWS console

### 4. Verify Database Server is Running
If self-hosted PostgreSQL:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql
```

### 5. Check Firewall/Network Rules
Ensure port 5432 is open and accessible from Vercel's IP ranges.

## Quick Fixes to Try

### Option 1: Use a Working Database Service
Set up a new database on a reliable provider:
- **Neon** (recommended for Vercel): https://neon.tech
- **Supabase**: https://supabase.com
- **Railway**: https://railway.app

### Option 2: Update DATABASE_URL
If you have a working database, update the DATABASE_URL in Vercel:
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Update DATABASE_URL with the correct connection string
5. Redeploy

## Current Code Status
✅ All video upload code fixes are complete and committed
✅ Database timeout increased from 2s to 60s
✅ Fallback to memory storage removed
✅ Missing database fields added
⏳ Ready for deployment once database is accessible

## Next Steps
1. Fix database connectivity issue
2. Wait for Vercel deployment limit to reset
3. Deploy fixes
4. Test video upload workflow
