# 🔐 Add IAM Permissions to CSOLRepository User

## 🎯 **SIMPLE SOLUTION**

Since you can add permissions to your existing user `CSOLRepository`, here's exactly what to add:

## 📋 **REQUIRED PERMISSIONS**

Add these managed policies to user `CSOLRepository`:

### **1. IAM Permissions (for creating MediaConvert role)**
```
IAMFullAccess
```
**OR** for minimal permissions:
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:GetRole",
                "iam:AttachRolePolicy",
                "iam:ListRoles"
            ],
            "Resource": "*"
        }
    ]
}
```

### **2. MediaConvert Permissions**
```
AWSElementalMediaConvertFullAccess
```

## 🚀 **STEPS TO ADD PERMISSIONS**

### **Option A: AWS Console (Easy)**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/home#/users)
2. Click on user `CSOLRepository`
3. Click **"Add permissions"** → **"Attach policies directly"**
4. Search and select:
   - `IAMFullAccess` (or create custom policy above)
   - `AWSElementalMediaConvertFullAccess`
5. Click **"Add permissions"**

### **Option B: AWS CLI (If you have admin access)**
```bash
# Add IAM permissions
aws iam attach-user-policy \
  --user-name CSOLRepository \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

# Add MediaConvert permissions  
aws iam attach-user-policy \
  --user-name CSOLRepository \
  --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertFullAccess
```

## ✅ **AFTER ADDING PERMISSIONS**

Once permissions are added, run the setup script:

### **Windows PowerShell:**
```powershell
.\setup-mediaconvert-cli.ps1
```

### **Linux/macOS/WSL:**
```bash
./setup-mediaconvert-cli.sh
```

## 🎯 **WHAT WILL HAPPEN**

1. ✅ Script will create `MediaConvert-Role`
2. ✅ Script will get the Role ARN
3. ✅ Script will discover MediaConvert endpoint
4. ✅ You'll get exact environment variables for Vercel
5. ✅ Real thumbnails and WMV conversion will work!

## 🔧 **MINIMAL PERMISSIONS APPROACH**

If you prefer minimal permissions instead of `IAMFullAccess`, create this custom policy:

**Policy Name**: `MediaConvertSetup`
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "iam:CreateRole",
                "iam:GetRole",
                "iam:AttachRolePolicy",
                "iam:ListRoles",
                "mediaconvert:*"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🚨 **SECURITY NOTE**

- `IAMFullAccess` gives broad IAM permissions
- For production, use the minimal custom policy above
- You can remove these permissions after setup is complete

## 🎉 **RESULT**

After adding permissions and running the script:
- ✅ **67% Currently Working**: Audio Enhancement + AI Transcription
- ✅ **33% Will Activate**: Real Thumbnails + WMV Conversion
- ✅ **100% Complete Video Processing Pipeline**

The setup should take less than 2 minutes once permissions are added!
