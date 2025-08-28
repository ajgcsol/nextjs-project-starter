// Fix ALL 49 Videos - Complete Thumbnail Regeneration Script
// This script will process all your videos in batches to avoid overwhelming the system

const API_BASE = 'https://law-school-repository-d3txvzlzg-andrew-j-gregwares-projects.vercel.app'; // Your Vercel URL

async function fixAllVideos() {
  console.log('🔄 Starting complete thumbnail fix for all 49 videos...');
  
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let allResults = [];
  
  // Process in batches of 10 to avoid timeouts
  const batchSize = 10;
  let batchNumber = 1;
  
  while (totalProcessed < 49) {
    console.log(`\n🔄 Processing Batch ${batchNumber} (videos ${totalProcessed + 1}-${Math.min(totalProcessed + batchSize, 49)})`);
    
    try {
      const response = await fetch(`${API_BASE}/api/videos/generate-thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchMode: true,
          limit: batchSize,
          forceRegenerate: false // Start with broken ones, then we'll do force regenerate
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Batch ${batchNumber} completed!`);
        console.log(`📊 Batch Results: ${result.successful} successful, ${result.failed} failed out of ${result.processed} processed`);
        
        totalProcessed += result.processed;
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        allResults = allResults.concat(result.results || []);
        
        // If we processed fewer than the batch size, we're done with broken thumbnails
        if (result.processed < batchSize) {
          console.log(`\n🎯 Processed all videos with broken thumbnails (${totalProcessed} total)`);
          break;
        }
        
      } else {
        console.error(`❌ Batch ${batchNumber} failed:`, result.error);
        break;
      }
      
      // Wait 2 seconds between batches to avoid overwhelming the system
      if (totalProcessed < 49) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      batchNumber++;
      
    } catch (error) {
      console.error(`❌ Batch ${batchNumber} error:`, error.message);
      break;
    }
  }
  
  // If we haven't processed all 49 videos, run force regenerate for the rest
  if (totalProcessed < 49) {
    console.log(`\n🔄 Running force regenerate for remaining videos...`);
    
    try {
      const response = await fetch(`${API_BASE}/api/videos/generate-thumbnails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchMode: true,
          limit: 49, // Process up to 49 videos
          forceRegenerate: true // Force regenerate ALL videos
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Force regenerate completed!`);
        console.log(`📊 Force Results: ${result.successful} successful, ${result.failed} failed out of ${result.processed} processed`);
        
        // Update totals (but avoid double counting)
        const newVideos = result.processed - totalProcessed;
        if (newVideos > 0) {
          totalProcessed = result.processed;
          totalSuccessful += result.successful - totalSuccessful; // Adjust for any overlaps
          totalFailed += result.failed - totalFailed;
        }
        
        allResults = result.results || [];
      }
      
    } catch (error) {
      console.error('❌ Force regenerate error:', error.message);
    }
  }
  
  // Final summary
  console.log('\n🎉 COMPLETE THUMBNAIL FIX SUMMARY:');
  console.log(`📊 Total Videos: ${totalProcessed}`);
  console.log(`✅ Successful: ${totalSuccessful}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${Math.round((totalSuccessful / totalProcessed) * 100)}%`);
  
  if (allResults.length > 0) {
    console.log('\n📋 Detailed Results:');
    allResults.forEach((res, index) => {
      const status = res.success ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${res.videoTitle || 'Unknown'} - ${res.method} ${res.error ? `(${res.error})` : ''}`);
    });
  }
  
  if (totalProcessed >= 49) {
    console.log('\n🎯 SUCCESS: All 49 videos have been processed!');
    console.log('🖼️ Your video management list should now show proper thumbnails.');
    console.log('🔄 If some thumbnails still don\'t appear, try refreshing the page or clearing browser cache.');
  } else {
    console.log(`\n⚠️ Only processed ${totalProcessed} out of 49 videos. You may need to run this script again.`);
  }
}

// Run the script
fixAllVideos().catch(error => {
  console.error('❌ Script failed:', error);
});
