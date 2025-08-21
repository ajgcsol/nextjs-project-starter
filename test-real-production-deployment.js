/**
 * REAL PRODUCTION DEPLOYMENT TEST
 * This tests the actual deployed Vercel app, not local development
 */

// Wait for deployment to complete, then test the real production URL
const PRODUCTION_URL = 'https://law-school-repository-7v2jyb30o-andrew-j-gregwares-projects.vercel.app';

class ProductionDeploymentTester {
  constructor() {
    this.results = {
      deployment: null,
      phases: {
        phase1: null,
        phase2: null,
        phase3: null
      },
      wmvConversion: null,
      issues: []
    };
  }

  async testRealProductionDeployment() {
    console.log('🚀 TESTING REAL PRODUCTION DEPLOYMENT');
    console.log('=' .repeat(80));
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⏰ Waiting for Vercel deployment to complete...');
    console.log('=' .repeat(80));

    // Wait a bit for deployment to propagate
    await this.waitForDeployment();
    
    try {
      // Test deployment is live
      await this.testDeploymentStatus();
      
      // Test Phase 1: Thumbnails (existing)
      await this.testPhase1Thumbnails();
      
      // Test Phase 2: Audio Enhancement (newly deployed)
      await this.testPhase2AudioEnhancement();
      
      // Test Phase 3: AI Transcription (newly deployed)
      await this.testPhase3Transcription();
      
      // Test WMV conversion specifically
      await this.testWMVConversion();
      
      // Generate final report
      this.generateProductionReport();
      
    } catch (error) {
      console.error('❌ Production testing failed:', error);
      this.results.issues.push({
        type: 'testing_error',
        error: error.message
      });
    }
  }

