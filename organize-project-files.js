#!/usr/bin/env node

/**
 * Organize Project Files - Move non-essential files to archive
 * Cleans up the root directory by moving test scripts and documentation
 * 
 * Run: node organize-project-files.js
 */

const fs = require('fs');
const path = require('path');

console.log('🗂️  Organizing Project Files');
console.log('============================');
console.log('📅 August 27, 2025, 8:57 PM EST');
console.log('');

// Files to keep in root (essential project files)
const keepInRoot = [
  // Core project files
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  '.eslintrc.json',
  'postcss.config.mjs',
  'components.json',
  'vercel.json',
  'middleware.ts',
  '.gitignore',
  '.vercelignore',
  '.neon',
  
  // Essential documentation
  'README.md',
  'TODO.md',
  
  // Essential directories
  'src',
  'lib',
  'public',
  'database',
  'scripts',
  'test_js_scripts',
  'archive',
  
  // Current working files (keep for now)
  'test-stepped-upload-integration.js',
  'UPLOAD_FIRST_MODAL_COMPLETE_IMPLEMENTATION_SUMMARY.md',
  
  // Essential config files
  'temp_access_key.txt',
  'temp_secret_key.txt'
];

// Test scripts to move to archive/test-scripts
const testScriptPatterns = [
  /^test-.*\.js$/,
  /^debug-.*\.js$/,
  /^fix-.*\.js$/,
  /^run-.*\.js$/,
  /^check-.*\.js$/,
  /^setup-.*\.js$/,
  /^deploy-.*\.js$/,
  /^verify-.*\.js$/,
  /^activate-.*\.js$/,
  /^discover-.*\.js$/,
  /^query-.*\.js$/,
  /^clear-.*\.js$/,
  /^list-.*\.js$/,
  /^generate-.*\.js$/,
  /^comprehensive-.*\.js$/,
  /^production-.*\.js$/,
  /^final-.*\.js$/,
  /^simple-.*\.js$/,
  /^add-.*\.js$/,
  /^init-.*\.js$/
];

// Documentation files to move to archive/documentation
const docPatterns = [
  /.*_SUMMARY\.md$/,
  /.*_COMPLETE\.md$/,
  /.*_FIX.*\.md$/,
  /.*_GUIDE\.md$/,
  /.*_ANALYSIS\.md$/,
  /.*_INSTRUCTIONS\.md$/,
  /.*_SETUP\.md$/,
  /.*_DEBUG\.md$/,
  /.*_PLAN\.md$/,
  /^[A-Z_]+\.md$/,
  /^PHASE_.*\.md$/,
  /^MUX_.*\.md$/,
  /^AWS_.*\.md$/,
  /^VIDEO_.*\.md$/,
  /^THUMBNAIL_.*\.md$/,
  /^INFINITE_.*\.md$/,
  /^DUPLICATE_.*\.md$/,
  /^CORS_.*\.md$/,
  /^S3_.*\.md$/,
  /^MEDIACONVERT_.*\.md$/,
  /^SYNCHRONOUS_.*\.md$/,
  /^COMPLETE_.*\.md$/,
  /^FINAL_.*\.md$/,
  /^CRITICAL_.*\.md$/,
  /^URGENT_.*\.md$/,
  /^REAL_.*\.md$/,
  /^CORRECTED_.*\.md$/,
  /^REALITY_.*\.md$/,
  /^MONITORING_.*\.md$/,
  /^MODERN_.*\.md$/,
  /^PREMIUM_.*\.md$/,
  /^TYPESCRIPT_.*\.md$/,
  /^MULTIPART_.*\.md$/,
  /^COMPREHENSIVE_.*\.md$/,
  /^PRIORITY_.*\.md$/,
  /^PERFECT_.*\.md$/,
  /^UPLOAD_FIRST_MODAL_.*\.md$/
];

// Deployment scripts to move to archive/deployment-scripts
const deploymentPatterns = [
  /.*\.ps1$/,
  /.*\.sh$/,
  /^add-.*-to-vercel\..*$/,
  /^setup-.*\..*$/,
  /^update-.*\..*$/,
  /^fix-.*\.ps1$/,
  /^fix-.*\.sh$/
];

