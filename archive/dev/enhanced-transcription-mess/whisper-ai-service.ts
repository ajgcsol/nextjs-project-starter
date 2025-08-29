import { OpenAI } from 'openai';

export interface WhisperOptions {
  videoId: string;
  s3Key: string;
  language?: string;
  model?: 'whisper-1';
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestampGranularities?: ('word' | 'segment')[];
}

export interface WhisperResult {
  success: boolean;
  text?: string;
  segments?: WhisperSegment[];
  language?: string;
  duration?: number;
  words?: WhisperWord[];
  error?: string;
  processingTime?: number;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avgLogprob: number;
  compressionRatio: number;
  noSpeechProb: number;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export class WhisperAIService {
  private openai: OpenAI;
  private bucketName: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for Whisper AI service');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  /**
   * Transcribe audio/video using OpenAI Whisper
   */
  async transcribeAudio(options: WhisperOptions): Promise<WhisperResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Starting Whisper AI transcription for:', options.videoId);
      
      const fileUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${options.s3Key}`;
      
      console.log('🎤 Whisper transcription parameters:', {
        videoId: options.videoId,
        fileUrl,
        language: options.language || 'auto-detect',
        model: options.model || 'whisper-1',
        responseFormat: options.responseFormat || 'verbose_json'
      });

      // Download the file first (Whisper requires file upload, not URL)
      console.log('📥 Downloading file for Whisper processing...');
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const fileBuffer = await response.arrayBuffer();
      const file = new File([fileBuffer], `${options.videoId}.${this.getFileExtension(options.s3Key)}`, {
        type: this.getMimeType(options.s3Key)
      });

      console.log('🎵 File prepared for Whisper:', {
        size: Math.round(file.size / 1024 / 1024 * 100) / 100 + 'MB',
        type: file.type
      });

      // Transcribe with Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: options.model || 'whisper-1',
        language: options.language || undefined, // Let Whisper auto-detect if not specified
        response_format: options.responseFormat || 'verbose_json',
        temperature: options.temperature || 0,
        timestamp_granularities: options.timestampGranularities || ['segment']
      });

      console.log('✅ Whisper transcription completed successfully');

      const result: WhisperResult = {
        success: true,
        processingTime: Date.now() - startTime
      };

      // Handle different response formats
      if (typeof transcription === 'string') {
        result.text = transcription;
      } else if ('text' in transcription) {
        result.text = transcription.text;
        result.language = transcription.language;
        result.duration = transcription.duration;
        
        if ('segments' in transcription && transcription.segments) {
          result.segments = transcription.segments as WhisperSegment[];
        }
        
        if ('words' in transcription && transcription.words) {
          result.words = transcription.words as WhisperWord[];
        }
      }

      console.log('📊 Whisper transcription results:', {
        textLength: result.text?.length || 0,
        segmentCount: result.segments?.length || 0,
        wordCount: result.words?.length || 0,
        language: result.language,
        duration: result.duration
      });

      return result;
      
    } catch (error) {
      console.error('❌ Whisper AI transcription failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Whisper AI error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Convert Whisper segments to VTT format
   */
  convertToVTT(segments: WhisperSegment[]): string {
    let vtt = 'WEBVTT\n\n';
    
    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.start);
      const end = this.formatTimestamp(segment.end);
      
      vtt += `${index + 1}\n`;
      vtt += `${start} --> ${end}\n`;
      vtt += `${segment.text.trim()}\n\n`;
    });
    
    return vtt;
  }

  /**
   * Convert Whisper segments to SRT format
   */
  convertToSRT(segments: WhisperSegment[]): string {
    let srt = '';
    
    segments.forEach((segment, index) => {
      const start = this.formatTimestamp(segment.start, true);
      const end = this.formatTimestamp(segment.end, true);
      
      srt += `${index + 1}\n`;
      srt += `${start} --> ${end}\n`;
      srt += `${segment.text.trim()}\n\n`;
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
   * Get file extension from S3 key
   */
  private getFileExtension(s3Key: string): string {
    return s3Key.split('.').pop()?.toLowerCase() || 'mp4';
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(s3Key: string): string {
    const extension = this.getFileExtension(s3Key);
    
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'm4a':
        return 'audio/m4a';
      case 'wav':
        return 'audio/wav';
      case 'flac':
        return 'audio/flac';
      case 'ogg':
        return 'audio/ogg';
      case 'webm':
        return 'video/webm';
      default:
        return 'video/mp4';
    }
  }

  /**
   * Test Whisper AI configuration
   */
  async testConfiguration(): Promise<{
    status: 'success' | 'error';
    message: string;
  }> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'error',
          message: 'OPENAI_API_KEY environment variable is not set'
        };
      }

      // Test with a small audio buffer (silence)
      const silentBuffer = new ArrayBuffer(1024);
      const testFile = new File([silentBuffer], 'test.wav', { type: 'audio/wav' });
      
      // This will fail but confirms API key works
      try {
        await this.openai.audio.transcriptions.create({
          file: testFile,
          model: 'whisper-1'
        });
      } catch (error: any) {
        // Expected to fail with invalid audio, but should not fail with auth error
        if (error?.error?.type === 'invalid_request_error' && 
            error?.error?.message?.includes('audio')) {
          return {
            status: 'success',
            message: 'Whisper AI configuration is working'
          };
        }
        throw error;
      }

      return {
        status: 'success',
        message: 'Whisper AI configuration is working'
      };

    } catch (error: any) {
      return {
        status: 'error',
        message: `Whisper AI configuration failed: ${error?.error?.message || error?.message || 'Unknown error'}`
      };
    }
  }
}

export default WhisperAIService;