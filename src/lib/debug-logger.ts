/**
 * Debug Logger Utility for Processing Pipeline
 * 
 * This utility provides centralized logging for the video processing pipeline,
 * allowing us to track issues, performance, and system health.
 */

type LogLevel = 'error' | 'warning' | 'info' | 'debug';
type LogCategory = 'upload' | 'processing' | 'transcription' | 'database' | 'mux' | 'api';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  videoId?: string;
  videoTitle?: string;
  details?: any;
  stackTrace?: string;
}

class DebugLogger {
  private static instance: DebugLogger;
  private isEnabled: boolean = true;

  private constructor() {
    // Enable/disable based on environment
    this.isEnabled = process.env.NODE_ENV !== 'production' || 
                     process.env.ENABLE_DEBUG_LOGGING === 'true';
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  /**
   * Log an error with full stack trace
   */
  public async error(
    category: LogCategory,
    message: string,
    error?: Error,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    await this.log({
      level: 'error',
      category,
      message,
      videoId: context?.videoId,
      videoTitle: context?.videoTitle,
      details: {
        ...(context?.details || {}),
        error: error ? {
          name: error.name,
          message: error.message,
          ...(error.cause && { cause: error.cause })
        } : undefined
      },
      stackTrace: error?.stack
    });

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${category.toUpperCase()}] ${message}`, error, context);
    }
  }

  /**
   * Log a warning
   */
  public async warning(
    category: LogCategory,
    message: string,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    await this.log({
      level: 'warning',
      category,
      message,
      videoId: context?.videoId,
      videoTitle: context?.videoTitle,
      details: context?.details
    });

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[${category.toUpperCase()}] ${message}`, context);
    }
  }

  /**
   * Log informational message
   */
  public async info(
    category: LogCategory,
    message: string,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    await this.log({
      level: 'info',
      category,
      message,
      videoId: context?.videoId,
      videoTitle: context?.videoTitle,
      details: context?.details
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[${category.toUpperCase()}] ${message}`, context);
    }
  }

  /**
   * Log debug message (only in development)
   */
  public async debug(
    category: LogCategory,
    message: string,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    if (process.env.NODE_ENV === 'production' && 
        process.env.ENABLE_DEBUG_LOGGING !== 'true') {
      return;
    }

    await this.log({
      level: 'debug',
      category,
      message,
      videoId: context?.videoId,
      videoTitle: context?.videoTitle,
      details: context?.details
    });

    console.debug(`[${category.toUpperCase()}] ${message}`, context);
  }

  /**
   * Log processing milestone (for performance tracking)
   */
  public async milestone(
    category: LogCategory,
    message: string,
    duration?: number,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    await this.info(category, message, {
      ...context,
      details: {
        ...(context?.details || {}),
        milestone: true,
        duration: duration ? `${duration}ms` : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log processing start
   */
  public async startProcess(
    category: LogCategory,
    processName: string,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<{ startTime: number }> {
    const startTime = Date.now();
    
    await this.info(category, `Started ${processName}`, {
      ...context,
      details: {
        ...(context?.details || {}),
        processStart: true,
        startTime: new Date(startTime).toISOString()
      }
    });

    return { startTime };
  }

  /**
   * Log processing completion
   */
  public async completeProcess(
    category: LogCategory,
    processName: string,
    startTime: number,
    context?: {
      videoId?: string;
      videoTitle?: string;
      details?: any;
    }
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    await this.info(category, `Completed ${processName}`, {
      ...context,
      details: {
        ...(context?.details || {}),
        processComplete: true,
        duration: `${duration}ms`,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString()
      }
    });
  }

  /**
   * Core logging function
   */
  private async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Only log to database in server environment
      if (typeof window === 'undefined') {
        await fetch('/api/debug/processing-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      // Fail silently to avoid infinite loops
      console.error('Failed to log debug entry:', error);
    }
  }

  /**
   * Enable or disable logging
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  public isLoggingEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Export convenience functions
export const logError = (
  category: LogCategory,
  message: string,
  error?: Error,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.error(category, message, error, context);

export const logWarning = (
  category: LogCategory,
  message: string,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.warning(category, message, context);

export const logInfo = (
  category: LogCategory,
  message: string,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.info(category, message, context);

export const logDebug = (
  category: LogCategory,
  message: string,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.debug(category, message, context);

export const logMilestone = (
  category: LogCategory,
  message: string,
  duration?: number,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.milestone(category, message, duration, context);

export const startProcess = (
  category: LogCategory,
  processName: string,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.startProcess(category, processName, context);

export const completeProcess = (
  category: LogCategory,
  processName: string,
  startTime: number,
  context?: { videoId?: string; videoTitle?: string; details?: any }
) => debugLogger.completeProcess(category, processName, startTime, context);

export default debugLogger;