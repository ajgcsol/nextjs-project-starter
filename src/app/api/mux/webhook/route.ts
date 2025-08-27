import { NextRequest, NextResponse } from 'next/server';
import { MuxWebhookHandler, type MuxWebhookPayload } from '@/lib/mux-webhook-handler';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute timeout for webhook processing

export async function POST(request: NextRequest) {
  console.log('🔔 Mux webhook received');
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('mux-signature');
    const timestamp = request.headers.get('mux-timestamp') || Math.floor(Date.now() / 1000).toString();

    console.log('📋 Webhook headers:', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      bodyLength: rawBody.length
    });

    // Verify webhook signature if signature is provided
    if (signature) {
      const isValidSignature = MuxWebhookHandler.verifyWebhookSignature(
        rawBody,
        signature,
        timestamp
      );

      if (!isValidSignature) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    } else {
      console.log('⚠️ No signature provided - webhook verification skipped (development mode)');
    }

    // Parse webhook payload
    let payload: MuxWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('📦 Webhook payload:', {
      type: payload.type,
      objectType: payload.object.type,
      objectId: payload.object.id,
      hasPassthrough: !!payload.data.passthrough
    });

    // Process the webhook event
    const result = await MuxWebhookHandler.processWebhookEvent(payload);

    // Log the processing result
    MuxWebhookHandler.logWebhookEvent(payload, result);

    // Return appropriate response
    if (result.success) {
      return NextResponse.json({
        success: true,
        action: result.action,
        processingTime: result.processingTime
      });
    } else {
      console.error('❌ Webhook processing failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        action: result.action,
        processingTime: result.processingTime
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal webhook processing error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook endpoint verification
export async function GET(request: NextRequest) {
  console.log('🔍 Webhook endpoint verification request');
  
  // Check if this is a webhook verification request
  const url = new URL(request.url);
  const challenge = url.searchParams.get('challenge');
  
  if (challenge) {
    console.log('✅ Webhook verification challenge received');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Return webhook endpoint status
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/mux/webhook',
    methods: ['POST'],
    description: 'Mux webhook endpoint for processing video events',
    features: [
      'Signature verification',
      'Asset status updates',
      'Thumbnail generation',
      'Database synchronization'
    ],
    lastChecked: new Date().toISOString()
  });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mux-signature, mux-timestamp',
    },
  });
}
