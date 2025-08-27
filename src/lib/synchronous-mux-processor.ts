import MuxVideoProcessor from './mux-video-processor';
import VideoMetadataExtractor from './video-metadata-extractor';

export interface SynchronousProcessingResult {
  success: boolean;
  thumbnailUrl?: string;
  transcriptText?: string;
  captionsUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStreamingUrl?: string;
  muxMp4Url?: string;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fileSize?: number;
  bitrate?: number;
  processingTime: number;
  error?: string;
}

export class SynchronousMuxProcessor {
  /**
   * Process video synchronously with complete metadata extraction
   * This ensures thumbnails and transcripts are ready before the upload completes
   */
  static async processVideoSynchronously(
    s3Key: string,
    videoId: string,
    filename?: string,
    fileSize?: number,
    maxWaitTime: number = 120000 // 2 minutes max wait
  ): Promise<SynchronousProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log('🎬 Starting synchronous Mux processing for:', videoId);
      
      // Step 1: Create Mux asset
      const processingOptions = MuxVideoProcessor.getDefaultProcessingOptions();
      const muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, videoId, processingOptions);
      
      if (!muxResult.success) {
        return {
          success: false,
          processingTime: Date.now() - startTime,
          error: `Mux asset creation failed: ${muxResult.error}`
        };
      }
      
      console.log('✅ Mux asset created:', muxResult.assetId);
      
      // Step 2: Wait for asset to be ready (polling with shorter intervals for better UX)
      const assetId = muxResult.assetId!;
      const playbackId = muxResult.playbackId!;
      
      let isReady = false;
      let attempts = 0;
      const maxAttempts = Math.floor(maxWaitTime / 3000); // Check every 3 seconds for faster response
      
      console.log('⏳ Waiting for Mux asset to be ready...');
      
      while (!isReady && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        attempts++;
        
        const statusResult = await MuxVideoProcessor.getAssetStatus(assetId);
        
        if (statusResult.success) {
          if (statusResult.processingStatus === 'ready') {
            isReady = true;
            console.log('✅ Mux asset is ready!');
          } else if (statusResult.processingStatus === 'errored') {
            return {
              success: false,
              processingTime: Date.now() - startTime,
              error: `Mux processing failed: ${statusResult.error}`
            };
          } else {
            console.log(`⏳ Asset status: ${statusResult.processingStatus} (attempt ${attempts}/${maxAttempts})`);
          }
        }
      }
      
      // Step 3: Extract complete metadata using VideoMetadataExtractor
      let metadata;
      try {
        if (isReady) {
          console.log('📊 Extracting complete metadata from ready Mux asset...');
          metadata = await VideoMetadataExtractor.extractFromMuxAsset(assetId, playbackId, 3);
        }
        
        if (!metadata) {
          console.log('📊 Using fallback metadata extraction...');
          metadata = VideoMetadataExtractor.extractFromFileInfo(filename || 'unknown.mp4', fileSize, s3Key);
        }
        
        console.log('📊 Metadata extracted:', {
          duration: VideoMetadataExtractor.formatDuration(metadata.duration),
          dimensions: `${metadata.width}x${metadata.height}`,
          fileSize: VideoMetadataExtractor.formatFileSize(metadata.fileSize),
          quality: VideoMetadataExtractor.getQualityLabel(metadata.width, metadata.height)
        });
      } catch (metadataError) {
        console.warn('⚠️ Metadata extraction failed, using fallback:', metadataError);
        metadata = VideoMetadataExtractor.extractFromFileInfo(filename || 'unknown.mp4', fileSize || 0, s3Key);
      }
      
      // Step 4: Generate thumbnail (should be ready now)
      let thumbnailUrl = metadata.thumbnailUrl || muxResult.thumbnailUrl;
      
      if (isReady) {
        try {
          const thumbnailResult = await MuxVideoProcessor.generateThumbnails(playbackId, {
            times: [10, 30, 60], // Multiple thumbnail options
            width: 1920,
            height: 1080
          });
          
          if (thumbnailResult.success && thumbnailResult.thumbnails && thumbnailResult.thumbnails.length > 0) {
            thumbnailUrl = thumbnailResult.thumbnails[0].url;
            console.log('🖼️ Enhanced thumbnail generated:', thumbnailUrl);
          }
        } catch (thumbnailError) {
          console.warn('⚠️ Enhanced thumbnail generation failed, using default:', thumbnailError);
        }
      }
      
      // Step 5: Generate transcript
      let transcriptText = '';
      let captionsUrl = '';
      
      if (isReady) {
        try {
          const transcriptResult = await MuxVideoProcessor.generateCaptions(assetId, {
            language: 'en',
            generateVtt: true,
            generateSrt: false
          });
          
          if (transcriptResult.success) {
            transcriptText = transcriptResult.transcriptText || '';
            captionsUrl = transcriptResult.vttUrl || '';
            console.log('📝 Transcript generated:', transcriptText.substring(0, 100) + '...');
          }
        } catch (transcriptError) {
          console.warn('⚠️ Transcript generation failed:', transcriptError);
          // Don't fail the entire process for transcript issues
        }
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Synchronous processing complete in ${processingTime}ms`);
      
      return {
        success: true,
        thumbnailUrl,
        transcriptText,
        captionsUrl,
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        muxStreamingUrl: muxResult.streamingUrl,
        muxMp4Url: muxResult.mp4Url,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.aspectRatio,
        fileSize: metadata.fileSize,
        bitrate: metadata.bitrate,
        processingTime,
        error: !isReady ? 'Processing timeout - some features may not be immediately available' : undefined
      };
      
    } catch (error) {
      console.error('❌ Synchronous processing failed:', error);
      
      return {
        success: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }
  
  /**
   * Quick thumbnail generation for immediate display
   * Uses Mux's instant thumbnail API
   */
  static async generateQuickThumbnail(
    s3Key: string,
    videoId: string
  ): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
    try {
      console.log('🖼️ Generating quick thumbnail for:', videoId);
      
      // Create Mux asset with minimal processing
      const processingOptions = {
        ...MuxVideoProcessor.getDefaultProcessingOptions(),
        generateCaptions: false, // Skip captions for speed
        enhanceAudio: false // Skip audio enhancement for speed
      };
      
      const muxResult = await MuxVideoProcessor.createAssetFromS3(s3Key, videoId, processingOptions);
      
      if (muxResult.success && muxResult.thumbnailUrl) {
        console.log('✅ Quick thumbnail generated:', muxResult.thumbnailUrl);
        return {
          success: true,
          thumbnailUrl: muxResult.thumbnailUrl
        };
      } else {
        return {
          success: false,
          error: muxResult.error || 'Failed to generate quick thumbnail'
        };
      }
      
    } catch (error) {
      console.error('❌ Quick thumbnail generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Check if Mux processing is likely to be fast
   * Based on file size and format
   */
  static estimateProcessingTime(fileSize: number, mimeType: string): number {
    // Base processing time in milliseconds
    let estimatedTime = 30000; // 30 seconds base
    
    // Adjust based on file size (rough estimate)
    const sizeInMB = fileSize / (1024 * 1024);
    if (sizeInMB > 100) {
      estimatedTime += (sizeInMB - 100) * 500; // +500ms per MB over 100MB
    }
    
    // Adjust based on format
    if (mimeType.includes('mp4')) {
      estimatedTime *= 0.8; // MP4 processes faster
    } else if (mimeType.includes('mov')) {
      estimatedTime *= 1.2; // MOV takes longer
    } else if (mimeType.includes('avi')) {
      estimatedTime *= 1.5; // AVI takes much longer
    }
    
    // Cap at 2 minutes for synchronous processing
    return Math.min(estimatedTime, 120000);
  }
  
  /**
   * Decide whether to use synchronous or asynchronous processing
   */
  static shouldProcessSynchronously(fileSize: number, mimeType: string): boolean {
    const estimatedTime = this.estimateProcessingTime(fileSize, mimeType);
    const sizeInMB = fileSize / (1024 * 1024);
    
    // Use synchronous processing for:
    // - Small files (under 50MB)
    // - MP4 files under 100MB
    // - Estimated processing time under 90 seconds
    
    if (sizeInMB < 50) return true;
    if (mimeType.includes('mp4') && sizeInMB < 100) return true;
    if (estimatedTime < 90000) return true;
    
    return false;
  }
}

export default SynchronousMuxProcessor;
