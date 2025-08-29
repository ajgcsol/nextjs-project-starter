import { NextRequest, NextResponse } from 'next/server';
import EnhancedTranscriptionService from '@/lib/enhanced-transcription-service';
import { AWSTranscribeService } from '@/lib/aws-transcribe-service';
import { WhisperAIService } from '@/lib/whisper-ai-service';
import { MuxVideoProcessor } from '@/lib/mux-integration';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing all transcription services...');

    const testResults = {
      timestamp: new Date().toISOString(),
      services: {
        enhancedTranscription: { status: 'unknown', message: '', error: null },
        awsTranscribe: { status: 'unknown', message: '', error: null },
        whisperAI: { status: 'unknown', message: '', error: null },
        muxIntegration: { status: 'unknown', message: '', error: null },
        openaiAPI: { status: 'unknown', message: '', error: null }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasMuxCredentials: !!(process.env.VIDEO_MUX_TOKEN_ID && process.env.VIDEO_MUX_TOKEN_SECRET),
        hasS3Bucket: !!process.env.S3_BUCKET_NAME,
        region: process.env.AWS_REGION || 'us-east-1'
      }
    };

    // Test Enhanced Transcription Service
    try {
      console.log('Testing Enhanced Transcription Service...');
      const enhancedService = new EnhancedTranscriptionService();
      const enhancedResults = await enhancedService.testAllServices();
      
      testResults.services.enhancedTranscription = {
        status: 'success',
        message: 'Enhanced Transcription Service initialized',
        error: null,
        details: enhancedResults
      };
    } catch (error) {
      testResults.services.enhancedTranscription = {
        status: 'error',
        message: 'Failed to initialize Enhanced Transcription Service',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test AWS Transcribe Service
    try {
      console.log('Testing AWS Transcribe Service...');
      if (testResults.environment.hasAwsCredentials) {
        const awsService = new AWSTranscribeService();
        testResults.services.awsTranscribe = {
          status: 'success',
          message: 'AWS Transcribe Service initialized successfully',
          error: null
        };
      } else {
        testResults.services.awsTranscribe = {
          status: 'error',
          message: 'AWS credentials not configured',
          error: 'Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY'
        };
      }
    } catch (error) {
      testResults.services.awsTranscribe = {
        status: 'error',
        message: 'Failed to initialize AWS Transcribe Service',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test Whisper AI Service
    try {
      console.log('Testing Whisper AI Service...');
      if (testResults.environment.hasOpenAIKey) {
        const whisperService = new WhisperAIService();
        const whisperTest = await whisperService.testConfiguration();
        
        testResults.services.whisperAI = {
          status: whisperTest.status,
          message: whisperTest.message,
          error: whisperTest.status === 'error' ? whisperTest.message : null
        };
      } else {
        testResults.services.whisperAI = {
          status: 'error',
          message: 'OpenAI API key not configured',
          error: 'Missing OPENAI_API_KEY'
        };
      }
    } catch (error) {
      testResults.services.whisperAI = {
        status: 'error',
        message: 'Failed to initialize Whisper AI Service',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test Mux Integration
    try {
      console.log('Testing Mux Integration...');
      if (testResults.environment.hasMuxCredentials) {
        const muxTest = await MuxVideoProcessor.testConfiguration();
        
        testResults.services.muxIntegration = {
          status: muxTest.status,
          message: muxTest.message,
          error: muxTest.status === 'error' ? muxTest.message : null
        };
      } else {
        testResults.services.muxIntegration = {
          status: 'error',
          message: 'Mux credentials not configured',
          error: 'Missing VIDEO_MUX_TOKEN_ID or VIDEO_MUX_TOKEN_SECRET'
        };
      }
    } catch (error) {
      testResults.services.muxIntegration = {
        status: 'error',
        message: 'Failed to test Mux Integration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test OpenAI API directly
    try {
      console.log('Testing OpenAI API...');
      if (testResults.environment.hasOpenAIKey) {
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 1
        });
        
        testResults.services.openaiAPI = {
          status: 'success',
          message: 'OpenAI API connection successful',
          error: null
        };
      } else {
        testResults.services.openaiAPI = {
          status: 'error',
          message: 'OpenAI API key not configured',
          error: 'Missing OPENAI_API_KEY'
        };
      }
    } catch (error: any) {
      testResults.services.openaiAPI = {
        status: 'error',
        message: 'Failed to connect to OpenAI API',
        error: error?.error?.message || error?.message || 'Unknown error'
      };
    }

    // Generate summary
    const workingServices = Object.values(testResults.services).filter(s => s.status === 'success').length;
    const totalServices = Object.keys(testResults.services).length;
    
    console.log(`✅ Service test completed: ${workingServices}/${totalServices} services working`);

    return NextResponse.json({
      success: true,
      summary: `${workingServices}/${totalServices} services working`,
      results: testResults,
      recommendations: generateRecommendations(testResults)
    });

  } catch (error) {
    console.error('❌ Service test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test transcription services',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(testResults: any): string[] {
  const recommendations: string[] = [];
  
  if (!testResults.environment.hasAwsCredentials) {
    recommendations.push('Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) for AWS Transcribe');
  }
  
  if (!testResults.environment.hasOpenAIKey) {
    recommendations.push('Configure OpenAI API key (OPENAI_API_KEY) for Whisper AI and entity extraction');
  }
  
  if (!testResults.environment.hasMuxCredentials) {
    recommendations.push('Configure Mux credentials (VIDEO_MUX_TOKEN_ID, VIDEO_MUX_TOKEN_SECRET) for video processing');
  }
  
  if (!testResults.environment.hasS3Bucket) {
    recommendations.push('Configure S3 bucket name (S3_BUCKET_NAME) for file storage');
  }
  
  if (testResults.services.awsTranscribe?.status === 'error') {
    recommendations.push('Check AWS Transcribe configuration and permissions');
  }
  
  if (testResults.services.whisperAI?.status === 'error') {
    recommendations.push('Check OpenAI API key and billing status for Whisper AI');
  }
  
  if (testResults.services.muxIntegration?.status === 'error') {
    recommendations.push('Check Mux credentials and API access');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All services are properly configured! You can use the enhanced transcription workflow.');
  }
  
  return recommendations;
}

// Allow manual testing via GET request
export { GET as POST };