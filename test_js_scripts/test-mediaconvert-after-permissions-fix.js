// Test MediaConvert After Permissions Fix - Comprehensive Debugging
const https = require('https');
const { spawn } = require('child_process');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🔧 MediaConvert Post-Permissions Fix Test');
console.log('==========================================');
console.log('');

// Function to run AWS CLI commands
function runAWSCommand(command, args = []) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Running: aws ${command} ${args.join(' ')}`);
        
        const awsProcess = spawn('aws', [command, ...args], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        awsProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        awsProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        awsProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = stdout.trim() ? JSON.parse(stdout) : stdout;
                    resolve(result);
                } catch (e) {
                    resolve(stdout.trim());
                }
            } else {
                reject(new Error(`AWS CLI failed (${code}): ${stderr}`));
            }
        });
        
        awsProcess.on('error', (error) => {
            reject(error);
        });
    });
}

// Check AWS IAM configuration
async function checkIAMConfiguration() {
    console.log('📋 STEP 1: Checking IAM Configuration');
    console.log('=====================================');
    
    try {
        // Check user policies
        console.log('🔍 Checking CSOLRepository user policies...');
        const userPolicies = await runAWSCommand('iam', ['list-attached-user-policies', '--user-name', 'CSOLRepository']);
        console.log('✅ User Policies:', JSON.stringify(userPolicies, null, 2));
        
        // Check if MediaConvert service role exists
        console.log('🔍 Checking MediaConvert service role...');
        try {
            const serviceRole = await runAWSCommand('iam', ['get-role', '--role-name', 'MediaConvert-ServiceRole']);
            console.log('✅ MediaConvert Service Role exists:', serviceRole.Role.Arn);
        } catch (error) {
            console.log('❌ MediaConvert Service Role not found:', error.message);
            return false;
        }
        
        // Check role policies
        console.log('🔍 Checking service role policies...');
        const rolePolicies = await runAWSCommand('iam', ['list-attached-role-policies', '--role-name', 'MediaConvert-ServiceRole']);
        console.log('✅ Service Role Policies:', JSON.stringify(rolePolicies, null, 2));
        
        return true;
    } catch (error) {
        console.log('❌ IAM Configuration check failed:', error.message);
        return false;
    }
}

// Check MediaConvert service status
async function checkMediaConvertService() {
    console.log('');
    console.log('📋 STEP 2: Checking MediaConvert Service');
    console.log('========================================');
    
    try {
        // Get MediaConvert endpoints
        console.log('🔍 Getting MediaConvert endpoints...');
        const endpoints = await runAWSCommand('mediaconvert', ['describe-endpoints', '--region', 'us-east-1']);
        console.log('✅ MediaConvert Endpoints:', JSON.stringify(endpoints, null, 2));
        
        // List recent jobs
        console.log('🔍 Checking recent MediaConvert jobs...');
        try {
            const jobs = await runAWSCommand('mediaconvert', ['list-jobs', '--region', 'us-east-1', '--max-results', '5']);
            console.log('✅ Recent MediaConvert Jobs:', JSON.stringify(jobs, null, 2));
        } catch (error) {
            console.log('⚠️ No recent jobs or access issue:', error.message);
        }
        
        // Check job templates
        console.log('🔍 Checking MediaConvert job templates...');
        try {
            const templates = await runAWSCommand('mediaconvert', ['list-job-templates', '--region', 'us-east-1']);
            console.log('✅ Job Templates:', JSON.stringify(templates, null, 2));
        } catch (error) {
            console.log('⚠️ Job templates check failed:', error.message);
        }
        
        return endpoints;
    } catch (error) {
        console.log('❌ MediaConvert service check failed:', error.message);
        return null;
    }
}

// Check S3 bucket configuration
async function checkS3Configuration() {
    console.log('');
    console.log('📋 STEP 3: Checking S3 Configuration');
    console.log('====================================');
    
    try {
        // Check bucket policy
        console.log('🔍 Checking S3 bucket policy...');
        try {
            const bucketPolicy = await runAWSCommand('s3api', ['get-bucket-policy', '--bucket', 'law-school-repository-content']);
            console.log('✅ S3 Bucket Policy:', JSON.stringify(JSON.parse(bucketPolicy.Policy), null, 2));
        } catch (error) {
            console.log('⚠️ Bucket policy check failed:', error.message);
        }
        
        // List videos in bucket
        console.log('🔍 Listing videos in S3 bucket...');
        const videos = await runAWSCommand('s3', ['ls', 's3://law-school-repository-content/videos/', '--recursive']);
        console.log('✅ Videos found:', videos.split('\n').length - 1, 'files');
        console.log('Sample videos:', videos.split('\n').slice(0, 3).join('\n'));
        
        // Check thumbnails folder
        console.log('🔍 Checking thumbnails folder...');
        try {
            const thumbnails = await runAWSCommand('s3', ['ls', 's3://law-school-repository-content/thumbnails/', '--recursive']);
            console.log('✅ Existing thumbnails:', thumbnails.split('\n').length - 1, 'files');
        } catch (error) {
            console.log('⚠️ Thumbnails folder check:', error.message);
        }
        
        return true;
    } catch (error) {
        console.log('❌ S3 configuration check failed:', error.message);
        return false;
    }
}

// Test MediaConvert thumbnail generation with extensive debugging
function testThumbnailGeneration() {
    return new Promise((resolve, reject) => {
        console.log('');
        console.log('📋 STEP 4: Testing MediaConvert Thumbnail Generation');
        console.log('===================================================');
        
        const postData = JSON.stringify({
            videoId: 'd65ae252-b52b-4862-93ca-6f0818fec8f4',
            forceRegenerate: true,
            debug: true
        });
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/videos/generate-thumbnails',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('🖼️ Attempting thumbnail generation...');
        console.log('📋 Video ID: d65ae252-b52b-4862-93ca-6f0818fec8f4');
        console.log('📋 S3 Key: videos/1755798554783-7u483xlorx5.wmv');
        console.log('📋 Expected: MediaConvert job creation (not SVG fallback)');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('');
                    console.log('📊 THUMBNAIL GENERATION RESULT:');
                    console.log('===============================');
                    console.log(`   HTTP Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    console.log(`   Method Used: ${result.method}`);
                    console.log(`   Error: ${result.error || 'None'}`);
                    
                    if (result.jobId) {
                        console.log(`   MediaConvert Job ID: ${result.jobId}`);
                        console.log('   ✅ REAL MEDIACONVERT JOB CREATED!');
                    }
                    
                    if (result.thumbnailUrl) {
                        const isDataUrl = result.thumbnailUrl.startsWith('data:');
                        const isS3Url = result.thumbnailUrl.includes('s3.') || result.thumbnailUrl.includes('cloudfront');
                        
                        console.log(`   Thumbnail Type: ${isDataUrl ? 'SVG Data URL (Fallback)' : isS3Url ? 'Real S3/CloudFront URL' : 'Unknown URL Type'}`);
                        
                        if (!isDataUrl) {
                            console.log(`   Thumbnail URL: ${result.thumbnailUrl}`);
                        }
                    }
                    
                    // Analyze the result
                    if (result.method === 'mediaconvert') {
                        console.log('');
                        console.log('🎉 SUCCESS: MediaConvert is Working!');
                        console.log('✅ IAM permissions fix was successful');
                        console.log('✅ Service role is properly configured');
                        console.log('✅ Real video thumbnails will be generated');
                        console.log(`✅ Job ID: ${result.jobId}`);
                    } else {
                        console.log('');
                        console.log('⚠️ Still using fallback method:', result.method);
                        console.log('❌ MediaConvert permissions may still have issues');
                        console.log('❌ Check the error details above');
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse response:', error.message);
                    console.log('Raw response:', data.substring(0, 500));
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Check MediaConvert job status if job was created
async function checkJobStatus(jobId) {
    if (!jobId) return;
    
    console.log('');
    console.log('📋 STEP 5: Checking MediaConvert Job Status');
    console.log('===========================================');
    
    try {
        console.log(`🔍 Checking job status for: ${jobId}`);
        const job = await runAWSCommand('mediaconvert', ['get-job', '--id', jobId, '--region', 'us-east-1']);
        
        console.log('✅ Job Details:');
        console.log(`   Status: ${job.Job.Status}`);
        console.log(`   Progress: ${job.Job.JobPercentComplete || 0}%`);
        console.log(`   Created: ${job.Job.CreatedAt}`);
        console.log(`   Role: ${job.Job.Role}`);
        
        if (job.Job.ErrorMessage) {
            console.log(`   Error: ${job.Job.ErrorMessage}`);
        }
        
        if (job.Job.OutputGroupDetails) {
            console.log('   Output Details:', JSON.stringify(job.Job.OutputGroupDetails, null, 2));
        }
        
        return job.Job;
    } catch (error) {
        console.log('❌ Job status check failed:', error.message);
        return null;
    }
}

// Check CloudWatch logs for MediaConvert
async function checkCloudWatchLogs() {
    console.log('');
    console.log('📋 STEP 6: Checking CloudWatch Logs');
    console.log('===================================');
    
    try {
        // List MediaConvert log groups
        console.log('🔍 Checking MediaConvert log groups...');
        const logGroups = await runAWSCommand('logs', ['describe-log-groups', '--log-group-name-prefix', '/aws/mediaconvert']);
        
        if (logGroups.logGroups && logGroups.logGroups.length > 0) {
            console.log('✅ MediaConvert log groups found:', logGroups.logGroups.length);
            
            // Get recent log events
            for (const group of logGroups.logGroups.slice(0, 2)) {
                console.log(`🔍 Checking logs in: ${group.logGroupName}`);
                try {
                    const events = await runAWSCommand('logs', [
                        'filter-log-events',
                        '--log-group-name', group.logGroupName,
                        '--start-time', (Date.now() - 3600000).toString(), // Last hour
                        '--max-items', '5'
                    ]);
                    
                    if (events.events && events.events.length > 0) {
                        console.log('✅ Recent log events:', events.events.length);
                        events.events.forEach((event, i) => {
                            console.log(`   ${i + 1}. ${new Date(event.timestamp).toISOString()}: ${event.message.substring(0, 100)}...`);
                        });
                    } else {
                        console.log('⚠️ No recent events in this log group');
                    }
                } catch (error) {
                    console.log(`⚠️ Could not read logs from ${group.logGroupName}:`, error.message);
                }
            }
        } else {
            console.log('⚠️ No MediaConvert log groups found');
        }
    } catch (error) {
        console.log('❌ CloudWatch logs check failed:', error.message);
    }
}

// Main test execution
async function runComprehensiveTest() {
    try {
        console.log(`🚀 Testing MediaConvert after permissions fix`);
        console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
        console.log('');
        
        // Step 1: Check IAM configuration
        const iamOk = await checkIAMConfiguration();
        if (!iamOk) {
            console.log('❌ IAM configuration issues detected. Please fix before proceeding.');
            return;
        }
        
        // Step 2: Check MediaConvert service
        const mediaConvertEndpoints = await checkMediaConvertService();
        if (!mediaConvertEndpoints) {
            console.log('❌ MediaConvert service issues detected.');
            return;
        }
        
        // Step 3: Check S3 configuration
        const s3Ok = await checkS3Configuration();
        if (!s3Ok) {
            console.log('❌ S3 configuration issues detected.');
            return;
        }
        
        // Step 4: Test thumbnail generation
        const thumbnailResult = await testThumbnailGeneration();
        
        // Step 5: Check job status if job was created
        if (thumbnailResult.jobId) {
            await checkJobStatus(thumbnailResult.jobId);
        }
        
        // Step 6: Check CloudWatch logs
        await checkCloudWatchLogs();
        
        console.log('');
        console.log('🎯 COMPREHENSIVE TEST SUMMARY:');
        console.log('==============================');
        
        if (thumbnailResult.method === 'mediaconvert') {
            console.log('🎉 MEDIACONVERT IS NOW WORKING!');
            console.log('✅ Permissions fix was successful');
            console.log('✅ Service role is properly configured');
            console.log('✅ Real video thumbnails are being generated');
            console.log('✅ AWS infrastructure is properly set up');
        } else {
            console.log('⚠️ MediaConvert still not working');
            console.log('❌ Additional troubleshooting needed');
            console.log('❌ Check the detailed logs above for specific issues');
        }
        
    } catch (error) {
        console.log('');
        console.log('❌ COMPREHENSIVE TEST FAILED');
        console.log('============================');
        console.log('Error:', error.message);
    }
}

// Run the comprehensive test
runComprehensiveTest();
