import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

interface LogEvent {
  timestamp: number;
  message: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  metadata?: Record<string, any>;
}

class CloudWatchLogger {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;

  constructor() {
    this.client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    
    this.logGroupName = '/vercel/law-school-repository';
    this.logStreamName = `video-streaming-${new Date().toISOString().split('T')[0]}`;
  }

  async ensureLogGroup() {
    try {
      await this.client.send(new CreateLogGroupCommand({
        logGroupName: this.logGroupName,
      }));
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('Failed to create log group:', error);
      }
    }

    try {
      await this.client.send(new CreateLogStreamCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
      }));
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        console.warn('Failed to create log stream:', error);
      }
    }
  }

  async log(event: LogEvent) {
    try {
      await this.ensureLogGroup();

      const logEvent = {
        timestamp: event.timestamp,
        message: JSON.stringify({
          level: event.level,
          service: event.service,
          message: event.message,
          metadata: event.metadata,
        }),
      };

      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent],
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('CloudWatch logging failed:', error);
      // Fallback to console logging
      console.log(`[${event.level}] ${event.service}: ${event.message}`, event.metadata);
    }
  }
}

// Video streaming specific monitoring
export class VideoStreamingMonitor {
  private cloudWatch: CloudWatchLogger;

  constructor() {
    this.cloudWatch = new CloudWatchLogger();
  }

  async logVideoRequest(videoId: string, metadata: Record<string, any>) {
    await this.cloudWatch.log({
      timestamp: Date.now(),
      level: 'INFO',
      service: 'video-streaming',
      message: `Video request initiated for ${videoId}`,
      metadata: {
        videoId,
        ...metadata,
      },
    });
  }

  async logVideoSuccess(videoId: string, streamUrl: string, responseTime: number) {
    await this.cloudWatch.log({
      timestamp: Date.now(),
      level: 'INFO',
      service: 'video-streaming',
      message: `Video streaming successful for ${videoId}`,
      metadata: {
        videoId,
        streamUrl,
        responseTime,
        status: 'success',
      },
    });
  }

  async logVideoError(videoId: string, error: string, metadata?: Record<string, any>) {
    await this.cloudWatch.log({
      timestamp: Date.now(),
      level: 'ERROR',
      service: 'video-streaming',
      message: `Video streaming failed for ${videoId}: ${error}`,
      metadata: {
        videoId,
        error,
        ...metadata,
      },
    });
  }

  async logUploadEvent(event: string, metadata: Record<string, any>) {
    await this.cloudWatch.log({
      timestamp: Date.now(),
      level: 'INFO',
      service: 'video-upload',
      message: event,
      metadata,
    });
  }

  async logDatabaseEvent(operation: string, success: boolean, metadata?: Record<string, any>) {
    await this.cloudWatch.log({
      timestamp: Date.now(),
      level: success ? 'INFO' : 'ERROR',
      service: 'database',
      message: `Database ${operation} ${success ? 'successful' : 'failed'}`,
      metadata,
    });
  }
}

// Singleton instance
export const videoMonitor = new VideoStreamingMonitor();

// Performance monitoring utilities
export class PerformanceMonitor {
  static startTimer(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    };
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(label);
    try {
      const result = await fn();
      const duration = endTimer();
      
      // Log to monitoring systems
      await videoMonitor.logUploadEvent(`${label} completed`, { 
        duration, 
        status: 'success' 
      });
      
      return result;
    } catch (error) {
      const duration = endTimer();
      
      // Log error to monitoring systems
      await videoMonitor.logVideoError('performance', `${label} failed`, { 
        duration, 
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }
}
