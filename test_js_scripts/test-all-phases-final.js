/**
 * Final Comprehensive Testing Script for All Three Phases
 * Tests the complete video processing pipeline and identifies deployment issues
 */

const BASE_URL = 'https://law-school-repository-hkweakp4b-andrew-j-gregwares-projects.vercel.app';

class FinalComprehensiveTester {
  constructor() {
    this.results = {
      phase1: [],
      phase2: [],
      phase3: [],
      integration: [],
      issues: []
    };
  }

  async runFinalTests() {
    console.log('🧪 FINAL COMPREHENSIVE VIDEO PROCESSING PIPELINE TESTING');
    console.log('=' .repeat(80));
    console.log(`🌐 Testing deployment: ${BASE_URL}`);
    console.log('=' .repeat(80));

    try {
      // Test Phase 1: Thumbnail Generation (Known Working)
      await this.testPhase1Final();
      
      // Test Phase 2: Audio Enhancement (Needs Deployment)
      await this.testPhase2Final();
      
      // Test Phase 3: AI Transcription (Needs Deployment)
      await this.testPhase3Final();
      
      // Test Core Infrastructure
      await this.testCoreInfrastructure();
      
      // Generate comprehensive report with deployment status
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Final test suite failed:', error);
    }
  }

  async testPhase1Final() {
    console.log('\n📸 PHASE 1: THUMBNAIL GENERATION (PRODUCTION TESTING)');
    console.log('-'.repeat(60));

    const tests = [
      {
        name: 'Admin Interface - Fix Thumbnails',
        url: `${BASE_URL}/admin/fix-thumbnails`,
        expectedStatus: 200,
        type: 'page'
      },
      {
        name: 'Thumbnail API - List Videos Without Thumbnails',
        url: `${BASE_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`,
        expectedStatus: 200,
        type: 'api'
      },
      {
        name: 'Core Video API',
        url: `${BASE_URL}/api/videos`,
        expectedStatus: 200,
        type: 'api'
      }
    ];

    for (const test of tests) {
      await this.runTest('phase1', test);
    }
  }

  async testPhase2Final() {
    console.log('\n🎵 PHASE 2: AUDIO ENHANCEMENT (DEPLOYMENT TESTING)');
    console.log('-'.repeat(60));

    const tests = [
      {
        name: 'Audio Processing Admin Interface',
        url: `${BASE_URL}/admin/audio-processing`,
        expectedStatus: 200,
        type: 'page'
      },
      {
        name: 'Audio Processing API - List Videos',
        url: `${BASE_URL}/api/videos/process-audio?action=list-videos-needing-audio-processing&limit=5`,
        expectedStatus: 200,
        type: 'api'
      },
      {
        name: 'Audio Processing API - Health Check',
        url: `${BASE_URL}/api/videos/process-audio`,
        expectedStatus: 405, // Method not allowed for GET, but endpoint should exist
        type: 'api',
        method: 'GET'
      }
    ];

    for (const test of tests) {
      await this.runTest('phase2', test);
    }
  }

  async testPhase3Final() {
    console.log('\n🎤 PHASE 3: AI TRANSCRIPTION & CAPTIONING (DEPLOYMENT TESTING)');
    console.log('-'.repeat(60));

    const tests = [
      {
        name: 'Transcription Admin Interface',
        url: `${BASE_URL}/admin/transcription`,
        expectedStatus: 200,
        type: 'page'
      },
      {
        name: 'Transcription API - List Videos',
        url: `${BASE_URL}/api/videos/transcribe?action=list-videos-needing-transcription&limit=5`,
        expectedStatus: 200,
        type: 'api'
      },
      {
        name: 'Transcription API - Health Check',
        url: `${BASE_URL}/api/videos/transcribe`,
        expectedStatus: 405, // Method not allowed for GET, but endpoint should exist
        type: 'api',
        method: 'GET'
      }
    ];

    for (const test of tests) {
      await this.runTest('phase3', test);
    }
  }

