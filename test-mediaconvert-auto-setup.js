const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-7v2jyb30o-andrew-j-gregwares-projects.vercel.app';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.method === 'POST' && options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testMediaConvertSetup() {
  console.log('🔧 MEDIACONVERT AUTO-SETUP TEST');
  console.log('=====================================');
  console.log(`🌐 Testing: ${PRODUCTION_URL}`);
  console.log('');

  try {
    // Test MediaConvert setup status
    console.log('📋 Step 1: Checking MediaConvert configuration...');
    const setupUrl = `${PRODUCTION_URL}/api/mediaconvert/setup`;
    const setupResult = await makeRequest(setupUrl);
    
    console.log(`📊 Status: ${setupResult.status}`);
    
    if (setupResult.status === 200 && setupResult.data.success) {
      console.log('✅ MediaConvert is already configured and working!');
      console.log('📋 Configuration:');
      console.log(`   - Endpoint: ${setupResult.data.configuration.endpoint}`);
      console.log(`   - Role ARN: ${setupResult.data.configuration.roleArn}`);
      console.log(`   - Auto-discovered: ${setupResult.data.configuration.autoDiscovered}`);
      console.log('');
      console.log('🎉 RESULT: MediaConvert is ready! Real thumbnails and WMV conversion are working.');
      return;
    }
    
    if (setupResult.data && !setupResult.data.success) {
      console.log('⚠️ MediaConvert setup incomplete');
      console.log('📋 Current status:');
      console.log(`   - Role ARN: ${setupResult.data.current?.roleArn || 'NOT SET'}`);
      console.log(`   - Endpoint: ${setupResult.data.current?.endpoint || 'NOT SET'}`);
      
      if (setupResult.data.current?.autoDiscoveredEndpoint) {
        console.log(`   - Auto-discovered endpoint: ${setupResult.data.current.autoDiscoveredEndpoint}`);
      }
      
      console.log('');
      console.log('🔧 SETUP INSTRUCTIONS:');
      
      if (setupResult.data.instructions) {
        setupResult.data.instructions.forEach((instruction, index) => {
          console.log(`${index + 1}. ${instruction.title}`);
          console.log(`   ${instruction.description}`);
          if (instruction.url) {
            console.log(`   URL: ${instruction.url}`);
          }
          console.log('');
        });
      }
      
      if (setupResult.data.vercelSetup) {
        console.log('📝 VERCEL ENVIRONMENT VARIABLES TO ADD:');
        setupResult.data.vercelSetup.variables.forEach(variable => {
          console.log(`   ${variable.name}=${variable.value}`);
          console.log(`   (${variable.description})`);
          console.log('');
        });
      }
      
      console.log('🎯 NEXT STEPS:');
      console.log('1. Create the MediaConvert IAM role in AWS');
      console.log('2. Add the MEDIACONVERT_ROLE_ARN to Vercel environment variables');
      console.log('3. Redeploy your application');
      console.log('4. Run this test again to verify');
    }
    
    // Try to discover endpoint anyway
    console.log('');
    console.log('📋 Step 2: Attempting endpoint auto-discovery...');
    
    try {
      const discoverResult = await makeRequest(setupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'discover-endpoint' })
      });
      
      if (discoverResult.status === 200 && discoverResult.data.success) {
        console.log('✅ Endpoint auto-discovery successful!');
        console.log(`📍 Discovered endpoint: ${discoverResult.data.endpoint}`);
        console.log('');
        console.log('💡 Good news: You don\'t need to manually find the endpoint!');
        console.log('   The system can auto-discover it when you add the role ARN.');
      } else {
        console.log('❌ Endpoint auto-discovery failed');
        console.log(`   Error: ${discoverResult.data?.message || 'Unknown error'}`);
      }
    } catch (discoverError) {
      console.log('❌ Endpoint discovery failed:', discoverError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('');
  console.log('=====================================');
  console.log('🏁 MediaConvert setup test completed');
}

// Run the test
testMediaConvertSetup().catch(console.error);
