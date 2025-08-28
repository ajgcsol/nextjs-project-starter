// Fix Broken Thumbnails Script
// This script will regenerate thumbnails for all videos with broken/missing thumbnails

const API_BASE = 'http://localhost:3000'; // Change this to your domain in production

async function fixBrokenThumbnails() {
  console.log('🔄 Starting broken thumbnail fix...');
  
  try {
    // Call the batch thumbnail generation API with forceRegenerate = true
    const response = await fetch(`${API_BASE}/api/videos/generate-thumbnails`, {
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

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Thumbnail fix completed!');
      console.log(`📊 Results: ${result.successful} successful, ${result.failed} failed out of ${result.processed} processed`);
      
      if (result.results && result.results.length > 0) {
        console.log('\n📋 Detailed Results:');
        result.results.forEach((res, index) => {
          const status = res.success ? '✅' : '❌';
          console.log(`${status} ${index + 1}. ${res.videoTitle || 'Unknown'} - ${res.method} ${res.error ? `(${res.error})` : ''}`);
        });
      }
    } else {
      console.error('❌ Thumbnail fix failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

// Run the script
fixBrokenThumbnails();
