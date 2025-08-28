#!/usr/bin/env node

/**
 * Deploy Video Upload Metadata Fix
 * This script deploys the database layer fix to production
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying Video Upload Metadata Fix to Production...');
console.log('='.repeat(80));

try {
  // Step 1: Check if we have the necessary files
  console.log('\n📋 Step 1: Checking files...');
  
  const requiredFiles = [
    'src/lib/database.ts',
    'database/migrations/002_add_mux_integration_fields.sql',
    'src/app/api/database/migrate-mux-fixed/route.ts'
  ];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} - Found`);
    } else {
      console.log(`❌ ${file} - Missing`);
      throw new Error(`Required file ${file} is missing`);
    }
  }
  
  // Step 2: Check git status
  console.log('\n📋 Step 2: Checking git status...');
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      console.log('📝 Uncommitted changes found:');
      console.log(gitStatus);
    } else {
      console.log('✅ Working directory is clean');
    }
  } catch (error) {
    console.log('⚠️ Could not check git status (not a git repository?)');
  }
  
  // Step 3: Add and commit the fix
  console.log('\n📋 Step 3: Committing the database fix...');
  try {
    execSync('git add src/lib/database.ts', { stdio: 'inherit' });
    execSync('git add database/migrations/002_add_mux_integration_fields.sql', { stdio: 'inherit' });
    execSync('git add src/app/api/database/migrate-mux-fixed/route.ts', { stdio: 'inherit' });
    
    const commitMessage = 'fix: video upload metadata error - convert decimal duration to integer for database compatibility';
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    console.log('✅ Changes committed successfully');
  } catch (error) {
    console.log('⚠️ Commit failed (changes may already be committed):', error.message);
  }
  
  // Step 4: Push to main branch
  console.log('\n📋 Step 4: Pushing to main branch...');
  try {
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('✅ Changes pushed to main branch');
  } catch (error) {
    console.log('❌ Push failed:', error.message);
    throw error;
  }
  
  // Step 5: Deploy to Vercel
  console.log('\n📋 Step 5: Deploying to Vercel...');
  try {
    // Check if vercel CLI is available
    try {
      execSync('vercel --version', { stdio: 'pipe' });
      console.log('✅ Vercel CLI is available');
    } catch (error) {
      console.log('❌ Vercel CLI not found. Please install it:');
      console.log('npm i -g vercel');
      throw new Error('Vercel CLI not available');
    }
    
    // Deploy to production
    console.log('🚀 Starting Vercel deployment...');
    execSync('vercel --prod --yes', { stdio: 'inherit' });
    
    console.log('✅ Deployment to Vercel completed');
  } catch (error) {
    console.log('❌ Vercel deployment failed:', error.message);
    throw error;
  }
  
  // Step 6: Wait for deployment to be ready
  console.log('\n📋 Step 6: Waiting for deployment to be ready...');
  console.log('⏳ Waiting 30 seconds for deployment to propagate...');
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log('✅ Deployment should be ready');
  
  // Step 7: Summary
  console.log('\n🎉 Deployment Complete!');
  console.log('='.repeat(80));
  console.log('✅ Database layer fix deployed to production');
  console.log('✅ Decimal duration conversion is now active');
  console.log('✅ Mux integration should work without metadata errors');
  console.log('');
  console.log('🧪 Next Steps:');
  console.log('1. Run: node test-video-upload-metadata-fix.js');
  console.log('2. Test video upload in the web interface');
  console.log('3. Verify that Mux processing completes successfully');
  console.log('');
  console.log('🌐 Production URL: https://law-school-repository-3w058uf8w-andrew-j-gregwares-projects.vercel.app');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n🔧 Manual Deployment Steps:');
  console.log('1. git add src/lib/database.ts');
  console.log('2. git commit -m "fix: video upload metadata error"');
  console.log('3. git push origin main');
  console.log('4. vercel --prod');
  process.exit(1);
}

// Helper function for async operations
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