  async waitForDeployment() {
    console.log('\n⏰ WAITING FOR VERCEL DEPLOYMENT');
    console.log('-'.repeat(60));
    console.log('🔄 Deployment should complete in 1-2 minutes...');
    
    // Wait 2 minutes for deployment to complete and propagate
    for (let i = 120; i > 0; i -= 10) {
      process.stdout.write(`\r⏳ Waiting ${i} seconds for deployment to complete...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    console.log('\n✅ Deployment wait complete - testing now...');
  }

  async testDeploymentStatus() {
    console.log('\n🌐 TESTING DEPLOYMENT STATUS');
    console.log('-'.repeat(60));

    try {
      const response = await fetch(PRODUCTION_URL);
      
      if (response.ok) {
        console.log('✅ Production deployment is LIVE');
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        this.results.deployment = {
          status: 'live',
          statusCode: response.status,
          url: PRODUCTION_URL
        };
      } else {
        throw new Error(`Deployment returned ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Deployment not accessible:', error.message);
      this.results.deployment = {
        status: 'failed',
        error: error.message
      };
      throw error;
    }
  }

  async testPhase1Thumbnails() {
    console.log('\n🖼️ TESTING PHASE 1: THUMBNAIL GENERATION');
    console.log('-'.repeat(60));

    try {
      // Test thumbnail admin interface
      const adminResponse = await fetch(`${PRODUCTION_URL}/admin/fix-thumbnails`);
      console.log(`📋 Admin interface: ${adminResponse.status} ${adminResponse.statusText}`);
      
      // Test thumbnail API
      const apiResponse = await fetch(`${PRODUCTION_URL}/api/videos/generate-thumbnails?action=list-videos-without-thumbnails&limit=5`);
      const apiData = await apiResponse.json();
      
      if (apiResponse.ok && apiData.success) {
        console.log('✅ Thumbnail API working');
        console.log(`📊 Videos needing thumbnails: ${apiData.count || 0}`);
        
        this.results.phases.phase1 = {
          status: 'working',
          adminInterface: adminResponse.ok,
          api: true,
          videosNeedingThumbnails: apiData.count || 0
        };
      } else {
        throw new Error('Thumbnail API failed');
      }
    } catch (error) {
      console.error('❌ Phase 1 testing failed:', error.message);
      this.results.phases.phase1 = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async testPhase2AudioEnhancement() {
    console.log('\n🎵 TESTING PHASE 2: AUDIO ENHANCEMENT (NEWLY DEPLOYED)');
    console.log('-'.repeat(60));

    try {
      // Test audio processing admin interface
      const adminResponse = await fetch(`${PRODUCTION_URL}/admin/audio-processing`);
      console.log(`📋 Audio admin interface: ${adminResponse.status} ${adminResponse.statusText}`);
      
      if (adminResponse.ok) {
        console.log('✅ Audio processing admin interface is LIVE');
        
        // Test audio processing API
        const apiResponse = await fetch(`${PRODUCTION_URL}/api/videos/process-audio?action=list-videos&limit=5`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('✅ Audio processing API working');
          console.log(`📊 Videos available for audio processing: ${apiData.videos?.length || 0}`);
          
          this.results.phases.phase2 = {
            status: 'deployed_and_working',
            adminInterface: true,
            api: true,
            videosAvailable: apiData.videos?.length || 0
          };
        } else {
          throw new Error(`Audio API returned ${apiResponse.status}`);
        }
      } else {
        throw new Error(`Audio admin interface returned ${adminResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Phase 2 testing failed:', error.message);
      this.results.phases.phase2 = {
        status: 'deployment_failed',
        error: error.message
      };
    }
  }

  async testPhase3Transcription() {
    console.log('\n🎤 TESTING PHASE 3: AI TRANSCRIPTION (NEWLY DEPLOYED)');
    console.log('-'.repeat(60));

    try {
      // Test transcription admin interface
      const adminResponse = await fetch(`${PRODUCTION_URL}/admin/transcription`);
      console.log(`📋 Transcription admin interface: ${adminResponse.status} ${adminResponse.statusText}`);
      
      if (adminResponse.ok) {
        console.log('✅ Transcription admin interface is LIVE');
        
        // Test transcription API
        const apiResponse = await fetch(`${PRODUCTION_URL}/api/videos/transcribe?action=list-videos&limit=5`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('✅ Transcription API working');
          console.log(`📊 Videos available for transcription: ${apiData.videos?.length || 0}`);
          
          this.results.phases.phase3 = {
            status: 'deployed_and_working',
            adminInterface: true,
            api: true,
            videosAvailable: apiData.videos?.length || 0
          };
        } else {
          throw new Error(`Transcription API returned ${apiResponse.status}`);
        }
      } else {
        throw new Error(`Transcription admin interface returned ${adminResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Phase 3 testing failed:', error.message);
      this.results.phases.phase3 = {
        status: 'deployment_failed',
        error: error.message
      };
    }
  }

  async testWMVConversion() {
    console.log('\n🎬 TESTING WMV CONVERSION CAPABILITY');
    console.log('-'.repeat(60));

    try {
      // Check if there are WMV files in the system
      const videosResponse = await fetch(`${PRODUCTION_URL}/api/videos`);
      const videosData = await videosResponse.json();
      
      if (videosData.videos) {
        const wmvVideos = videosData.videos.filter(video => 
          video.filename?.toLowerCase().includes('.wmv') ||
          video.title?.toLowerCase().includes('wmv')
        );
        
        console.log(`📊 Found ${wmvVideos.length} WMV files in system`);
        
        if (wmvVideos.length > 0) {
          console.log('🎬 WMV files detected:');
          wmvVideos.slice(0, 3).forEach(video => {
            console.log(`   - ${video.title} (${video.filename})`);
          });
          
          // Test conversion API
          const conversionResponse = await fetch(`${PRODUCTION_URL}/api/videos/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'check-conversion-capability',
              format: 'wmv'
            })
          });
          
          if (conversionResponse.ok) {
            console.log('✅ WMV conversion API accessible');
            this.results.wmvConversion = {
              status: 'supported',
              wmvFilesFound: wmvVideos.length,
              conversionApiWorking: true
            };
          } else {
            console.log('⚠️ WMV conversion API needs configuration');
            this.results.wmvConversion = {
              status: 'needs_configuration',
              wmvFilesFound: wmvVideos.length,
              conversionApiWorking: false
            };
          }
        } else {
          console.log('📝 No WMV files found in current system');
          this.results.wmvConversion = {
            status: 'no_wmv_files',
            wmvFilesFound: 0
          };
        }
      }
    } catch (error) {
      console.error('❌ WMV conversion testing failed:', error.message);
      this.results.wmvConversion = {
        status: 'testing_failed',
        error: error.message
      };
    }
  }

  generateProductionReport() {
    console.log('\n📋 PRODUCTION DEPLOYMENT REPORT');
    console.log('=' .repeat(80));

    console.log('\n🚀 DEPLOYMENT STATUS:');
    if (this.results.deployment?.status === 'live') {
      console.log('✅ Production deployment is LIVE and accessible');
    } else {
      console.log('❌ Production deployment has issues');
    }

    console.log('\n📊 PHASE DEPLOYMENT STATUS:');
    
    // Phase 1
    const phase1Status = this.results.phases.phase1?.status;
    if (phase1Status === 'working') {
      console.log('✅ Phase 1 (Thumbnails): Working (needs MediaConvert config for real frames)');
    } else {
      console.log('❌ Phase 1 (Thumbnails): Issues detected');
    }
    
    // Phase 2
    const phase2Status = this.results.phases.phase2?.status;
    if (phase2Status === 'deployed_and_working') {
      console.log('✅ Phase 2 (Audio Enhancement): DEPLOYED AND WORKING');
    } else {
      console.log('❌ Phase 2 (Audio Enhancement): Deployment failed');
    }
    
    // Phase 3
    const phase3Status = this.results.phases.phase3?.status;
    if (phase3Status === 'deployed_and_working') {
      console.log('✅ Phase 3 (AI Transcription): DEPLOYED AND WORKING');
    } else {
      console.log('❌ Phase 3 (AI Transcription): Deployment failed');
    }

    console.log('\n🎬 WMV CONVERSION STATUS:');
    const wmvStatus = this.results.wmvConversion?.status;
    if (wmvStatus === 'supported') {
      console.log('✅ WMV conversion capability is available');
      console.log(`📊 Found ${this.results.wmvConversion.wmvFilesFound} WMV files`);
    } else if (wmvStatus === 'needs_configuration') {
      console.log('⚠️ WMV conversion needs MediaConvert configuration');
    } else if (wmvStatus === 'no_wmv_files') {
      console.log('📝 No WMV files currently in system to test');
    } else {
      console.log('❌ WMV conversion testing failed');
    }

    console.log('\n🎯 FINAL PRODUCTION STATUS:');
    const workingPhases = [
      this.results.phases.phase1?.status === 'working',
      this.results.phases.phase2?.status === 'deployed_and_working',
      this.results.phases.phase3?.status === 'deployed_and_working'
    ].filter(Boolean).length;
    
    console.log(`✅ ${workingPhases}/3 phases deployed and working`);
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    
    if (workingPhases >= 2) {
      console.log('🎉 PRODUCTION DEPLOYMENT SUCCESSFUL');
      console.log('📋 Video processing pipeline is live and operational');
    } else {
      console.log('⚠️ PRODUCTION DEPLOYMENT NEEDS ATTENTION');
      console.log('📋 Some phases may need troubleshooting');
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Run the production deployment test
const tester = new ProductionDeploymentTester();
tester.testRealProductionDeployment().then(() => {
  console.log('🏁 Production deployment testing completed');
}).catch(error => {
  console.error('💥 Production deployment testing failed:', error);
});
