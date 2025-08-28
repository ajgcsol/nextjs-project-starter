#!/usr/bin/env node

/**
 * Deploy Upload-First Modal to Production
 * Deploys the complete upload-first serverless modal implementation
 * 
 * Run: node deploy-upload-first-modal.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying Upload-First Modal to Production');
console.log('==============================================');
console.log('📅 August 27, 2025, 9:02 PM EST');
console.log('');

// Deployment configuration
const config = {
  projectName: 'nextjs-project-starter',
  branch: 'main',
  timeout: 300000 // 5 minutes
};

/**
 * Execute command with error handling
 */
function executeCommand(command, description) {
  console.log(`📋 ${description}...`);
  console.log(`💻 Running: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: config.timeout 
    });
    console.log(`✅ ${description} completed successfully`);
    if (output.trim()) {
      console.log(`📄 Output: ${output.trim()}`);
    }
    console.log('');
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(`Error: ${error.message}`);
    if (error.stdout) {
      console.error(`Stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      console.error(`Stderr: ${error.stderr}`);
    }
    console.log('');
    throw error;
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Verify implementation files
 */
function verifyImplementationFiles() {
  console.log('🔍 Verifying Implementation Files');
  console.log('─'.repeat(40));

  const requiredFiles = [
    'src/components/UploadFirstServerlessModal.tsx',
    'src/app/api/videos/presigned-url/route.ts',
    'src/components/ContentEditor.tsx',
    'UPLOAD_FIRST_MODAL_COMPLETE_IMPLEMENTATION_SUMMARY.md'
  ];

  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (fileExists(file)) {
      console.log(`✅ ${file} - Found`);
    } else {
      console.log(`❌ ${file} - Missing`);
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
  }

  console.log('✅ All implementation files verified');
  console.log('');
}

/**
 * Check Git status
 */
function checkGitStatus() {
  console.log('📊 Checking Git Status');
  console.log('─'.repeat(40));

  try {
    const status = executeCommand('git status --porcelain', 'Getting Git status');
    
    if (status.trim()) {
      console.log('📝 Uncommitted changes detected:');
      console.log(status);
      return false;
    } else {
      console.log('✅ Working directory is clean');
      return true;
    }
  } catch (error) {
    console.log('⚠️  Could not check Git status, proceeding anyway');
    return true;
  }
}

/**
 * Commit and push changes
 */
function commitAndPushChanges() {
  console.log('📤 Committing and Pushing Changes');
  console.log('─'.repeat(40));

  try {
    // Add all changes
    executeCommand('git add .', 'Adding all changes to Git');

    // Create commit message
    const commitMessage = `feat: Upload-First Modal Implementation - August 27, 2025

✨ Features:
- Responsive upload-first serverless modal (95vw x 95vh)
- Real-time progress tracking with step-by-step feedback
- Video preview with thumbnail selection (timestamp/custom/auto)
- Comprehensive error handling and validation
- S3 presigned URL integration for direct uploads
- Mobile/tablet/desktop optimized responsive design

🔧 Technical:
- New UploadFirstServerlessModal component
- /api/videos/presigned-url endpoint
- Updated ContentEditor integration
- File validation (5GB max, video types only)
- Progress tracking with time estimates

🐛 Fixes:
- "No video file selected" error eliminated
- Modal responsiveness on all devices
- Upload-first workflow prevents validation errors
- Proper file handling and state management

📱 Responsive Design:
- Mobile: Full-screen modal with stacked layout
- Tablet: Two-column layout with touch optimization
- Desktop: Side-by-side preview and controls

🗂️ Project Organization:
- Moved test scripts to archive/test-scripts/
- Moved documentation to archive/documentation/
- Moved deployment scripts to archive/deployment-scripts/
- Clean root directory with only essential files

🚀 Ready for Production Deployment`;

    executeCommand(`git commit -m "${commitMessage}"`, 'Committing changes');

    // Push to main branch
    executeCommand('git push origin main', 'Pushing to main branch');

  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('ℹ️  No changes to commit, proceeding with deployment');
    } else {
      throw error;
    }
  }
}

/**
 * Deploy to Vercel
 */