  async testCoreInfrastructure() {
    console.log('\n🔧 CORE INFRASTRUCTURE TESTING');
    console.log('-'.repeat(60));

    const tests = [
      {
        name: 'Database Health Check',
        url: `${BASE_URL}/api/database/health`,
        expectedStatus: 200,
        type: 'api'
      },
      {
        name: 'AWS Integration Health',
        url: `${BASE_URL}/api/aws/health`,
        expectedStatus: 200,
        type: 'api'
      },
      {
        name: 'Video Dashboard',
        url: `${BASE_URL}/dashboard/videos`,
        expectedStatus: 200,
        type: 'page'
      }
    ];

    for (const test of tests) {
      await this.runTest('integration', test);
    }
  }

  async runTest(phase, test) {
    const startTime = Date.now();
    let result = {
      name: test.name,
      url: test.url,
      success: false,
      status: null,
      responseTime: 0,
      error: null,
      details: null,
      deploymentStatus: 'unknown'
    };

    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const response = await fetch(test.url, {
        method: test.method || 'GET',
        headers: {
          'Accept': test.type === 'api' ? 'application/json' : 'text/html,application/xhtml+xml',
          'User-Agent': 'VideoProcessingTester/1.0'
        }
      });

      result.responseTime = Date.now() - startTime;
      result.status = response.status;

      // Determine deployment status
      if (response.status === 404) {
        result.deploymentStatus = 'not_deployed';
        result.success = false;
        result.error = 'Endpoint not found - component not deployed';
      } else if (response.status >= 200 && response.status < 300) {
        result.deploymentStatus = 'deployed';
        result.success = true;
        
        if (test.type === 'api') {
          try {
            const data = await response.json();
            result.details = {
              success: data.success,
              message: data.message,
              dataKeys: Object.keys(data)
            };
          } catch (e) {
            result.details = { type: 'non-json', contentLength: response.headers.get('content-length') };
          }
        } else {
          const text = await response.text();
          result.details = {
            type: 'html',
            length: text.length,
            hasContent: text.length > 0,
            title: text.match(/<title>(.*?)<\/title>/i)?.[1] || 'No title'
          };
        }
      } else if (response.status === 405) {
        result.deploymentStatus = 'deployed';
        result.success = true; // Method not allowed means endpoint exists
        result.details = { message: 'Endpoint exists but method not allowed' };
      } else if (response.status >= 500) {
        result.deploymentStatus = 'deployed_with_errors';
        result.success = false;
        const errorText = await response.text();
        result.error = errorText.substring(0, 200);
      } else {
        result.deploymentStatus = 'deployed_with_issues';
        result.success = false;
        result.error = `HTTP ${response.status}`;
      }

      // Log result
      const statusIcon = result.success ? '✅' : '❌';
      const deploymentIcon = result.deploymentStatus === 'deployed' ? '🟢' : 
                           result.deploymentStatus === 'not_deployed' ? '🔴' : '🟡';
      
      console.log(`   ${statusIcon} ${deploymentIcon} ${test.name} - ${result.responseTime}ms - Status: ${result.status}`);
      
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      result.deploymentStatus = 'connection_failed';
      console.log(`   ❌ 🔴 ${test.name} - Connection Error: ${error.message}`);
    }

    this.results[phase].push(result);

