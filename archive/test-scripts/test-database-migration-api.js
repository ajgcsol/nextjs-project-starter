#!/usr/bin/env node

// Test database migration through API endpoint
// This uses the deployed API which has the correct Neon database connection

const https = require('https');

console.log('🔧 Running Mux Database Migration via API...');
console.log('===============================================');

async function runMigrationViaAPI() {
  try {
    console.log('📡 Calling database migration API endpoint...');
    
    // Make request to the migration API endpoint
    const response = await fetch('https://nextjs-project-starter-eight-psi.vercel.app/api/database/migrate-mux', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'migrate',
        force: true
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Migration API Response:', result);
      
      if (result.success) {
        console.log('🎉 Database migration completed successfully!');
        console.log('📊 Migration results:', result.results);
        
        if (result.columnsAdded) {
          console.log('📝 Columns added:', result.columnsAdded);
        }
        
        if (result.tablesCreated) {
          console.log('📋 Tables created:', result.tablesCreated);
        }
        
        console.log('');
        console.log('✅ Next steps:');
        console.log('1. Test webhook processing');
        console.log('2. Upload a test video');
        console.log('3. Verify Mux asset creation');
        
      } else {
        console.log('⚠️ Migration completed with warnings:', result.message);
        if (result.error) {
          console.log('❌ Error details:', result.error);
        }
      }
    } else {
      console.error('❌ Migration API failed:', result);
      console.error('Status:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Failed to call migration API:', error);
    
    // Fallback: Try to call the endpoint directly
    console.log('🔄 Trying alternative approach...');
    
    try {
      const fallbackResponse = await fetch('https://nextjs-project-starter-eight-psi.vercel.app/api/database/init-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const fallbackResult = await fallbackResponse.json();
      console.log('📋 Fallback schema init result:', fallbackResult);
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
  }
}

// Test webhook endpoint while we're at it
async function testWebhookEndpoint() {
  try {
    console.log('');
    console.log('🎭 Testing webhook endpoint...');
    
    const response = await fetch('https://nextjs-project-starter-eight-psi.vercel.app/api/mux/webhook', {
      method: 'GET'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is active:', result);
    } else {
      console.log('❌ Webhook endpoint issue:', result);
    }
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
  }
}

// Run the tests
async function main() {
  await runMigrationViaAPI();
  await testWebhookEndpoint();
  
  console.log('');
  console.log('🏁 Migration test complete!');
}

main().catch(console.error);
