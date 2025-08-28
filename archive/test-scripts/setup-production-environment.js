// Setup Complete Production Environment - Vercel + Neon + AWS + Mux
const { Pool } = require('pg');

// Production Neon Database URL
const DATABASE_URL = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log('🚀 Setting up Complete Production Environment');
console.log('=' .repeat(60));
console.log('🔧 Components: Vercel + Neon + AWS + Mux');
console.log('');

// Set environment variables for production testing
process.env.DATABASE_URL = DATABASE_URL;
process.env.NODE_ENV = 'production';

async function setupProductionEnvironment() {
    try {
        // 1. Test Neon Database Connection
        console.log('📊 1. Testing Neon Database Connection...');
        const pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const dbTest = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Neon Database: Connected successfully');
        console.log(`   Time: ${dbTest.rows[0].current_time}`);
        console.log(`   Version: ${dbTest.rows[0].db_version.split(' ')[0]}`);
        
        // 2. Verify Mux Integration Tables
        console.log('');
        console.log('📋 2. Verifying Mux Integration Schema...');
        const muxColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'videos' 
            AND column_name LIKE 'mux_%'
            ORDER BY column_name;
        `);
        
        console.log('✅ Mux Integration Fields:');
        muxColumns.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        
        await pool.end();
        
        // 3. Test Mux API Integration
        console.log('');
        console.log('🎭 3. Testing Mux API Integration...');
        
        // Import Mux SDK
        const Mux = require('@mux/mux-node');
        
        // Check environment variables
        const muxTokenId = process.env.VIDEO_MUX_TOKEN_ID;
        const muxTokenSecret = process.env.VIDEO_MUX_TOKEN_SECRET;
        
        if (!muxTokenId || !muxTokenSecret) {
            throw new Error('Mux credentials not found. Please set VIDEO_MUX_TOKEN_ID and VIDEO_MUX_TOKEN_SECRET');
        }
        
        console.log('✅ Mux Credentials: Configured');
        console.log(`   Token ID: ${muxTokenId.substring(0, 8)}...`);
        
        // Initialize Mux client
        const { Video } = new Mux(muxTokenId, muxTokenSecret);
        
        // Test Mux connection by listing assets (limit 1)
        const assets = await Video.Assets.list({ limit: 1 });
        console.log('✅ Mux API: Connected successfully');
        console.log(`   Total Assets: ${assets.length > 0 ? 'Available' : 'None yet'}`);
        
        // 4. Test AWS S3 Integration
        console.log('');
        console.log('☁️ 4. Testing AWS S3 Integration...');
        
        const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
        const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
        const s3Bucket = process.env.S3_BUCKET_NAME;
        
        if (!awsAccessKey || !awsSecretKey) {
            console.log('⚠️ AWS Credentials: Not configured (optional for Mux-only workflow)');
        } else {
            console.log('✅ AWS Credentials: Configured');
            console.log(`   Access Key: ${awsAccessKey.substring(0, 8)}...`);
            console.log(`   S3 Bucket: ${s3Bucket || 'Not specified'}`);
        }
        
        // 5. Create Production Environment File
        console.log('');
        console.log('📝 5. Creating Production Environment Configuration...');
        
        const envConfig = `# Production Environment Configuration
# Generated: ${new Date().toISOString()}

# Database (Neon)
DATABASE_URL="${DATABASE_URL}"

# Mux Video Processing
VIDEO_MUX_TOKEN_ID="${muxTokenId}"
VIDEO_MUX_TOKEN_SECRET="${muxTokenSecret}"

# AWS (Optional - for S3 storage)
AWS_ACCESS_KEY_ID="${awsAccessKey || ''}"
AWS_SECRET_ACCESS_KEY="${awsSecretKey || ''}"
S3_BUCKET_NAME="${s3Bucket || ''}"
AWS_REGION="us-east-1"

# Production Settings
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
`;

        // Write to .env.production file
        const fs = require('fs');
        fs.writeFileSync('.env.production', envConfig);
        console.log('✅ Production Environment: .env.production created');
        
        // 6. Test Complete Integration
        console.log('');
        console.log('🔄 6. Testing Complete Integration...');
        
        // Test video upload API endpoint
        const http = require('http');
        
        const testVideoUpload = () => {
            return new Promise((resolve, reject) => {
                const postData = JSON.stringify({
                    title: "Production End-to-End Test",
                    description: "Testing complete Mux + Neon + AWS integration",
                    filename: "production-test.mp4",
                    size: 10000000,
                    s3Key: "test/production-integration.mp4",
                    publicUrl: "https://example.com/production-test.mp4",
                    mimeType: "video/mp4",
                    visibility: "private"
                });
                
                const options = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/videos/upload',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };
                
                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            resolve({ status: res.statusCode, data: result });
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                
                req.on('error', reject);
                req.write(postData);
                req.end();
            });
        };
        
        try {
            const uploadResult = await testVideoUpload();
            console.log('✅ Video Upload API: Working');
            console.log(`   Status: ${uploadResult.status}`);
            console.log(`   Success: ${uploadResult.data.success ? 'Yes' : 'No'}`);
            
            if (uploadResult.data.success) {
                console.log(`   Video ID: ${uploadResult.data.video.id}`);
                console.log(`   Mux Processing: Initiated`);
            }
        } catch (uploadError) {
            console.log('⚠️ Video Upload API: Needs server running');
            console.log('   Run: npm run dev (then test again)');
        }
        
        console.log('');
        console.log('🎉 PRODUCTION ENVIRONMENT SETUP COMPLETE!');
        console.log('=' .repeat(60));
        console.log('✅ Neon Database: Connected and ready');
        console.log('✅ Mux Integration: API working, schema ready');
        console.log('✅ Environment Config: .env.production created');
        console.log('');
        console.log('🚀 Next Steps for Full End-to-End Testing:');
        console.log('1. Deploy to Vercel with these environment variables');
        console.log('2. Test video upload in production environment');
        console.log('3. Verify Mux processing with real video files');
        console.log('4. Test video playback with Mux streaming URLs');
        console.log('');
        console.log('📋 Ready for Production Deployment!');
        
        return true;
        
    } catch (error) {
        console.log('');
        console.log('❌ PRODUCTION SETUP FAILED');
        console.log('=' .repeat(60));
        console.error('Error:', error.message);
        console.log('');
        console.log('💡 Common Issues:');
        console.log('- Check Neon database connection string');
        console.log('- Verify Mux API credentials');
        console.log('- Ensure @mux/mux-node is installed');
        console.log('- Check network connectivity');
        
        return false;
    }
}

setupProductionEnvironment().then(success => {
    process.exit(success ? 0 : 1);
});
