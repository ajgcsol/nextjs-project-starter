import { 
  TranscribeClient, 
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJob,
  LanguageCode
} from '@aws-sdk/client-transcribe';

export interface TranscribeOptions {
  videoId: string;
  s3Key: string;
  language?: LanguageCode;
  maxSpeakers?: number;
  enableSpeakerDiarization?: boolean;
  vocabularyName?: string;
}

export interface TranscribeResult {
  success: boolean;
  jobId?: string;
  status?: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  transcriptUrl?: string;
  transcriptText?: string;
  speakers?: SpeakerSegment[];
  confidence?: number;
  error?: string;
  processingTime?: number;
}

export interface SpeakerSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

export class AWSTranscribeService {
  private client: TranscribeClient;
  private bucketName: string;

  constructor() {
    this.client = new TranscribeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    this.bucketName = process.env.S3_BUCKET_NAME!;
  }

  /**
   * Start transcription job with speaker diarization
   */
  async startTranscriptionJob(options: TranscribeOptions): Promise<TranscribeResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎤 Starting AWS Transcribe job with speaker diarization for:', options.videoId);
      
      const jobName = `transcription-${options.videoId}-${Date.now()}`;
      const mediaFileUri = `s3://${this.bucketName}/${options.s3Key}`;
      const outputBucketUri = `s3://${this.bucketName}/transcriptions/`;
      
