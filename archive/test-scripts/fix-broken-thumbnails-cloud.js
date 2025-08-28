// Fix Broken Thumbnails Script - Cloud Version
// This script works with your deployed application (Vercel, etc.)

// Replace with your actual deployed domain
const CLOUD_DOMAIN = 'https://your-app.vercel.app'; // UPDATE THIS!

async function fixBrokenThumbnailsCloud() {
  console.log('🔄 Starting cloud thumbnail fix...');
  console.log('🌐 Target domain:', CLOUD_DOMAIN);
  console.log('');
  
  if (CLOUD_DOMAIN.includes('your-app.vercel.app')) {
    console.log('❌ Please update CLOUD_DOMAIN with your actual Vercel URL!');
    console.log('   Example: https://my-law-school-app.vercel.app');
    console.log('');
    console.log('📋 Or use curl directly:');
    console.log('');
    console.log('curl -X POST https://YOUR-DOMAIN.vercel.app/api/videos/generate-thumbnails \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"batchMode": true, "limit": 50, "forceRegenerate": false}\'');
    console.log('');
    return;
  }
  
  try {
    console.log('🔍 Testing cloud endpoint...');
    
    // Call the batch thumbnail generation API
    const response = await fetch(`${CLOUD_DOMAIN}/api/videos/generate-thumbnails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchMode: true,
        limit: 50, // Process up to 50 videos
        forceRegenerate: false // Set to true to regenerate ALL thumbnails, false for just broken ones
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Cloud thumbnail fix completed!');
      console.log(`📊 Results: ${result.successful} successful, ${result.failed} failed out of ${result.processed} processed`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detailed Results:');
        result.results.forEach((res, index) => {
          const status = res.success ? '✅' : '❌';
          const title = res.videoTitle || res.videoId || 'Unknown';
          console.log(`${status} ${index + 1}. ${title} - ${res.method} ${res.error ? `(${res.error})` : ''}`);
        });
      }
      
      if (result.processed === 0) {
        console.log('');
        console.log('🎉 No broken thumbnails found! All videos already have working thumbnails.');
      }
    } else {
      console.error('❌ Thumbnail fix failed:', result.error);
      console.log('Details:', result.details || 'No additional details');
    }
    
  } catch (error) {
    console.error('❌ Cloud script error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure your app is deployed and running');
    console.log('2. Check that the domain URL is correct');
    console.log('3. Verify your database connection is working');
    console.log('4. Check AWS credentials are configured in Vercel');
  }
}

// Run the script
fixBrokenThumbnailsCloud();