// Other files to move to archive/test-scripts
const otherTestFiles = [
  'bucket-policy.json',
  'corrected-bucket-policy.json',
  's3-cors-config.json',
  's3-policy-with-cloudfront.json',
  'mediaconvert-service-role-trust-policy.json',
  'duplicate-prevention-test-results.json',
  'gitignore.txt',
  'test-video.mp4'
];

/**
 * Move file to archive directory
 */
function moveToArchive(filename, archiveSubdir) {
  const sourcePath = path.join(process.cwd(), filename);
  const targetDir = path.join(process.cwd(), 'archive', archiveSubdir);
  const targetPath = path.join(targetDir, filename);
  
  try {
    if (fs.existsSync(sourcePath)) {
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Move file
      fs.renameSync(sourcePath, targetPath);
      console.log(`📁 Moved: ${filename} → archive/${archiveSubdir}/`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to move ${filename}: ${error.message}`);
    return false;
  }
  return false;
}

/**
 * Check if file matches any pattern
 */
function matchesPatterns(filename, patterns) {
  return patterns.some(pattern => pattern.test(filename));
}

/**
 * Main organization process
 */
function organizeFiles() {
  console.log('🔍 Scanning root directory...');
  
  const files = fs.readdirSync(process.cwd()).filter(item => {
    const itemPath = path.join(process.cwd(), item);
    return fs.statSync(itemPath).isFile();
  });
  
  console.log(`📊 Found ${files.length} files in root directory`);
  console.log('');
  
  let movedCount = 0;
  let testScriptsMoved = 0;
  let docsMoved = 0;
  let deploymentMoved = 0;
  let otherMoved = 0;
  
  for (const filename of files) {
    // Skip files that should stay in root
    if (keepInRoot.includes(filename)) {
      continue;
    }
    
    let moved = false;
    
    // Check test script patterns
    if (matchesPatterns(filename, testScriptPatterns)) {
      if (moveToArchive(filename, 'test-scripts')) {
        testScriptsMoved++;
        moved = true;
      }
    }
    // Check documentation patterns
    else if (matchesPatterns(filename, docPatterns)) {
      if (moveToArchive(filename, 'documentation')) {
        docsMoved++;
        moved = true;
      }
    }
    // Check deployment script patterns
    else if (matchesPatterns(filename, deploymentPatterns)) {
      if (moveToArchive(filename, 'deployment-scripts')) {
        deploymentMoved++;
        moved = true;
      }
    }
    // Check other test files
    else if (otherTestFiles.includes(filename)) {
      if (moveToArchive(filename, 'test-scripts')) {
        otherMoved++;
        moved = true;
      }
    }
    
    if (moved) {
      movedCount++;
    }
  }
  
  console.log('');
  console.log('📈 Organization Summary:');
  console.log('─'.repeat(30));
  console.log(`📁 Test Scripts: ${testScriptsMoved} files moved`);
  console.log(`📚 Documentation: ${docsMoved} files moved`);
  console.log(`🚀 Deployment Scripts: ${deploymentMoved} files moved`);
  console.log(`🔧 Other Files: ${otherMoved} files moved`);
  console.log(`📊 Total Files Moved: ${movedCount}`);
  console.log('');
  
  // Show remaining files in root
  const remainingFiles = fs.readdirSync(process.cwd()).filter(item => {
    const itemPath = path.join(process.cwd(), item);
    return fs.statSync(itemPath).isFile();
  });
  
  console.log('📋 Files Remaining in Root:');
  console.log('─'.repeat(30));
  remainingFiles.forEach(file => {
    console.log(`📄 ${file}`);
  });
  
  console.log('');
  console.log('✅ Project organization complete!');
  console.log('');
  console.log('📁 Archive Structure:');
  console.log('  archive/');
  console.log('  ├── test-scripts/     (test and debug scripts)');
  console.log('  ├── documentation/    (markdown documentation)');
  console.log('  └── deployment-scripts/ (PowerShell and bash scripts)');
  console.log('');
  console.log('🎯 Root directory is now clean and organized!');
}

// Run organization
try {
  organizeFiles();
} catch (error) {
  console.error('');
  console.error('💥 Organization failed!');
  console.error('======================');
  console.error('');
  console.error(`❌ Error: ${error.message}`);
  console.error('');
  process.exit(1);
}
