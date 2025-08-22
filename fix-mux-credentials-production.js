// Fix Mux Credentials in Production - Critical Environment Variable Issue
const { execSync } = require('child_process');

console.log('🔧 FIXING MUX CREDENTIALS IN PRODUCTION');
console.log('======================================');

// Step 1: Remove existing Mux environment variables (they may have formatting issues)
console.log('🗑️  Step 1: Removing existing Mux environment variables...');

try {
    console.log('   Removing VIDEO_MUX_TOKEN_ID...');
    execSync('vercel env rm VIDEO_MUX_TOKEN_ID production', { stdio: 'inherit' });
} catch (error) {
    console.log('   ⚠️  VIDEO_MUX_TOKEN_ID not found or already removed');
}

try {
    console.log('   Removing VIDEO_MUX_TOKEN_SECRET...');
    execSync('vercel env rm VIDEO_MUX_TOKEN_SECRET production', { stdio: 'inherit' });
} catch (error) {
    console.log('   ⚠️  VIDEO_MUX_TOKEN_SECRET not found or already removed');
}

console.log('');
console.log('📝 Step 2: Adding clean Mux credentials...');
console.log('');
console.log('🔑 Please enter your Mux credentials when prompted:');
console.log('   - VIDEO_MUX_TOKEN_ID: Your Mux Token ID');
console.log('   - VIDEO_MUX_TOKEN_SECRET: Your Mux Token Secret');
console.log('');
console.log('⚠️  IMPORTANT: Make sure there are NO extra spaces, newlines, or special characters!');
console.log('');

// Step 2: Add VIDEO_MUX_TOKEN_ID
console.log('Adding VIDEO_MUX_TOKEN_ID...');
try {
    execSync('vercel env add VIDEO_MUX_TOKEN_ID production', { stdio: 'inherit' });
    console.log('✅ VIDEO_MUX_TOKEN_ID added successfully');
} catch (error) {
    console.log('❌ Failed to add VIDEO_MUX_TOKEN_ID:', error.message);
    process.exit(1);
}

console.log('');

// Step 3: Add VIDEO_MUX_TOKEN_SECRET
console.log('Adding VIDEO_MUX_TOKEN_SECRET...');
try {
    execSync('vercel env add VIDEO_MUX_TOKEN_SECRET production', { stdio: 'inherit' });
    console.log('✅ VIDEO_MUX_TOKEN_SECRET added successfully');
} catch (error) {
    console.log('❌ Failed to add VIDEO_MUX_TOKEN_SECRET:', error.message);
    process.exit(1);
}

console.log('');
console.log('🚀 Step 3: Triggering production deployment...');

try {
    execSync('vercel --prod', { stdio: 'inherit' });
    console.log('✅ Production deployment triggered successfully');
} catch (error) {
    console.log('❌ Failed to trigger deployment:', error.message);
    console.log('');
    console.log('💡 Manual deployment required:');
    console.log('   1. Go to Vercel Dashboard');
    console.log('   2. Find your project');
    console.log('   3. Click "Redeploy" on the latest deployment');
}

console.log('');
console.log('🎉 MUX CREDENTIALS FIX COMPLETED!');
console.log('=================================');
console.log('');
console.log('✅ Next Steps:');
console.log('   1. Wait for deployment to complete (2-3 minutes)');
console.log('   2. Test Mux integration with: node test-mux-production-debug.js');
console.log('   3. Verify credentials are now detected in production');
console.log('');
console.log('🔍 Expected Result:');
console.log('   - Environment Variables: { hasMuxTokenId: true, hasMuxTokenSecret: true }');
console.log('   - Mux Status: configured');
console.log('   - Asset creation should work');
