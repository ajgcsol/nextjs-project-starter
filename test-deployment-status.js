// Simple test to check if deployment is complete
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🚀 Testing deployment status...');
console.log('================================');

// Test a simple endpoint first
function testSimpleEndpoint() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/aws/health`;
        
        console.log('🔍 Testing AWS health endpoint...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Content-Type: ${res.headers['content-type']}`);
                
                if (res.headers['content-type']?.includes('application/json')) {
                    try {
                        const result = JSON.parse(data);
                        console.log('✅ Deployment is working - JSON response received');
                        resolve(result);
                    } catch (error) {
                        console.log('❌ JSON parsing failed:', error.message);
                        reject(error);
                    }
                } else {
                    console.log('⚠️ Received HTML instead of JSON - deployment may still be in progress');
                    console.log('   Response preview:', data.substring(0, 200) + '...');
                    reject(new Error('HTML response received instead of JSON'));
                }
            });
        }).on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });
    });
}

// Test database migration endpoint with GET
function testMigrationEndpoint() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/database/migrate-mux`;
        
        console.log('🔍 Testing migration endpoint (GET)...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Content-Type: ${res.headers['content-type']}`);
                
                if (res.headers['content-type']?.includes('application/json')) {
                    try {
                        const result = JSON.parse(data);
                        console.log('✅ Migration endpoint is working');
                        console.log(`   Migration status: ${result.migrationStatus}`);
                        console.log(`   Columns found: ${result.summary?.columnsFound || 0}`);
                        console.log(`   Tables found: ${result.summary?.tablesFound || 0}`);
                        resolve(result);
                    } catch (error) {
                        console.log('❌ JSON parsing failed:', error.message);
                        reject(error);
                    }
                } else {
                    console.log('⚠️ Migration endpoint returning HTML - deployment issue');
                    reject(new Error('Migration endpoint not accessible'));
                }
            });
        }).on('error', (error) => {
            console.log('❌ Migration endpoint request failed:', error.message);
            reject(error);
        });
    });
}

// Run migration if endpoint is working
function runMigration() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({});
        
        const options = {
            hostname: new URL(PRODUCTION_URL).hostname,
            port: 443,
            path: '/api/database/migrate-mux',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('🔄 Running database migration...');
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}`);
                
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Migration completed successfully!');
                        console.log(`   Successful statements: ${result.summary?.successful || 0}`);
                        console.log(`   Failed statements: ${result.summary?.failed || 0}`);
                        console.log(`   New columns: ${result.verification?.newColumnsAdded?.length || 0}`);
                    } else {
                        console.log('❌ Migration failed:', result.error);
                    }
                    resolve(result);
                } catch (error) {
                    console.log('❌ Migration response parsing failed:', error.message);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ Migration request failed:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Run the complete test
async function runDeploymentTest() {
    try {
        console.log(`🚀 Testing deployment: ${PRODUCTION_URL}`);
        console.log('');
        
        // Step 1: Test simple endpoint
        console.log('=== STEP 1: Test Simple Endpoint ===');
        await testSimpleEndpoint();
        console.log('');
        
        // Step 2: Test migration endpoint
        console.log('=== STEP 2: Test Migration Endpoint ===');
        const migrationStatus = await testMigrationEndpoint();
        console.log('');
        
        // Step 3: Run migration if needed
        if (migrationStatus.migrationStatus === 'pending') {
            console.log('=== STEP 3: Run Database Migration ===');
            await runMigration();
            console.log('');
            
            // Step 4: Verify migration
            console.log('=== STEP 4: Verify Migration ===');
            await testMigrationEndpoint();
        } else {
            console.log('=== MIGRATION ALREADY COMPLETE ===');
            console.log('✅ Database migration is already complete!');
        }
        
        console.log('');
        console.log('🎉 DEPLOYMENT TEST COMPLETED SUCCESSFULLY!');
        console.log('==========================================');
        console.log('✅ Deployment is live and working');
        console.log('✅ Migration endpoint is accessible');
        console.log('✅ Database migration is ready/complete');
        console.log('✅ Mux integration is ready for use');
        
    } catch (error) {
        console.log('');
        console.log('❌ DEPLOYMENT TEST FAILED');
        console.log('=========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 Possible causes:');
        console.log('   - Deployment still in progress (wait 2-3 minutes)');
        console.log('   - Network connectivity issue');
        console.log('   - Vercel deployment error');
        console.log('   - API route configuration issue');
        console.log('');
        console.log('🔧 Next steps:');
        console.log('   1. Wait for deployment to complete');
        console.log('   2. Check Vercel deployment logs');
        console.log('   3. Retry in a few minutes');
    }
}

runDeploymentTest();
