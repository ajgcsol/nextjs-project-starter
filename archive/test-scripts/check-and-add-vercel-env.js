// Check existing Vercel environment variables and add only missing ones
const { execSync } = require('child_process');

console.log('🔍 Checking existing Vercel environment variables...');
console.log('=' .repeat(50));

// Required environment variables for Mux + Neon integration
const requiredEnvVars = {
    'VIDEO_MUX_TOKEN_ID': 'c875a71a-10cd-4b6c-9dc8-9acd56f41b24',
    'VIDEO_MUX_TOKEN_SECRET': 'FLlpzeNkvVSsh+cJELfCJhPNspVpNLXeVOPvPmv/+2XAHy9kVdxNuBOqEOhEOdWJBLlHdNJJWJJ',
    'DATABASE_URL': 'postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
};

// Optional AWS variables (only add if not present)
const optionalEnvVars = {
    'AWS_ACCESS_KEY_ID': '',
    'AWS_SECRET_ACCESS_KEY': '',
    'S3_BUCKET_NAME': 'law-school-repository-content',
    'AWS_REGION': 'us-east-1'
};

async function checkAndAddEnvVars() {
    try {
        // Get existing environment variables
        console.log('📋 Fetching existing Vercel environment variables...');
        
        let existingVars = [];
        try {
            const output = execSync('vercel env ls', { encoding: 'utf8' });
            existingVars = output.split('\n')
                .filter(line => line.includes('production') || line.includes('preview') || line.includes('development'))
                .map(line => line.split(/\s+/)[0])
                .filter(name => name && name !== 'Name');
            
            console.log('✅ Found existing variables:', existingVars.length > 0 ? existingVars.join(', ') : 'None');
        } catch (error) {
            console.log('⚠️ Could not fetch existing variables (might be first time setup)');
            existingVars = [];
        }
        
        console.log('');
        console.log('🔧 Processing required environment variables...');
        
        // Check and add required variables
        for (const [varName, varValue] of Object.entries(requiredEnvVars)) {
            if (existingVars.includes(varName)) {
                console.log(`✅ ${varName}: Already exists, skipping`);
            } else {
                console.log(`➕ ${varName}: Adding to Vercel...`);
                
                try {
                    // Add to all environments (production, preview, development)
                    execSync(`echo "${varValue}" | vercel env add ${varName} production`, { stdio: 'pipe' });
                    execSync(`echo "${varValue}" | vercel env add ${varName} preview`, { stdio: 'pipe' });
                    execSync(`echo "${varValue}" | vercel env add ${varName} development`, { stdio: 'pipe' });
                    console.log(`   ✅ Added ${varName} to all environments`);
                } catch (error) {
                    console.log(`   ❌ Failed to add ${varName}: ${error.message}`);
                }
            }
        }
        
        console.log('');
        console.log('🔧 Processing optional AWS variables...');
        
        // Check and add optional AWS variables
        for (const [varName, varValue] of Object.entries(optionalEnvVars)) {
            if (existingVars.includes(varName)) {
                console.log(`✅ ${varName}: Already exists, skipping`);
            } else if (varValue) {
                console.log(`➕ ${varName}: Adding to Vercel...`);
                
                try {
                    execSync(`echo "${varValue}" | vercel env add ${varName} production`, { stdio: 'pipe' });
                    execSync(`echo "${varValue}" | vercel env add ${varName} preview`, { stdio: 'pipe' });
                    execSync(`echo "${varValue}" | vercel env add ${varName} development`, { stdio: 'pipe' });
                    console.log(`   ✅ Added ${varName} to all environments`);
                } catch (error) {
                    console.log(`   ❌ Failed to add ${varName}: ${error.message}`);
                }
            } else {
                console.log(`⏭️ ${varName}: No value provided, skipping`);
            }
        }
        
        console.log('');
        console.log('🎉 Environment variable setup complete!');
        console.log('=' .repeat(50));
        console.log('');
        console.log('📋 Summary:');
        console.log('✅ Mux Integration: VIDEO_MUX_TOKEN_ID and VIDEO_MUX_TOKEN_SECRET');
        console.log('✅ Database: DATABASE_URL (Neon PostgreSQL)');
        console.log('✅ AWS (Optional): S3 and region settings');
        console.log('');
        console.log('🚀 Ready for Vercel deployment!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: vercel --prod');
        console.log('2. Test production endpoints');
        console.log('3. Verify Mux + Neon integration in production');
        
        return true;
        
    } catch (error) {
        console.log('');
        console.log('❌ Environment setup failed');
        console.log('=' .repeat(50));
        console.error('Error:', error.message);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('- Make sure you are logged into Vercel: vercel login');
        console.log('- Ensure you are in the correct project directory');
        console.log('- Check that vercel CLI is installed: npm i -g vercel');
        
        return false;
    }
}

checkAndAddEnvVars().then(success => {
    process.exit(success ? 0 : 1);
});
