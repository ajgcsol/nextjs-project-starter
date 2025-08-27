/**
 * Comprehensive Video Processing Pipeline Test
 * Tests all three phases: Thumbnails, Audio Enhancement, and Transcription
 */

const BASE_URL = 'https://nextjs-project-starter-git-blackboxai-video-processing-agregwares-projects.vercel.app';

class VideoProcessingTester {
  constructor() {
    this.results = {
      phase1: { thumbnails: [] },
      phase2: { audioProcessing: [] },
      phase3: { transcription: [] },
      integration: { pipeline: [] }
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Video Processing Pipeline Tests');
    console.log('=' .repeat(80));

    try {
      // Phase 1: Thumbnail Generation
      await this.testPhase1Thumbnails();
      
      // Phase 2: Audio Enhancement
      await this.testPhase2AudioProcessing();
      
      // Phase 3: AI Transcription & Captioning
      await this.testPhase3Transcription();
      
      // Integration Tests
      await this.testIntegratedPipeline();
      
      // Generate final report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testPhase1Thumbnails() {
    console.log('\n📸 PHASE 1: THUMBNAIL GENERATION TESTS');
    console.log('-'.repeat(50));

    const tests = [
      {
        name: 'Admin Interface Load',
        url: `${BASE_URL}/admin/fix-thumbnails`,
        test: 'page_load'
      },
      {
        name: 'Thumbnail API - List Videos',
        url: `${BASE_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`,
        test: 'api_call'
      },
      {
        name: 'Thumbnail Generation - Single Video',
        url: `${BASE_URL}/api/videos/generate-thumbnails`,
        test: 'post_request',
        body: { batchMode: false, videoId: 'test-video-id' }
      },
      {
        name: 'Thumbnail Batch Processing',
        url: `${BASE_URL}/api/videos/generate-thumbnails`,
        test: 'post_request',
        body: { batchMode: true, limit: 3 }
      }
    ];

    for (const test of tests) {
      await this.runTest('phase1', test);
    }
  }

  async testPhase2AudioProcessing() {
    console.log('\n🎵 PHASE 2: AUDIO ENHANCEMENT TESTS');
    console.log('-'.repeat(50));

    const tests = [
      {
        name: 'Audio Processing Admin Interface',
        url: `${BASE_URL}/admin/audio-processing`,
        test: 'page_load'
      },
      {
        name: 'Audio Processing API - List Videos',
        url: `${BASE_URL}/api/videos/process-audio?action=list-videos-needing-audio-processing&limit=5`,
        test: 'api_call'
      },
      {
        name: 'Audio Enhancement - Single Video',
        url: `${BASE_URL}/api/videos/process-audio`,
        test: 'post_request',
        body: {
          videoId: 'test-video-id',
          options: {
            noiseReduction: true,
            feedbackRemoval: true,
            audioNormalization: true,
            enhanceVoice: true,
            outputFormat: 'mp3'
          }
        }
      },
      {
        name: 'Audio Batch Processing',
        url: `${BASE_URL}/api/videos/process-audio`,
        test: 'post_request',
        body: {
          batchMode: true,
          videoIds: ['test-1', 'test-2'],
          options: {
            noiseReduction: true,
            feedbackRemoval: true
          }
        }
      }
    ];

    for (const test of tests) {
      await this.runTest('phase2', test);
    }
  }

  async testPhase3Transcription() {
    console.log('\n🎤 PHASE 3: AI TRANSCRIPTION & CAPTIONING TESTS');
    console.log('-'.repeat(50));

    const tests = [
      {
        name: 'Transcription Admin Interface',
        url: `${BASE_URL}/admin/transcription`,
        test: 'page_load'
      },
      {
        name: 'Transcription API - List Videos',
        url: `${BASE_URL}/api/videos/transcribe?action=list-videos-needing-transcription&limit=5`,
        test: 'api_call'
      },
      {
        name: 'AI Transcription - Single Video',
        url: `${BASE_URL}/api/videos/transcribe`,
        test: 'post_request',
        body: {
          videoId: 'test-video-id',
          options: {
            language: 'en-US',
            enableSpeakerLabels: true,
            maxSpeakers: 4,
            enableAutomaticPunctuation: true,
            enableWordTimestamps: true,
            confidenceThreshold: 0.8,
            customVocabulary: ['constitutional', 'jurisprudence']
          }
        }
      },
      {
        name: 'Caption Generation',
        url: `${BASE_URL}/api/videos/transcribe?action=get-captions&videoId=test-video-id`,
        test: 'api_call'
      },
      {
        name: 'Transcript Download',
        url: `${BASE_URL}/api/videos/transcribe?action=get-transcript&videoId=test-video-id&format=txt`,
        test: 'api_call'
      }
    ];

    for (const test of tests) {
      await this.runTest('phase3', test);
    }
  }

  async testIntegratedPipeline() {
    console.log('\n🔄 INTEGRATION TESTS: COMPLETE PIPELINE');
    console.log('-'.repeat(50));

    const tests = [
      {
        name: 'Video Player with Captions Component',
        url: `${BASE_URL}/dashboard/videos`,
        test: 'page_load'
      },
      {
        name: 'Video Streaming with CORS Fix',
        url: `${BASE_URL}/api/videos/stream/test-video-id`,
        test: 'api_call'
      },
      {
        name: 'Database Health Check',
        url: `${BASE_URL}/api/database/health`,
        test: 'api_call'
      },
      {
        name: 'AWS Integration Health',
        url: `${BASE_URL}/api/aws/health`,
        test: 'api_call'
      },
      {
        name: 'Complete Video Processing Status',
        url: `${BASE_URL}/api/videos/route`,
        test: 'api_call'
      }
    ];

    for (const test of tests) {
      await this.runTest('integration', test);
    }
  }

  async runTest(phase, testConfig) {
    const startTime = Date.now();
    let result = {
      name: testConfig.name,
      url: testConfig.url,
      success: false,
      responseTime: 0,
      status: null,
      error: null,
      details: null
    };

    try {
      console.log(`🧪 Testing: ${testConfig.name}`);
      
      let response;
      
      switch (testConfig.test) {
        case 'page_load':
          response = await fetch(testConfig.url, {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          break;
          
        case 'api_call':
          response = await fetch(testConfig.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          break;
          
        case 'post_request':
          response = await fetch(testConfig.url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(testConfig.body)
          });
          break;
      }

      result.responseTime = Date.now() - startTime;
      result.status = response.status;
      result.success = response.ok;

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          result.details = {
            type: 'json',
            success: data.success,
            message: data.message,
            dataKeys: Object.keys(data)
          };
        } else {
          const text = await response.text();
          result.details = {
            type: 'html',
            length: text.length,
            hasContent: text.length > 0
          };
        }
        
        console.log(`   ✅ ${testConfig.name} - ${result.responseTime}ms`);
      } else {
        const errorText = await response.text();
        result.error = errorText.substring(0, 200);
        console.log(`   ❌ ${testConfig.name} - Status: ${response.status}`);
      }

    } catch (error) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      console.log(`   ❌ ${testConfig.name} - Error: ${error.message}`);
    }

    // Store result in appropriate phase
    if (phase === 'phase1') {
      this.results.phase1.thumbnails.push(result);
    } else if (phase === 'phase2') {
      this.results.phase2.audioProcessing.push(result);
    } else if (phase === 'phase3') {
      this.results.phase3.transcription.push(result);
    } else if (phase === 'integration') {
      this.results.integration.pipeline.push(result);
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  generateFinalReport() {
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(80));

    const phases = [
      { name: 'Phase 1: Thumbnails', key: 'phase1', subkey: 'thumbnails' },
      { name: 'Phase 2: Audio Processing', key: 'phase2', subkey: 'audioProcessing' },
      { name: 'Phase 3: Transcription', key: 'phase3', subkey: 'transcription' },
      { name: 'Integration Tests', key: 'integration', subkey: 'pipeline' }
    ];

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    phases.forEach(phase => {
      const results = this.results[phase.key][phase.subkey];
      const passed = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n${phase.name}:`);
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  ⏱️  Avg Response Time: ${Math.round(avgResponseTime)}ms`);

      if (failed > 0) {
        console.log(`  🔍 Failed Tests:`);
        results.filter(r => !r.success).forEach(r => {
          console.log(`    - ${r.name}: ${r.error || `Status ${r.status}`}`);
        });
      }

      totalTests += results.length;
      totalPassed += passed;
      totalFailed += failed;
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 OVERALL SUMMARY:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ✅ Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
    console.log(`  ❌ Failed: ${totalFailed} (${Math.round(totalFailed/totalTests*100)}%)`);

    // Admin URLs Summary
    console.log('\n🔗 ADMIN INTERFACE URLS:');
    console.log(`  📸 Thumbnails: ${BASE_URL}/admin/fix-thumbnails`);
    console.log(`  🎵 Audio Processing: ${BASE_URL}/admin/audio-processing`);
    console.log(`  🎤 Transcription: ${BASE_URL}/admin/transcription`);
    console.log(`  📹 Video Management: ${BASE_URL}/dashboard/videos`);

    // API Endpoints Summary
    console.log('\n🔌 KEY API ENDPOINTS:');
    console.log(`  📸 Thumbnail Generation: ${BASE_URL}/api/videos/generate-thumbnails`);
    console.log(`  🎵 Audio Processing: ${BASE_URL}/api/videos/process-audio`);
    console.log(`  🎤 Transcription: ${BASE_URL}/api/videos/transcribe`);
    console.log(`  📹 Video Streaming: ${BASE_URL}/api/videos/stream/[id]`);

    if (totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Complete video processing pipeline is working correctly.');
    } else {
      console.log(`\n⚠️  ${totalFailed} tests failed. Review the errors above for issues to address.`);
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run the comprehensive test suite
const tester = new VideoProcessingTester();
tester.runAllTests().then(() => {
  console.log('🏁 Test suite completed');
}).catch(error => {
  console.error('💥 Test suite crashed:', error);
});
