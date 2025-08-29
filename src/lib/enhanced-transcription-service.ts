import { AWSTranscribeService, TranscribeOptions, TranscribeResult } from './aws-transcribe-service';
import { WhisperAIService, WhisperOptions, WhisperResult } from './whisper-ai-service';
import { OpenAI } from 'openai';

export interface EntityExtractionResult {
  entities: Array<{
    text: string;
    type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'CONCEPT' | 'TOPIC';
    confidence: number;
    context?: string;
  }>;
  keyTopics: string[];
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface EnhancedTranscriptionResult {
  success: boolean;
  transcriptionMethod: 'aws-transcribe' | 'whisper-ai' | 'mux';
  transcriptText?: string;
  segments?: Array<{
    speaker?: string;
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
  }>;
  vttContent?: string;
  srtContent?: string;
  entities?: EntityExtractionResult;
  processingTime?: number;
  error?: string;
}

export class EnhancedTranscriptionService {
  private awsTranscribe: AWSTranscribeService;
  private whisperAI: WhisperAIService;
  private openai: OpenAI;

  constructor() {
    this.awsTranscribe = new AWSTranscribeService();
    
    try {
      this.whisperAI = new WhisperAIService();
    } catch (error) {
      console.warn('⚠️ Whisper AI not available:', error);
    }

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Process video transcription with fallback chain and AI enhancement
   */
  async processVideoTranscription(options: {
    videoId: string;
    s3Key: string;
    language?: string;
    maxSpeakers?: number;
    enableSpeakerDiarization?: boolean;
    enableEntityExtraction?: boolean;
    enableAIEnhancement?: boolean;
  }): Promise<EnhancedTranscriptionResult> {
    const startTime = Date.now();
    
    console.log('🎤 Starting enhanced transcription workflow for:', options.videoId);
    
    // Try AWS Transcribe first (best quality with speaker diarization)
    console.log('1️⃣ Attempting AWS Transcribe...');
    
    try {
      const awsResult = await this.awsTranscribe.processVideoTranscription({
        videoId: options.videoId,
        s3Key: options.s3Key,
        language: options.language as any,
        maxSpeakers: options.maxSpeakers,
        enableSpeakerDiarization: options.enableSpeakerDiarization
      });

      if (awsResult.success && awsResult.transcriptText) {
        console.log('✅ AWS Transcribe successful, processing results...');
        
        const result = await this.processTranscriptionResult({
          method: 'aws-transcribe',
          text: awsResult.transcriptText,
          speakers: awsResult.speakers,
          confidence: awsResult.confidence,
          enableEntityExtraction: options.enableEntityExtraction,
          enableAIEnhancement: options.enableAIEnhancement,
          processingTime: Date.now() - startTime
        });

        return result;
      } else {
        console.log('⚠️ AWS Transcribe failed:', awsResult.error);
      }
    } catch (error) {
      console.log('⚠️ AWS Transcribe error:', error);
    }

    // Fallback to Whisper AI
    console.log('2️⃣ Falling back to Whisper AI...');
    
    if (this.whisperAI) {
      try {
        const whisperResult = await this.whisperAI.transcribeAudio({
          videoId: options.videoId,
          s3Key: options.s3Key,
          language: options.language,
          responseFormat: 'verbose_json',
          timestampGranularities: ['segment', 'word']
        });

        if (whisperResult.success && whisperResult.text) {
          console.log('✅ Whisper AI successful, processing results...');
          
          const segments = whisperResult.segments?.map(seg => ({
            startTime: seg.start,
            endTime: seg.end,
            text: seg.text,
            confidence: 1 - seg.noSpeechProb // Convert no-speech probability to confidence
          }));

          const result = await this.processTranscriptionResult({
            method: 'whisper-ai',
            text: whisperResult.text,
            segments,
            confidence: 0.85, // Whisper generally has good confidence
            enableEntityExtraction: options.enableEntityExtraction,
            enableAIEnhancement: options.enableAIEnhancement,
            processingTime: Date.now() - startTime
          });

          return result;
        } else {
          console.log('⚠️ Whisper AI failed:', whisperResult.error);
        }
      } catch (error) {
        console.log('⚠️ Whisper AI error:', error);
      }
    }

    // If all methods fail
    console.log('❌ All transcription methods failed');
    
    return {
      success: false,
      transcriptionMethod: 'aws-transcribe', // Default
      error: 'All transcription services failed',
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Process and enhance transcription results
   */
  private async processTranscriptionResult(params: {
    method: 'aws-transcribe' | 'whisper-ai' | 'mux';
    text: string;
    speakers?: Array<{
      speaker: string;
      startTime: number;
      endTime: number;
      text: string;
      confidence: number;
    }>;
    segments?: Array<{
      startTime: number;
      endTime: number;
      text: string;
      confidence: number;
    }>;
    confidence?: number;
    enableEntityExtraction?: boolean;
    enableAIEnhancement?: boolean;
    processingTime: number;
  }): Promise<EnhancedTranscriptionResult> {
    
    const result: EnhancedTranscriptionResult = {
      success: true,
      transcriptionMethod: params.method,
      transcriptText: params.text,
      processingTime: params.processingTime
    };

    // Normalize segments (use speakers if available, otherwise regular segments)
    const segments = params.speakers || params.segments || [];
    result.segments = segments;

    // Generate VTT and SRT formats
    if (segments.length > 0) {
      result.vttContent = this.generateVTT(segments);
      result.srtContent = this.generateSRT(segments);
    }

    // AI Enhancement: Entity extraction and analysis
    if (params.enableEntityExtraction && this.openai && params.text) {
      console.log('🤖 Performing AI entity extraction and enhancement...');
      
      try {
        const entities = await this.extractEntitiesAndEnhance(params.text);
        result.entities = entities;
        
        console.log('✅ AI enhancement completed:', {
          entityCount: entities.entities.length,
          keyTopics: entities.keyTopics.length,
          sentiment: entities.sentiment
        });
      } catch (error) {
        console.warn('⚠️ AI enhancement failed:', error);
      }
    }

    return result;
  }

  /**
   * Extract entities and perform AI analysis
   */
  private async extractEntitiesAndEnhance(text: string): Promise<EntityExtractionResult> {
    const prompt = `
Please analyze the following transcript and extract:

1. Named entities (people, organizations, locations, dates, important concepts)
2. Key topics and themes
3. A concise summary (2-3 sentences)
4. Overall sentiment

Transcript:
${text}

Please respond in the following JSON format:
{
  "entities": [
    {
      "text": "entity name",
      "type": "PERSON|ORGANIZATION|LOCATION|DATE|CONCEPT|TOPIC",
      "confidence": 0.95,
      "context": "brief context where mentioned"
    }
  ],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "summary": "Brief summary of the content",
  "sentiment": "positive|neutral|negative",
  "confidence": 0.85
}
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing transcripts and extracting structured information. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI enhancement');
    }

    try {
      return JSON.parse(content) as EntityExtractionResult;
    } catch (error) {
      console.error('❌ Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI enhancement');
    }
  }

  /**
   * Generate WebVTT format from segments
   */
  private generateVTT(segments: Array<{
    speaker?: string;
    startTime: number;
    endTime: number;
    text: string;
  }>): string {
    let vtt = 'WEBVTT\n\n';
    
    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.startTime);
      const end = this.formatTimestamp(segment.endTime);
      
      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      
      if (segment.speaker) {
        vtt += `<v ${segment.speaker}>${segment.text.trim()}</v>\n\n`;
      } else {
        vtt += `${segment.text.trim()}\n\n`;
      }
    });
    
    return vtt;
  }

  /**
   * Generate SRT format from segments
   */
  private generateSRT(segments: Array<{
    speaker?: string;
    startTime: number;
    endTime: number;
    text: string;
  }>): string {
    let srt = '';
    
    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.startTime, true);
      const end = this.formatTimestamp(segment.endTime, true);
      
      srt += `${index + 1}\n`;
      srt += `${start} --> ${end}\n`;
      
      const text = segment.speaker 
        ? `${segment.speaker}: ${segment.text.trim()}`
        : segment.text.trim();
      
      srt += `${text}\n\n`;
    });
    
    return srt;
  }

  /**
   * Format timestamp for subtitle files
   */
  private formatTimestamp(seconds: number, srtFormat: boolean = false): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    const separator = srtFormat ? ',' : '.';
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}${separator}${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Test all transcription services
   */
  async testAllServices(): Promise<{
    awsTranscribe: { status: 'success' | 'error'; message: string };
    whisperAI: { status: 'success' | 'error'; message: string };
    openaiEnhancement: { status: 'success' | 'error'; message: string };
  }> {
    const results = {
      awsTranscribe: { status: 'error' as const, message: 'Not tested' },
      whisperAI: { status: 'error' as const, message: 'Not available' },
      openaiEnhancement: { status: 'error' as const, message: 'Not available' }
    };

    // Test AWS Transcribe
    try {
      // AWS Transcribe doesn't have a direct test method, so we check credentials
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        results.awsTranscribe = { status: 'success', message: 'AWS Transcribe configured' };
      } else {
        results.awsTranscribe = { status: 'error', message: 'AWS credentials not configured' };
      }
    } catch (error) {
      results.awsTranscribe = { status: 'error', message: `AWS Transcribe error: ${error}` };
    }

    // Test Whisper AI
    if (this.whisperAI) {
      try {
        results.whisperAI = await this.whisperAI.testConfiguration();
      } catch (error) {
        results.whisperAI = { status: 'error', message: `Whisper AI error: ${error}` };
      }
    }

    // Test OpenAI Enhancement
    if (this.openai) {
      try {
        await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 1
        });
        results.openaiEnhancement = { status: 'success', message: 'OpenAI API configured' };
      } catch (error: any) {
        results.openaiEnhancement = { 
          status: 'error', 
          message: `OpenAI API error: ${error?.error?.message || error?.message || 'Unknown error'}` 
        };
      }
    }

    return results;
  }
}

export default EnhancedTranscriptionService;