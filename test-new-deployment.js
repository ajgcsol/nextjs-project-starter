/**
 * Test Script for New Deployment with Phase 2 & 3 Components
 */

const NEW_BASE_URL = 'https://law-school-repository-7v2jyb30o-andrew-j-gregwares-projects.vercel.app';

class NewDeploymentTester {
  constructor() {
    this.results = [];
  }

  async testNewDeployment() {
    console.log('🚀 TESTING NEW DEPLOYMENT WITH ALL PHASES');
    console.log('=' .repeat(80));
    console.log(`🌐 New deployment URL: ${NEW_BASE_URL}`);
    console.log('=' .repeat(80));

    const tests = [
      // Phase 1 - Should still work
      {
        name: '📸 Phase 1: Thumbnail Admin Interface',
        url: `${NEW_BASE_URL}/admin/fix-thumbnails`,
        expected: 'Working'
      },
      
      // Phase 2 - Should now work
      {
        name: '🎵 Phase 2: Audio Processing Admin Interface',
        url: `${NEW_BASE_URL}/admin/audio-processing`,
        expected: 'Now Working'
      },
      {
        name: '🎵 Phase 2: Audio Processing API',
        url: `${NEW_BASE_URL}/api/videos/process-audio?action=list-videos-needing-audio-processing&limit=5`,
        expected: 'Now Working'
      },
      
      // Phase 3 - Should now work
      {
        name: '🎤 Phase 3: Transcription Admin Interface',
        url: `${NEW_BASE_URL}/admin/transcription`,
        expected: 'Now Working'
      },
      {
        name: '🎤 Phase 3: Transcription API',
        url: `${NEW_BASE_URL}/api/videos/transcribe?action=list-videos-needing-transcription&limit=5`,
        expected: 'Now Working'
      },
      
      // Core Infrastructure
      {
        name: '🔧 Core: Video API',
        url: `${NEW_BASE_URL}/api/videos`,
        expected: 'Working'
      },
      {
        name: '🔧 Core: Database Health',
        url: `${NEW_BASE_URL}/api/database/health`,
        expected: 'Working'
      }
    ];

    for (const test of tests) {
      await this.runTest(test);
    }

    this.generateReport();
  }

  async runTest(test) {
    const startTime = Date.now();
    let result = {
      name: test.name,
      url: test.url,
      expected: test.expected,
      success: false,
      status: null,
      responseTime: 0,
      error: null
    };

    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'Accept': test.url.includes('/api/') ? 'application/json' : 'text/html',
          'User-Agent': 'NewDeploymentTester/1.0'
        }
      });

      result.responseTime = Date.now() - startTime;
      result.status = response.status;
      result.success = response.ok;

      const statusIcon = result.success ? '✅' : '❌';
      const expectedIcon = test.expected === 'Now Working' ? '🆕' : '🔄';
      
      console.log(`   ${statusIcon} ${expectedIcon} ${test.name} - ${result.responseTime}ms - Status: ${result.status}`);
      
      if (!result.success) {
        const errorText = await response.text();
        result.error = errorText.substring(0, 100);
        console.log(`      Error: ${result.error}`);
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      console.log(`   ❌ 🔴 ${test.name} - Connection Error: ${error.message}`);
    }

    this.results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  generateReport() {
    console.log('\n📊 NEW DEPLOYMENT TEST RESULTS');
    console.log('=' .repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const newFeatures = this.results.filter(r => r.expected === 'Now Working').length;
    const newFeaturesWorking = this.results.filter(r => r.expected === 'Now Working' && r.success).length;

    console.log(`📈 OVERALL RESULTS:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ✅ Passed: ${passedTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`  🆕 New Features: ${newFeatures}`);
    console.log(`  🆕 New Features Working: ${newFeaturesWorking}/${newFeatures}`);

    console.log('\n🔗 ADMIN INTERFACE STATUS:');
    const thumbnailResult = this.results.find(r => r.name.includes('Thumbnail Admin'));
    const audioResult = this.results.find(r => r.name.includes('Audio Processing Admin'));
    const transcriptionResult = this.results.find(r => r.name.includes('Transcription Admin'));

    console.log(`  📸 Thumbnails: ${NEW_BASE_URL}/admin/fix-thumbnails ${thumbnailResult?.success ? '✅' : '❌'}`);
    console.log(`  🎵 Audio Processing: ${NEW_BASE_URL}/admin/audio-processing ${audioResult?.success ? '✅' : '❌'}`);
    console.log(`  🎤 Transcription: ${NEW_BASE_URL}/admin/transcription ${transcriptionResult?.success ? '✅' : '❌'}`);

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL PHASES DEPLOYED AND WORKING!');
      console.log('🚀 Complete video processing pipeline is now live in production!');
    } else {
      console.log('\n⚠️  Some components still need attention.');
      console.log('🔧 Check the errors above for remaining issues.');
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NewDeploymentTester;
} else {
  // Run if called directly
  const tester = new NewDeploymentTester();
  tester.testNewDeployment().then(() => {
    console.log('🏁 New deployment testing completed');
  }).catch(error => {
    console.error('💥 New deployment test failed:', error);
  });
}
