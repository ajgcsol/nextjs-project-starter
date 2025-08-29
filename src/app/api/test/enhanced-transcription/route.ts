import { NextRequest, NextResponse } from 'next/server';
import EnhancedTranscriptionService from '@/lib/enhanced-transcription-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing enhanced transcription service initialization...');
    
    // Test service initialization
    const service = new EnhancedTranscriptionService();
    console.log('✅ Enhanced transcription service created successfully');
    
    // Test all services
    const testResults = await service.testAllServices();
    console.log('📊 Service test results:', testResults);
    
    return NextResponse.json({
      success: true,
      message: 'Enhanced transcription service test completed',
      results: testResults
    });
    
  } catch (error) {
    console.error('❌ Enhanced transcription service test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Enhanced transcription service test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}