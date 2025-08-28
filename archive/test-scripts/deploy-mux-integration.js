// Deploy Mux Integration to Vercel
const { execSync } = require('child_process');

console.log('🚀 Deploying Mux Integration to Vercel...');

try {
    // First, try to deploy directly
    console.log('📦 Attempting direct deployment...');
    const deployResult = execSync('vercel --prod --yes', { 
        encoding: 'utf8',
        stdio: 'inherit'
    });
    
    console.log('✅ Deployment successful!');
    
    // Get the deployment URL
    const urlResult = execSync('vercel --prod --yes', { encoding: 'utf8' });
    const deploymentUrl = urlResult.trim();
    
    console.log(`🌐 Deployment URL: ${deploymentUrl}`);
    
    // Test the deployment
    console.log('🧪 Testing deployment...');
    
    const testUrl = `${deploymentUrl}/api/debug/video-diagnostics`;
    console.log(`Testing: ${testUrl}`);
    
    // Use curl to test the endpoint
    try {
        const testResult = execSync(`curl -s "${testUrl}"`, { encoding: 'utf8' });
        const response = JSON.parse(testResult);
        
        console.log('📊 Deployment Test Results:');
        console.log(`   Environment: ${response.system?.environment}`);
        console.log(`   AWS Credentials: ${response.aws?.hasCredentials ? '✅' : '❌'}`);
        console.log(`   Mux Token ID: ${response.mux?.tokenId ? '✅' : '❌'}`);
        console.log(`   Mux Token Secret: ${response.mux?.tokenSecret ? '✅' : '❌'}`);
        console.log(`   Database: ${response.database?.status}`);
        
        if (response.mux?.tokenId && response.mux?.tokenSecret) {
            console.log('🎉 Mux credentials are properly configured!');
        } else {
            console.log('⚠️  Mux credentials need to be added to Vercel');
        }
        
    } catch (testError) {
        console.log('❌ Deployment test failed:', testError.message);
    }
    
} catch (error) {
    console.log('❌ Deployment failed:', error.message);
    
    // Try alternative deployment method
    console.log('🔄 Trying alternative deployment...');
    try {
        execSync('vercel deploy --prod', { stdio: 'inherit' });
        console.log('✅ Alternative deployment successful!');
    } catch (altError) {
        console.log('❌ Alternative deployment also failed:', altError.message);
        console.log('');
        console.log('💡 Manual steps needed:');
        console.log('1. Run: vercel login');
        console.log('2. Run: vercel link');
        console.log('3. Run: vercel deploy --prod');
        console.log('4. Add Mux environment variables in Vercel dashboard');
    }
}