      const command = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: options.language || LanguageCode.en_US,
        MediaFormat: this.getMediaFormat(options.s3Key),
        Media: {
          MediaFileUri: mediaFileUri,
        },
        OutputBucketName: this.bucketName,
        OutputKey: `transcriptions/${jobName}.json`,
        Settings: {
          ShowSpeakerLabels: options.enableSpeakerDiarization !== false,
          MaxSpeakerLabels: options.maxSpeakers || 4,
          ChannelIdentification: false,
          ShowAlternatives: false,
          MaxAlternatives: 1,
          VocabularyName: options.vocabularyName,
        },
        JobExecutionSettings: {
          AllowDeferredExecution: false,
          DataAccessRoleArn: undefined, // Will use the role attached to Lambda/EC2
        }
      });

      console.log('🎤 AWS Transcribe job parameters:', {
        jobName,
        mediaFileUri,
        outputBucket: outputBucketUri,
        language: options.language || LanguageCode.en_US,
        maxSpeakers: options.maxSpeakers || 4,
        enableSpeakerDiarization: options.enableSpeakerDiarization !== false
      });

      const result = await this.client.send(command);
      
      if (result.TranscriptionJob) {
        console.log('✅ AWS Transcribe job started:', result.TranscriptionJob.TranscriptionJobName);
        
        return {
          success: true,
          jobId: result.TranscriptionJob.TranscriptionJobName!,
          status: result.TranscriptionJob.TranscriptionJobStatus as any,
          processingTime: Date.now() - startTime
        };
      } else {
        throw new Error('Failed to start transcription job - no job returned');
      }
      
    } catch (error) {
      console.error('❌ AWS Transcribe job failed to start:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transcription error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check transcription job status and retrieve results
   */
  async getTranscriptionJob(jobId: string): Promise<TranscribeResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Checking AWS Transcribe job status:', jobId);
      
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobId,
      });

      const result = await this.client.send(command);
      const job = result.TranscriptionJob;
      
      if (!job) {
        throw new Error('Transcription job not found');
      }

      console.log('📊 Transcription job status:', {
        jobName: job.TranscriptionJobName,
        status: job.TranscriptionJobStatus,
        creationTime: job.CreationTime,
        completionTime: job.CompletionTime,
        failureReason: job.FailureReason
      });

      const response: TranscribeResult = {
        success: true,
        jobId: job.TranscriptionJobName!,
        status: job.TranscriptionJobStatus as any,
        processingTime: Date.now() - startTime
      };

      // If job is completed, fetch the transcript
      if (job.TranscriptionJobStatus === 'COMPLETED' && job.Transcript?.TranscriptFileUri) {
        console.log('📄 Fetching transcript from:', job.Transcript.TranscriptFileUri);
        
        try {
          const transcriptData = await this.fetchTranscriptResults(job.Transcript.TranscriptFileUri);
          response.transcriptUrl = job.Transcript.TranscriptFileUri;
          response.transcriptText = transcriptData.transcriptText;
          response.speakers = transcriptData.speakers;
          response.confidence = transcriptData.confidence;
          
          console.log('✅ Transcript processed successfully:', {
            textLength: transcriptData.transcriptText.length,
            speakerCount: transcriptData.speakers.length,
            averageConfidence: transcriptData.confidence
          });
          
        } catch (fetchError) {
          console.error('❌ Failed to fetch transcript results:', fetchError);
          response.error = `Transcription completed but failed to fetch results: ${fetchError}`;
        }
      } else if (job.TranscriptionJobStatus === 'FAILED') {
        response.success = false;
        response.error = job.FailureReason || 'Transcription job failed';
      }

      return response;
      
    } catch (error) {
      console.error('❌ Failed to get transcription job status:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Fetch and parse transcript results from S3
   */
  private async fetchTranscriptResults(transcriptUrl: string): Promise<{
    transcriptText: string;
    speakers: SpeakerSegment[];
    confidence: number;
  }> {
    try {
      const response = await fetch(transcriptUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status} ${response.statusText}`);
      }
      
      const transcriptData = await response.json();
      
      // Extract full transcript text
      const transcriptText = transcriptData.results.transcripts[0]?.transcript || '';
      
      // Extract speaker segments if available
      const speakers: SpeakerSegment[] = [];
      let totalConfidence = 0;
      let confidenceCount = 0;
      
      if (transcriptData.results.speaker_labels?.segments) {
        for (const segment of transcriptData.results.speaker_labels.segments) {
          const items = segment.items || [];
          const text = items.map((item: any) => item.content).join(' ');
          
          if (text.trim()) {
            speakers.push({
              speaker: `Speaker ${segment.speaker_label}`,
              startTime: parseFloat(segment.start_time),
              endTime: parseFloat(segment.end_time),
              text: text.trim(),
              confidence: this.calculateSegmentConfidence(items)
            });
          }
        }
      }
      
      // Calculate average confidence
      if (transcriptData.results.items) {
        for (const item of transcriptData.results.items) {
          if (item.alternatives && item.alternatives[0] && item.alternatives[0].confidence) {
            totalConfidence += parseFloat(item.alternatives[0].confidence);
            confidenceCount++;
          }
        }
      }
      
      const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
      
      return {
        transcriptText,
        speakers,
        confidence: averageConfidence
      };
      
    } catch (error) {
      console.error('❌ Error parsing transcript results:', error);
      throw error;
    }
  }

  /**
   * Calculate confidence for a speaker segment
   */
  private calculateSegmentConfidence(items: any[]): number {
    const confidences = items
      .map(item => item.alternatives?.[0]?.confidence)
      .filter(conf => conf !== undefined)
      .map(conf => parseFloat(conf));
      
    if (confidences.length === 0) return 0;
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Determine media format from file extension
   */
  private getMediaFormat(s3Key: string): string {
    const extension = s3Key.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'mp4':
      case 'm4a':
        return 'mp4';
      case 'wav':
        return 'wav';
      case 'flac':
        return 'flac';
      case 'ogg':
        return 'ogg';
      case 'amr':
        return 'amr';
      case 'webm':
        return 'webm';
      default:
        return 'mp4'; // Default to mp4 for most video files
    }
  }

  /**
   * Wait for transcription job to complete with polling
   */
  async waitForCompletion(jobId: string, maxWaitMinutes: number = 30): Promise<TranscribeResult> {
    const maxAttempts = maxWaitMinutes * 2; // Check every 30 seconds
    let attempts = 0;
    
    console.log(`⏳ Waiting for transcription job ${jobId} to complete (max ${maxWaitMinutes} minutes)`);
    
    while (attempts < maxAttempts) {
      const result = await this.getTranscriptionJob(jobId);
      
      if (result.status === 'COMPLETED') {
        console.log('✅ Transcription job completed successfully');
        return result;
      } else if (result.status === 'FAILED') {
        console.log('❌ Transcription job failed');
        return result;
      } else {
        console.log(`⏳ Transcription job still ${result.status}, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        attempts++;
      }
    }
    
    console.log('⏰ Transcription job timed out');
    return {
      success: false,
      error: `Transcription job timed out after ${maxWaitMinutes} minutes`,
    };
  }

  /**
   * Process video transcription end-to-end
   */
  async processVideoTranscription(options: TranscribeOptions): Promise<TranscribeResult> {
    console.log('🎤 Starting end-to-end video transcription with speaker diarization');
    
    // Start the transcription job
    const startResult = await this.startTranscriptionJob(options);
    
    if (!startResult.success) {
      return startResult;
    }
    
    // Wait for completion
    const completionResult = await this.waitForCompletion(startResult.jobId!);
    
    return completionResult;
  }
}

export default AWSTranscribeService;