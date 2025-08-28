#!/usr/bin/env node

/**
 * Fix Video Upload Metadata Error
 * This script addresses the "Failed to save video metadata" error
 * by ensuring proper database schema and fixing data type issues
 */

const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-3w058uf8w-andrew-j-gregwares-projects.vercel.app';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Video-Upload-Fix-Script/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function fixVideoUploadError() {
  console.log('🔧 Fixing Video Upload Metadata Error...');
  console.log('🌐 Production URL:', PRODUCTION_URL);
  
  try {
    // Step 1: Check current database schema
    console.log('\n📊 Step 1: Checking database schema...');
    const schemaCheck = await makeRequest('/api/database/health');
    console.log('Schema Status:', schemaCheck.status);
    console.log('Schema Data:', JSON.stringify(schemaCheck.data, null, 2));
    
    // Step 2: Apply comprehensive database migration
    console.log('\n🗄️ Step 2: Applying comprehensive database migration...');
    const migrationResult = await makeRequest('/api/database/migrate-mux-fixed', 'POST');
    console.log('Migration Status:', migrationResult.status);
    console.log('Migration Result:', JSON.stringify(migrationResult.data, null, 2));
    
    // Step 3: Test video upload with corrected data types
    console.log('\n🧪 Step 3: Testing video upload with corrected data...');
    
    // Create a test video upload payload with proper data types
    const testVideoData = {
      title: 'Metadata Fix Test',
      description: 'Testing video upload after metadata fix',
      category: 'Test',
      tags: 'test,metadata,fix',
      visibility: 'private',
      s3Key: 'test/metadata-fix-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/metadata-fix-test.mp4',
      filename: 'metadata-fix-test.mp4',
      size: 2000000, // 2MB - integer
      mimeType: 'video/mp4',
      autoThumbnail: null
    };
    
    const uploadTest = await makeRequest('/api/videos/upload', 'POST', testVideoData);
    console.log('Upload Test Status:', uploadTest.status);
    console.log('Upload Test Result:', JSON.stringify(uploadTest.data, null, 2));
    
    // Step 4: Test with Mux processing disabled (fallback mode)
    console.log('\n🔄 Step 4: Testing fallback mode (no Mux processing)...');
    
    const fallbackTestData = {
      title: 'Fallback Mode Test',
      description: 'Testing video upload without Mux processing',
      category: 'Test',
      tags: 'test,fallback',
      visibility: 'private',
      s3Key: 'test/fallback-test.mp4',
      publicUrl: 'https://law-school-repository-content.s3.us-east-1.amazonaws.com/test/fallback-test.mp4',
      filename: 'fallback-test.mp4',
      size: 1500000, // 1.5MB - integer
      mimeType: 'video/mp4',
      autoThumbnail: null,
      skipMuxProcessing: true // Flag to skip Mux processing
    };
    
    const fallbackTest = await makeRequest('/api/videos/upload', 'POST', fallbackTestData);
    console.log('Fallback Test Status:', fallbackTest.status);
    console.log('Fallback Test Result:', JSON.stringify(fallbackTest.data, null, 2));
    
    // Step 5: Summary and recommendations
    console.log('\n📋 Fix Summary:');
    console.log('='.repeat(60));
    
    if (schemaCheck.status === 200) {
      console.log('✅ Database connection: WORKING');
    } else {
      console.log('❌ Database connection: FAILED');
    }
    
    if (migrationResult.status === 200) {
      console.log('✅ Database migration: COMPLETED');
    } else {
      console.log('❌ Database migration: FAILED');
    }
    
    if (uploadTest.status === 200 && uploadTest.data.success) {
      console.log('✅ Video upload with Mux: WORKING');
      console.log('🎉 METADATA ERROR FIXED!');
    } else {
      console.log('❌ Video upload with Mux: STILL FAILING');
      
      if (fallbackTest.status === 200 && fallbackTest.data.success) {
        console.log('✅ Video upload fallback: WORKING');
        console.log('💡 Recommendation: Use fallback mode until Mux is fully configured');
      } else {
        console.log('❌ Video upload fallback: ALSO FAILING');
        console.log('🚨 Critical: Basic video upload is broken');
      }
    }
    
    console.log('='.repeat(60));
    
    // Step 6: Provide specific error analysis
    if (uploadTest.data && uploadTest.data.error) {
      console.log('\n🔍 Error Analysis:');
      console.log('Primary Error:', uploadTest.data.error);
      
      if (uploadTest.data.details) {
        console.log('Error Details:', uploadTest.data.details);
      }
      
      // Common error patterns and solutions
      if (uploadTest.data.error.includes('invalid input syntax for type integer')) {
        console.log('\n💡 Solution: Duration field type mismatch');
        console.log('   - Mux returns decimal duration (e.g., "22.842667")');
        console.log('   - Database expects integer');
        console.log('   - Fix: Convert duration to integer before saving');
      }
      
      if (uploadTest.data.error.includes('column') && uploadTest.data.error.includes('does not exist')) {
        console.log('\n💡 Solution: Missing database columns');
        console.log('   - Run database migration to add Mux fields');
        console.log('   - Ensure all Mux integration columns exist');
      }
      
      if (uploadTest.data.error.includes('Mux')) {
        console.log('\n💡 Solution: Mux configuration issue');
        console.log('   - Check Mux credentials in Vercel environment variables');
        console.log('   - Verify Mux API access and permissions');
      }
    }
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
    process.exit(1);
  }
}

// Run the fix