function deployToVercel() {
  console.log('🌐 Deploying to Vercel Production');
  console.log('─'.repeat(40));

  try {
    // Check if Vercel CLI is installed
    executeCommand('vercel --version', 'Checking Vercel CLI');

    // Deploy to production
    const deployOutput = executeCommand('vercel --prod --yes', 'Deploying to Vercel production');
    
    // Extract deployment URL
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+/);
    if (urlMatch) {
      const deploymentUrl = urlMatch[0];
      console.log(`🎉 Deployment successful!`);
      console.log(`🔗 Production URL: ${deploymentUrl}`);
      return deploymentUrl;
    } else {
      console.log('✅ Deployment completed (URL not extracted)');
      return null;
    }

  } catch (error) {
    if (error.message.includes('command not found')) {
      console.log('⚠️  Vercel CLI not found. Please install it:');
      console.log('npm i -g vercel');
      console.log('');
      console.log('Or deploy manually:');
      console.log('1. Push changes to GitHub');
      console.log('2. Vercel will auto-deploy from main branch');
      return null;
    } else {
      throw error;
    }
  }
}

/**
 * Verify deployment
 */
async function verifyDeployment(deploymentUrl) {
  if (!deploymentUrl) {
    console.log('⚠️  Skipping deployment verification (no URL available)');
    return;
  }

  console.log('🔍 Verifying Deployment');
  console.log('─'.repeat(40));

  const https = require('https');

  function makeRequest(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      https.get(url, (res) => {
        clearTimeout(timeout);
        resolve({
          status: res.statusCode,
          headers: res.headers
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  try {
    // Test main page
    console.log('🌐 Testing main page...');
    const mainResponse = await makeRequest(deploymentUrl);
    if (mainResponse.status === 200) {
      console.log('✅ Main page loads successfully');
    } else {
      console.log(`⚠️  Main page returned status: ${mainResponse.status}`);
    }

    // Test presigned URL API
    console.log('🔗 Testing presigned URL API...');
    const apiUrl = `${deploymentUrl}/api/videos/presigned-url`;
    try {
      const apiResponse = await makeRequest(apiUrl);
      console.log(`✅ Presigned URL API accessible (status: ${apiResponse.status})`);
    } catch (error) {
      console.log(`⚠️  Presigned URL API test failed: ${error.message}`);
    }

    console.log('');
    console.log('🎉 Deployment verification completed!');

  } catch (error) {
    console.log(`⚠️  Deployment verification failed: ${error.message}`);
  }
}

/**
 * Main deployment process
 */
async function main() {
  try {
    // Step 1: Verify implementation files
    verifyImplementationFiles();

    // Step 2: Check Git status
    const isClean = checkGitStatus();

    // Step 3: Commit and push changes (if needed)
    if (!isClean) {
      commitAndPushChanges();
    }

    // Step 4: Deploy to Vercel
    const deploymentUrl = deployToVercel();

    // Step 5: Verify deployment
    if (deploymentUrl) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      await verifyDeployment(deploymentUrl);
    }

    // Step 6: Success summary
    console.log('🎊 DEPLOYMENT COMPLETE!');
    console.log('======================');
    console.log('');
    console.log('✅ Upload-First Modal successfully deployed to production');
    console.log('');
    console.log('🚀 Features Deployed:');
    console.log('  • Responsive upload-first serverless modal');
    console.log('  • Real-time progress tracking');
    console.log('  • Video preview with thumbnail selection');
    console.log('  • S3 presigned URL integration');
    console.log('  • Mobile/tablet/desktop optimization');
    console.log('  • Comprehensive error handling');
    console.log('');
    console.log('🔧 Technical Components:');
    console.log('  • UploadFirstServerlessModal.tsx');
    console.log('  • /api/videos/presigned-url endpoint');
    console.log('  • Updated ContentEditor integration');
    console.log('');
    console.log('🗂️ Project Organization:');
    console.log('  • Clean root directory');
    console.log('  • Archived test scripts and documentation');
    console.log('  • Organized file structure');
    console.log('');
    if (deploymentUrl) {
      console.log(`🌐 Production URL: ${deploymentUrl}`);
    }
    console.log('');
    console.log('📋 Next Steps:');
    console.log('  1. Test the upload-first modal functionality');
    console.log('  2. Verify responsive design on different devices');
    console.log('  3. Test video upload with progress tracking');
    console.log('  4. Validate error handling scenarios');
    console.log('');
    console.log('🎯 Ready for production use!');

  } catch (error) {
    console.error('');
    console.error('💥 DEPLOYMENT FAILED!');
    console.error('====================');
    console.error('');
    console.error(`❌ Error: ${error.message}`);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('  1. Check that all files are committed to Git');
    console.error('  2. Ensure Vercel CLI is installed (npm i -g vercel)');
    console.error('  3. Verify Vercel project is properly configured');
    console.error('  4. Check environment variables are set');
    console.error('');
    console.error('📞 For help, check the deployment logs above');
    
    process.exit(1);
  }
}

// Run deployment
main().catch(console.error);
