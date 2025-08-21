import { NextRequest, NextResponse } from 'next/server';
import { AWSVideoProcessor } from '@/lib/aws-integration';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing MediaConvert auto-discovery...');
    
    // Test MediaConvert configuration
    const testResult = await AWSVideoProcessor.testConfiguration();
    
    if (testResult.status === 'success') {
      return NextResponse.json({
        success: true,
        message: 'MediaConvert is ready to use!',
        configuration: {
          endpoint: testResult.endpoint,
          roleArn: testResult.roleArn,
          autoDiscovered: !process.env.MEDIACONVERT_ENDPOINT
        },
        nextSteps: [
          'MediaConvert is fully configured and working',
          'Real thumbnail generation is now available',
          'WMV conversion is now available'
        ]
      });
    } else {
      // Check what's missing
      const missingItems = [];
      const instructions = [];
      
      if (!process.env.MEDIACONVERT_ROLE_ARN) {
        missingItems.push('MediaConvert IAM Role');
        instructions.push({
          step: 1,
          title: 'Create MediaConvert IAM Role',
          description: 'Go to AWS IAM Console → Roles → Create role → AWS service → MediaConvert',
          url: 'https://console.aws.amazon.com/iam/home#/roles',
          details: 'Name it "MediaConvert-Role" and copy the ARN'
        });
      }
      
      // Try to discover endpoint anyway
      let discoveredEndpoint = null;
      try {
        discoveredEndpoint = await AWSVideoProcessor.discoverEndpoint();
      } catch (error) {
        console.log('Endpoint discovery failed:', error);
      }
      
      return NextResponse.json({
        success: false,
        message: 'MediaConvert setup incomplete',
        missing: missingItems,
        current: {
          roleArn: process.env.MEDIACONVERT_ROLE_ARN || null,
          endpoint: process.env.MEDIACONVERT_ENDPOINT || discoveredEndpoint || null,
          autoDiscoveredEndpoint: discoveredEndpoint
        },
        instructions,
        vercelSetup: discoveredEndpoint ? {
          step: 2,
          title: 'Add to Vercel Environment Variables',
          variables: [
            {
              name: 'MEDIACONVERT_ROLE_ARN',
              value: 'arn:aws:iam::YOUR_ACCOUNT:role/MediaConvert-Role',
              description: 'Replace YOUR_ACCOUNT with your AWS account ID'
            },
            ...(discoveredEndpoint ? [{
              name: 'MEDIACONVERT_ENDPOINT',
              value: discoveredEndpoint,
              description: 'Auto-discovered endpoint (optional - will auto-discover if not set)'
            }] : [])
          ]
        } : null,
        error: testResult.message
      });
    }
    
  } catch (error) {
    console.error('❌ MediaConvert setup test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to test MediaConvert setup',
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Check AWS credentials are configured correctly',
        'Ensure you have MediaConvert permissions',
        'Try creating the IAM role first',
        'Check if MediaConvert is available in your region'
      ]
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'discover-endpoint') {
      console.log('🔍 Discovering MediaConvert endpoint...');
      
      const endpoint = await AWSVideoProcessor.discoverEndpoint();
      
      return NextResponse.json({
        success: true,
        endpoint,
        message: 'MediaConvert endpoint discovered successfully',
        instructions: {
          title: 'Add this endpoint to Vercel',
          steps: [
            'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
            `Add: MEDIACONVERT_ENDPOINT = ${endpoint}`,
            'Redeploy your application'
          ]
        }
      });
      
    } else if (action === 'test-role') {
      const { roleArn } = body;
      
      if (!roleArn) {
        return NextResponse.json({
          success: false,
          message: 'Role ARN is required'
        }, { status: 400 });
      }
      
      // Temporarily set the role ARN for testing
      const originalRoleArn = process.env.MEDIACONVERT_ROLE_ARN;
      process.env.MEDIACONVERT_ROLE_ARN = roleArn;
      
      try {
        const testResult = await AWSVideoProcessor.testConfiguration();
        
        return NextResponse.json({
          success: testResult.status === 'success',
          message: testResult.message,
          roleArn: roleArn,
          endpoint: testResult.endpoint
        });
        
      } finally {
        // Restore original role ARN
        if (originalRoleArn) {
          process.env.MEDIACONVERT_ROLE_ARN = originalRoleArn;
        } else {
          delete process.env.MEDIACONVERT_ROLE_ARN;
        }
      }
      
    } else {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Supported actions: discover-endpoint, test-role'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ MediaConvert setup action failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Setup action failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
