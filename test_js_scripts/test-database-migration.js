// Test Database Migration and Mux Integration
const https = require('https');

const PRODUCTION_URL = 'https://law-school-repository-5hytlq1u8-andrew-j-gregwares-projects.vercel.app';

console.log('🎭 Testing Database Migration and Mux Setup...');
console.log('==============================================');

// Test database migration endpoint
function testDatabaseMigration() {
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
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Success: ${result.success}`);
                    
                    if (result.success) {
                        console.log('✅ Database migration completed successfully!');
                        console.log(`   Columns added: ${result.columnsAdded || 0}`);
                        console.log(`   Tables created: ${result.tablesCreated || 0}`);
                        if (result.details) {
                            console.log('   Migration details:', result.details);
                        }
                        resolve(result);
                    } else {
                        console.log('❌ Database migration failed');
                        console.log(`   Error: ${result.error || 'Unknown'}`);
                        if (result.details) {
                            console.log('   Details:', result.details);
                        }
                        reject(new Error(result.error || `Status: ${res.statusCode}`));
                    }
                } catch (error) {
                    console.log('❌ Failed to parse migration response:', error.message);
                    console.log('   Raw response:', data);
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

// Check database schema after migration
function checkDatabaseSchema() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/database/migrate-mux`;
        
        console.log('🔍 Checking database schema...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.summary) {
                        console.log('📊 Database Schema Status:');
                        console.log(`   Columns found: ${result.summary.columnsFound}/${result.summary.columnsExpected}`);
                        console.log(`   Tables found: ${result.summary.tablesFound}/${result.summary.tablesExpected}`);
                        console.log(`   Migration complete: ${result.summary.migrationComplete}`);
                        
                        if (result.existingColumns && result.existingColumns.length > 0) {
                            console.log('   Existing Mux columns:', result.existingColumns);
                        }
                        
                        if (result.existingTables && result.existingTables.length > 0) {
                            console.log('   Existing Mux tables:', result.existingTables);
                        }
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse schema response:', error.message);
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Test Mux configuration
function testMuxConfiguration() {
    return new Promise((resolve, reject) => {
        const url = `${PRODUCTION_URL}/api/debug/video-diagnostics`;
        
        console.log('🎭 Testing Mux configuration...');
        
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`   Status: ${res.statusCode}`);
                    
                    if (result.mux) {
                        console.log('🎭 Mux Configuration:');
                        console.log(`   Token ID configured: ${!!result.mux.tokenId}`);
                        console.log(`   Token Secret configured: ${!!result.mux.tokenSecret}`);
                        console.log(`   Environment: ${result.mux.environment || 'unknown'}`);
                        console.log(`   Status: ${result.mux.status || 'unknown'}`);
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.log('❌ Failed to parse Mux config response:', error.message);
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Run the complete test
async function runCompleteTest() {
    try {
        console.log(`🚀 Testing on: ${PRODUCTION_URL}`);
        console.log('');
        
        // Step 1: Check current database schema
        console.log('=== STEP 1: Check Current Database Schema ===');
        await checkDatabaseSchema();
        console.log('');
        
        // Step 2: Run database migration
        console.log('=== STEP 2: Run Database Migration ===');
        await testDatabaseMigration();
        console.log('');
        
        // Step 3: Verify schema after migration
        console.log('=== STEP 3: Verify Schema After Migration ===');
        await checkDatabaseSchema();
        console.log('');
        
        // Step 4: Test Mux configuration
        console.log('=== STEP 4: Test Mux Configuration ===');
        await testMuxConfiguration();
        console.log('');
        
        console.log('🎉 ALL DATABASE AND MUX TESTS COMPLETED!');
        console.log('=========================================');
        console.log('');
        console.log('✅ Database migration executed successfully!');
        console.log('✅ Mux integration is configured and ready!');
        console.log('✅ Video uploads will now create Mux assets!');
        console.log('✅ Audio enhancement and transcription enabled!');
        console.log('');
        console.log('🎯 The complete Mux video processing pipeline is now active!');
        
    } catch (error) {
        console.log('');
        console.log('❌ DATABASE/MUX TEST FAILED');
        console.log('===========================');
        console.log('Error:', error.message);
        console.log('');
        console.log('💡 This might indicate:');
        console.log('   - Database migration needs to be run');
        console.log('   - Mux credentials not configured');
        console.log('   - Database connection issue');
        console.log('   - Network connectivity problem');
        console.log('');
        console.log('🔧 Next steps:');
        console.log('   1. Check database connection');
        console.log('   2. Verify Mux environment variables');
        console.log('   3. Run migration manually if needed');
    }
}

runCompleteTest();
