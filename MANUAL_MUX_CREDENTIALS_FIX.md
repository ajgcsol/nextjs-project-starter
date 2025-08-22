# 🔧 Manual Mux Credentials Fix - Critical Production Issue

## **Problem Identified**
The Mux credentials exist in Vercel but are not being loaded by the application:
- Environment Variables: `{ hasMuxTokenId: false, hasMuxTokenSecret: false }`
- This prevents all Mux functionality from working

## **Solution Steps**

### **Step 1: Remove Existing Variables (Web Interface)**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: `law-school-repository`
3. Go to **Settings** → **Environment Variables**
4. Find and **DELETE** these variables:
   - `VIDEO_MUX_TOKEN_ID`
   - `VIDEO_MUX_TOKEN_SECRET`

### **Step 2: Add Clean Variables**
Add these environment variables with **EXACT** values (no extra spaces/newlines):

**Variable 1:**
- **Name**: `VIDEO_MUX_TOKEN_ID`
- **Value**: `[Your Mux Token ID from Mux Dashboard]`
- **Environments**: ✅ Production ✅ Preview ✅ Development

**Variable 2:**
- **Name**: `VIDEO_MUX_TOKEN_SECRET`
- **Value**: `[Your Mux Token Secret from Mux Dashboard]`
- **Environments**: ✅ Production ✅ Preview ✅ Development

### **Step 3: Get Your Mux Credentials**
1. Go to [Mux Dashboard](https://dashboard.mux.com/)
2. Navigate to **Settings** → **Access Tokens**
3. Find your token or create a new one
4. Copy the **Token ID** and **Token Secret**

### **Step 4: Redeploy**
1. In Vercel Dashboard, go to **Deployments**
2. Click **"Redeploy"** on the latest deployment
3. Wait for deployment to complete (2-3 minutes)

### **Step 5: Verify Fix**
Run this test after deployment:
```bash
node test-mux-production-debug.js
```

**Expected Result:**
```
Environment Variables: { hasMuxTokenId: true, hasMuxTokenSecret: true }
Mux Status: configured
Mux Asset Creation: SUCCESS
```

## **Alternative: CLI Method**
If you prefer CLI, run these commands one by one:

```bash
# Remove existing variables
vercel env rm VIDEO_MUX_TOKEN_ID production
vercel env rm VIDEO_MUX_TOKEN_SECRET production

# Add new variables (you'll be prompted for values)
vercel env add VIDEO_MUX_TOKEN_ID production
vercel env add VIDEO_MUX_TOKEN_SECRET production

# Redeploy
vercel --prod
```

## **Critical Notes**
- ⚠️ **NO extra spaces, newlines, or special characters** in the values
- ✅ Make sure to select **ALL environments** (Production, Preview, Development)
- 🔄 **Redeploy is required** for changes to take effect
- 🕐 Wait 2-3 minutes for deployment to complete before testing

## **Troubleshooting**
If credentials still show as `false` after fix:
1. Check Vercel environment variables are saved correctly
2. Verify deployment completed successfully
3. Clear browser cache and test again
4. Check Mux dashboard for valid credentials
