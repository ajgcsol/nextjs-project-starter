// Fix MediaConvert Permissions Issue - Based on Amazon Q Analysis
// Issue: Policy conflicts and missing MediaConvert service role

console.log('🔧 MediaConvert Permissions Issue Fix');
console.log('=====================================');
console.log('');
console.log('📋 Issues Identified by Amazon Q:');
console.log('1. Policy Conflicts: User has both AWSElementalMediaConvertFullAccess AND AWSElementalMediaConvertReadOnly');
console.log('2. Missing Service Role: MediaConvert needs its own service role to access S3');
console.log('3. User: CSOLRepository (without underscore) found in AWS account');
console.log('');

console.log('🎯 Required Actions:');
console.log('');

console.log('ACTION 1: Remove Conflicting Policy');
console.log('-----------------------------------');
console.log('AWS CLI Command:');
console.log('aws iam detach-user-policy --user-name CSOLRepository --policy-arn arn:aws:iam::aws:policy/AWSElementalMediaConvertReadOnly');
console.log('');
console.log('Reason: User already has AWSElementalMediaConvertFullAccess, the ReadOnly policy creates conflicts');
console.log('');

console.log('ACTION 2: Create MediaConvert Service Role');
console.log('------------------------------------------');
console.log('This role allows MediaConvert to access your S3 bucket on behalf of jobs');
console.log('');

console.log('Step 1 - Create trust policy file:');
console.log('cat > mediaconvert-service-role-trust-policy.json << EOF');
console.log(JSON.stringify({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "mediaconvert.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}, null, 2));
console.log('EOF');
console.log('');

console.log('Step 2 - Create the service role:');
console.log('aws iam create-role --role-name MediaConvert-ServiceRole --assume-role-policy-document file://mediaconvert-service-role-trust-policy.json');
console.log('');

console.log('Step 3 - Attach S3 access policy:');
console.log('aws iam attach-role-policy --role-name MediaConvert-ServiceRole --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess');
console.log('');

console.log('Step 4 - Get the service role ARN:');
console.log('aws iam get-role --role-name MediaConvert-ServiceRole --query Role.Arn --output text');
console.log('');

console.log('ACTION 3: Update Environment Variables');
console.log('-------------------------------------');
console.log('Add the MediaConvert service role ARN to your environment:');
console.log('MEDIACONVERT_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/MediaConvert-ServiceRole');
console.log('');

console.log('ACTION 4: Verify S3 Bucket Policy');
console.log('---------------------------------');
console.log('Ensure your S3 bucket policy allows MediaConvert service access:');

const bucketPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "MediaConvertAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "mediaconvert.amazonaws.com"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::law-school-repository-content/*"
        },
        {
            "Sid": "MediaConvertListAccess", 
            "Effect": "Allow",
            "Principal": {
                "Service": "mediaconvert.amazonaws.com"
            },
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::law-school-repository-content"
        }
    ]
};

console.log('');
console.log('S3 Bucket Policy to add:');
console.log(JSON.stringify(bucketPolicy, null, 2));
console.log('');

console.log('Apply with AWS CLI:');
console.log('aws s3api put-bucket-policy --bucket law-school-repository-content --policy file://mediaconvert-bucket-policy.json');
console.log('');

console.log('🔍 DEBUGGING STEPS:');
console.log('===================');
console.log('');

console.log('1. Check current user policies:');
console.log('aws iam list-attached-user-policies --user-name CSOLRepository');
console.log('');

console.log('2. Verify MediaConvert service role exists:');
console.log('aws iam get-role --role-name MediaConvert-ServiceRole');
console.log('');

console.log('3. Test MediaConvert access:');
console.log('aws mediaconvert describe-endpoints --region us-east-1');
console.log('');

console.log('4. Check CloudWatch logs for specific errors:');
console.log('aws logs describe-log-groups --log-group-name-prefix "/aws/mediaconvert"');
console.log('');

console.log('💡 KEY INSIGHTS FROM AMAZON Q:');
console.log('==============================');
console.log('- The issue is NOT with MediaConvert activation');
console.log('- The issue IS with IAM policy conflicts and missing service role');
console.log('- User permissions alone are insufficient - MediaConvert needs service role');
console.log('- Multiple policies can create permission conflicts');
console.log('');

console.log('🎯 EXPECTED OUTCOME:');
console.log('====================');
console.log('After fixing these permission issues:');
console.log('✅ MediaConvert jobs should create successfully');
console.log('✅ Real video thumbnails will be generated');
console.log('✅ S3 access errors should be resolved');
console.log('✅ CloudWatch logs will show successful job completion');