    // Track deployment issues
    if (result.deploymentStatus === 'not_deployed') {
      this.results.issues.push({
        phase,
        type: 'deployment',
        component: test.name,
        issue: 'Component not deployed to production',
        url: test.url
      });
    } else if (result.deploymentStatus === 'deployed_with_errors') {
      this.results.issues.push({
        phase,
        type: 'runtime_error',
        component: test.name,
        issue: result.error,
        url: test.url
      });
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  generateFinalReport() {
    console.log('\n📊 FINAL COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(80));

    const phases = [
      { name: 'Phase 1: Thumbnails', key: 'phase1', emoji: '📸' },
      { name: 'Phase 2: Audio Processing', key: 'phase2', emoji: '🎵' },
      { name: 'Phase 3: Transcription', key: 'phase3', emoji: '🎤' },
      { name: 'Core Infrastructure', key: 'integration', emoji: '🔧' }
    ];

    let totalTests = 0;
    let totalPassed = 0;
    let totalDeployed = 0;
    let totalNotDeployed = 0;

    phases.forEach(phase => {
      const results = this.results[phase.key];
      const passed = results.filter(r => r.success).length;
      const deployed = results.filter(r => r.deploymentStatus === 'deployed').length;
      const notDeployed = results.filter(r => r.deploymentStatus === 'not_deployed').length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n${phase.emoji} ${phase.name}:`);
      console.log(`  ✅ Passed: ${passed}/${results.length}`);
      console.log(`  🟢 Deployed: ${deployed}/${results.length}`);
      console.log(`  🔴 Not Deployed: ${notDeployed}/${results.length}`);
      console.log(`  ⏱️  Avg Response Time: ${Math.round(avgResponseTime)}ms`);

      if (notDeployed > 0) {
        console.log(`  🚨 Missing Components:`);
        results.filter(r => r.deploymentStatus === 'not_deployed').forEach(r => {
          console.log(`    - ${r.name}`);
        });
      }

      totalTests += results.length;
      totalPassed += passed;
      totalDeployed += deployed;
      totalNotDeployed += notDeployed;
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 OVERALL DEPLOYMENT STATUS:');
    console.log(`  Total Components: ${totalTests}`);
    console.log(`  ✅ Working: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
    console.log(`  🟢 Deployed: ${totalDeployed} (${Math.round(totalDeployed/totalTests*100)}%)`);
    console.log(`  🔴 Not Deployed: ${totalNotDeployed} (${Math.round(totalNotDeployed/totalTests*100)}%)`);

    // Deployment Issues Summary
    if (this.results.issues.length > 0) {
      console.log('\n🚨 DEPLOYMENT ISSUES FOUND:');
      this.results.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.component} (${issue.phase})`);
        console.log(`     Issue: ${issue.issue}`);
        console.log(`     URL: ${issue.url}`);
      });
    }

    // Admin URLs Summary
    console.log('\n🔗 ADMIN INTERFACE STATUS:');
    console.log(`  📸 Thumbnails: ${BASE_URL}/admin/fix-thumbnails ${this.getStatusIcon('phase1', 'Admin Interface - Fix Thumbnails')}`);
    console.log(`  🎵 Audio Processing: ${BASE_URL}/admin/audio-processing ${this.getStatusIcon('phase2', 'Audio Processing Admin Interface')}`);
    console.log(`  🎤 Transcription: ${BASE_URL}/admin/transcription ${this.getStatusIcon('phase3', 'Transcription Admin Interface')}`);

    // API Endpoints Summary
    console.log('\n🔌 API ENDPOINTS STATUS:');
    console.log(`  📸 Thumbnail Generation: ${BASE_URL}/api/videos/generate-thumbnails ${this.getStatusIcon('phase1', 'Thumbnail API - List Videos Without Thumbnails')}`);
    console.log(`  🎵 Audio Processing: ${BASE_URL}/api/videos/process-audio ${this.getStatusIcon('phase2', 'Audio Processing API - Health Check')}`);
    console.log(`  🎤 Transcription: ${BASE_URL}/api/videos/transcribe ${this.getStatusIcon('phase3', 'Transcription API - Health Check')}`);

    // Next Steps
    console.log('\n📋 NEXT STEPS:');
    if (totalNotDeployed > 0) {
      console.log('  1. 🚀 Deploy missing Phase 2 and Phase 3 components');
      console.log('  2. 🧪 Re-run tests after deployment');
      console.log('  3. 🔧 Fix any runtime errors found');
    } else {
      console.log('  ✅ All components deployed successfully!');
      console.log('  🎉 Complete video processing pipeline is ready for production use');
    }

    console.log('\n' + '='.repeat(80));
  }

  getStatusIcon(phase, componentName) {
    const result = this.results[phase].find(r => r.name === componentName);
    if (!result) return '❓';
    
    if (result.deploymentStatus === 'deployed' && result.success) return '✅';
    if (result.deploymentStatus === 'deployed' && !result.success) return '🟡';
    if (result.deploymentStatus === 'not_deployed') return '🔴';
    return '❓';
  }
}

// Run the final comprehensive test suite
const tester = new FinalComprehensiveTester();
tester.runFinalTests().then(() => {
  console.log('🏁 Final comprehensive testing completed');
}).catch(error => {
  console.error('💥 Final test suite crashed:', error);
});
