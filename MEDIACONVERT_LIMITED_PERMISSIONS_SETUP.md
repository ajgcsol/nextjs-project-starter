# 🔧 MediaConvert Setup for Limited AWS Permissions

## 🚨 **THE ISSUE**

Your AWS user `CSOLRepository` doesn't have IAM permissions to create roles. This is common for security reasons.

**Error**: `User: arn:aws:iam::792298120704:user/CSOLRepository is not authorized to perform: iam:GetRole`

## 💡 **SOLUTION OPTIONS**

### **Option A: Ask AWS Admin to Create Role (RECOMMENDED)**

Send this to your AWS administrator:

```
Hi,

I need a MediaConvert IAM role created for video processing. Please create:

Role Name: MediaConvert-Role
Trust Policy: Allow mediaconvert.amazonaws.com to assume this role
Permissions: 
- AWSElementalMediaConvertFullAccess
- AmazonS3FullAccess (for bucket: law-school-repository-content)

Then provide me the Role ARN which looks like:
arn:aws:iam::792298120704:role/MediaConvert-Role
```

### **Option B: Use Existing Role (If Available)**

Check if a MediaConvert role already exists:

```bash
# List all roles (if you have permission)
aws iam list-roles --query 'Roles[?contains(RoleName, `MediaConvert`) || contains(RoleName, `media`) || contains(RoleName, `video`)].{Name:RoleName,Arn:Arn}'
```

### **Option C: Use Auto-Discovery Only**

The system can work with just the endpoint auto-discovery:

```bash
# Get MediaConvert endpoint (this usually works with basic permissions)
aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text
```

## 🎯 **IMMEDIATE WORKAROUND**

Since you have S3 access working, let's try the auto-discovery approach:

### **Step 1: Test MediaConvert Access**
```bash
# Test if you can access MediaConvert (read-only)
aws mediaconvert describe-endpoints --region us-east-1
```

### **Step 2: Get Your Account ID**
```bash
aws sts get-caller-identity --query 'Account' --output text
```
**Your Account ID**: `792298120704`

### **Step 3: Try Standard Role ARN**
Many AWS accounts have a default MediaConvert role. Try this ARN:
```
arn:aws:iam::792298120704:role/MediaConvertRole
```
or
```
arn:aws:iam::792298120704:role/MediaConvert_Default_Role
```

## 🔧 **MANUAL SETUP STEPS**

### **1. Get MediaConvert Endpoint**
```bash
aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text
```

### **2. Ask Admin for Role ARN**
Request your AWS admin to create the role and provide the ARN.

### **3. Add to Vercel**
Once you have both values:
```
MEDIACONVERT_ROLE_ARN=arn:aws:iam::792298120704:role/MediaConvert-Role
MEDIACONVERT_ENDPOINT=https://[discovered-endpoint].mediaconvert.us-east-1.amazonaws.com
```

## 🚀 **ALTERNATIVE: ENDPOINT-ONLY SETUP**

If you can't get a role ARN, the system can still work with auto-discovery:

### **Add Only Endpoint to Vercel**
```bash
# Get endpoint
ENDPOINT=$(aws mediaconvert describe-endpoints --region us-east-1 --query 'Endpoints[0].Url' --output text)
echo "MEDIACONVERT_ENDPOINT=$ENDPOINT"
```

Add just this to Vercel:
```
MEDIACONVERT_ENDPOINT=https://[your-endpoint].mediaconvert.us-east-1.amazonaws.com
```

The system will show a helpful error message about the missing role, but thumbnails will still work in fallback mode.

## 📋 **WHAT TO REQUEST FROM AWS ADMIN**

**Email Template:**
```
Subject: MediaConvert IAM Role Request

Hi [Admin Name],

I need a MediaConvert IAM role created for our video processing system.

Details:
- AWS Account: 792298120704
- Role Name: MediaConvert-Role
- Service: mediaconvert.amazonaws.com
- Permissions Needed:
  * AWSElementalMediaConvertFullAccess
  * AmazonS3FullAccess (for law-school-repository-content bucket)

Please provide the Role ARN when created.

Thanks!
```

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Try getting the endpoint**:
   ```bash
   aws mediaconvert describe-endpoints --region us-east-1
   ```

2. **If that works**, add the endpoint to Vercel and the system will partially work

3. **Contact your AWS admin** to create the MediaConvert role

4. **Once you have the role ARN**, add it to Vercel for full functionality

## ✅ **CURRENT STATUS**

- ✅ **67% Working**: Audio Enhancement + AI Transcription (fully functional)
- ⚠️ **33% Pending**: Real thumbnails + WMV conversion (needs MediaConvert role)

The video processing pipeline is mostly working! You just need the MediaConvert role for the final 33%.
