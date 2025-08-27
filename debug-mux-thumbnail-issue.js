#!/usr/bin/env node

// Debug Mux Thumbnail Issue
// This script helps diagnose why thumbnails aren't being added to video uploads

const https = require('https');
const crypto = require('crypto');

const WEBHOOK_URL = 'https://law-school-repository.vercel.app/api/mux/webhook';
const MUX_WEBHOOK_SECRET = 'q6ac7p1sv5fqvcs2c5oboh84mhjoctko';

console.log('🔍 Debugging Mux Thumbnail Issue');
console.log('=====================================');

async function testWebhookEndpoint() {
    console.log('\n1. Testing webhook endpoint accessibility...');
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'GET'
        });
        
        const data = await response.json();
        console.log('✅ Webhook endpoint is accessible');
        console.log('📋 Response:', data);
        
        return true;
    } catch (error) {
        console.error('❌ Webhook endpoint not accessible:', error.message);
        return false;
    }
}

async function simulateMuxWebhook() {
    console.log('\n2. Simulating Mux webhook event...');
    
    // Simulate a video.asset.ready event
    const mockEvent = {
        type: 'video.asset.ready',
        object: {
            type: 'asset',
            id: 'test-asset-id-123'
        },
        id: 'webhook-event-123',
        created_at: new Date().toISOString(),
        data: {
            passthrough: 'test-video-id-456', // This should match a video ID in your database
            status: 'ready',
            playback_ids: [{
                id: 'test-playback-id-789',
                policy: 'public'
            }],
            duration: 120.5,
            aspect_ratio: '16:9'
        }
    };
    
    const body = JSON.stringify(mockEvent);
    
    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
        .createHmac('sha256', MUX_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
    
    const muxSignature = `t=${timestamp},v1=${signature}`;
    
    console.log('📤 Sending mock webhook event...');
    console.log('🎭 Event type:', mockEvent.type);
    console.log('🆔 Video ID (passthrough):', mockEvent.data.passthrough);
    console.log('🔐 Signature:', muxSignature);
    
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'mux-signature': muxSignature
            },
            body: body
        });
        
        const responseData = await response.text();
        
        console.log('📨 Response status:', response.status);
        console.log('📋 Response body:', responseData);
        
        if (response.ok) {
            console.log('✅ Webhook processed successfully');
            return true;
        } else {
            console.error('❌ Webhook processing failed');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error sending webhook:', error.message);
        return false;
    }
}

async function checkDatabaseMigration() {
    console.log('\n3. Checking database migration status...');
    
    try {
        const response = await fetch('https://law-school-repository.vercel.app/api/database/health');
        const data = await response.json();
        
        console.log('📊 Database status:', data);
        
        if (data.connected) {
            console.log('✅ Database is connected');
            
            // Check if Mux fields exist
            if (data.tables && data.tables.includes('videos')) {
                console.log('✅ Videos table exists');
                
                // You might want to add a specific endpoint to check Mux fields
                console.log('💡 Recommendation: Check if Mux fields exist in videos table');
                console.log('   Fields to check: mux_asset_id, mux_playback_id, mux_thumbnail_url');
            }
        } else {
            console.error('❌ Database connection failed');
        }
        
    } catch (error) {
        console.error('❌ Error checking database:', error.message);
    }
}

async function checkRecentVideos() {
    console.log('\n4. Checking recent video uploads...');
    
    try {
        const response = await fetch('https://law-school-repository.vercel.app/api/videos');
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            console.log(`📹 Found ${data.videos.length} videos`);
            
            // Check the most recent video
            const recentVideo = data.videos[0];
            console.log('\n📋 Most recent video:');
            console.log('   ID:', recentVideo.id);
            console.log('   Title:', recentVideo.title);
            console.log('   Thumbnail Path:', recentVideo.thumbnailPath);
            console.log('   Status:', recentVideo.status);
            console.log('   Upload Date:', recentVideo.uploadDate);
            
            // Check if it has Mux data
            if (recentVideo.metadata) {
                console.log('   Metadata:', JSON.stringify(recentVideo.metadata, null, 2));
            }
            
            // Check thumbnail accessibility
            if (recentVideo.thumbnailPath && recentVideo.thumbnailPath.startsWith('http')) {
                console.log('\n🖼️ Testing thumbnail URL...');
                try {
                    const thumbResponse = await fetch(recentVideo.thumbnailPath, { method: 'HEAD' });
                    if (thumbResponse.ok) {
                        console.log('✅ Thumbnail URL is accessible');
                    } else {
                        console.log('❌ Thumbnail URL not accessible:', thumbResponse.status);
                    }
                } catch (error) {
                    console.log('❌ Error accessing thumbnail:', error.message);
                }
            } else {
                console.log('⚠️ No HTTP thumbnail URL found');
            }
            
        } else {
            console.log('📹 No videos found');
        }
        
    } catch (error) {
        console.error('❌ Error checking videos:', error.message);
    }
}

async function checkMuxCredentials() {
    console.log('\n5. Checking Mux configuration...');
    
    // This would require a specific endpoint to test Mux credentials
    console.log('💡 Recommendations:');
    console.log('   - Verify VIDEO_MUX_TOKEN_ID is set in Vercel');
    console.log('   - Verify VIDEO_MUX_TOKEN_SECRET is set in Vercel');
    console.log('   - Verify MUX_WEBHOOK_SECRET is set in Vercel');
    console.log('   - Check Mux dashboard for webhook delivery status');
}

async function provideTroubleshootingSteps() {
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('========================');
    
    console.log('\n1. Check Vercel Environment Variables:');
    console.log('   - VIDEO_MUX_TOKEN_ID');
    console.log('   - VIDEO_MUX_TOKEN_SECRET');
    console.log('   - MUX_WEBHOOK_SECRET');
    
    console.log('\n2. Check Mux Dashboard:');
    console.log('   - Go to https://dashboard.mux.com/');
    console.log('   - Check Settings > Webhooks');
    console.log('   - Verify webhook URL is configured');
    console.log('   - Check webhook delivery logs');
    
    console.log('\n3. Check Database Migration:');
    console.log('   - Run database migration to add Mux fields');
    console.log('   - Verify Mux columns exist in videos table');
    
    console.log('\n4. Check Video Upload Flow:');
    console.log('   - Verify Mux asset is created during upload');
    console.log('   - Check if passthrough video ID is correct');
    console.log('   - Monitor webhook delivery in Mux dashboard');
    
    console.log('\n5. Manual Testing:');
    console.log('   - Upload a test video');
    console.log('   - Check Mux dashboard for asset processing');
    console.log('   - Wait for webhook delivery');
    console.log('   - Check database for updated thumbnail URL');
}

async function main() {
    console.log('Starting Mux thumbnail debugging...\n');
    
    const endpointAccessible = await testWebhookEndpoint();
    
    if (endpointAccessible) {
        await simulateMuxWebhook();
    }
    
    await checkDatabaseMigration();
    await checkRecentVideos();
    await checkMuxCredentials();
    await provideTroubleshootingSteps();
    
    console.log('\n✅ Debugging complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check the output above for any issues');
    console.log('   2. Verify webhook is configured in Mux dashboard');
    console.log('   3. Upload a test video and monitor the process');
    console.log('   4. Check Mux dashboard webhook logs for delivery status');
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

main().catch(console.error);
