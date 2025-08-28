'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MuxUploaderHandler, type MuxUploaderConfig, type MuxUploadStatus } from '@/lib/mux-uploader-handler';
import { createMuxSignedPlaybackFromEnv } from '@/lib/mux-signed-playback';

// Dynamically import MuxUploader to avoid SSR issues
const MuxUploader = dynamic(
  () => import('@mux/mux-uploader-react'),
  { ssr: false }
);

export interface MuxUploaderComponentProps {
  videoId: string;
  title?: string;
  description?: string;
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadSuccess?: (data: {
    uploadId: string;
    assetId?: string;
    playbackId?: string;
  }) => void;
  onUploadError?: (error: string) => void;
  onSubtitlesReady?: (subtitleUrls: {
    vttUrl: string;
    srtUrl: string;
  }) => void;
  onThumbnailsReady?: (thumbnails: {
    small: string;
    medium: string;
    large: string;
    variants: Array<{ time: number; url: string }>;
  }) => void;
  className?: string;
  config?: Partial<MuxUploaderConfig>;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  uploadId?: string;
  assetId?: string;
  playbackId?: string;
  endpoint?: string;
  error?: string;
  subtitlesReady?: boolean;
}

export default function MuxUploaderComponent({
  videoId,
  title,
  description,
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError,
  onSubtitlesReady,
  onThumbnailsReady,
  className = '',
  config = {}
}: MuxUploaderComponentProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0
  });

  const [isPolling, setIsPolling] = useState(false);

  // Initialize upload endpoint
  useEffect(() => {
    initializeUpload();
  }, [videoId]);

  const initializeUpload = async () => {
    try {
      const corsOrigin = window.location.origin;
      const uploaderConfig = {
        ...MuxUploaderHandler.getDefaultConfig(videoId, corsOrigin),
        ...config
      };

      const endpointResult = await fetch('/api/mux/create-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: uploaderConfig
        })
      });

      const endpointData = await endpointResult.json();

      if (endpointData.success) {
        setUploadState(prev => ({
          ...prev,
          endpoint: endpointData.endpoint,
          uploadId: endpointData.uploadId
        }));
        
        console.log('🔗 Mux upload endpoint created:', endpointData.uploadId);
      } else {
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: endpointData.error || 'Failed to create upload endpoint'
        }));
      }
    } catch (error) {
      console.error('❌ Failed to initialize upload:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to initialize upload'
      }));
    }
  };

  // Poll upload status
  const pollUploadStatus = useCallback(async (uploadId: string) => {
    if (isPolling) return;
    
    setIsPolling(true);
    
    try {
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/mux/upload-status/${uploadId}`);
          const statusData = await statusResponse.json();

          if (statusData.success) {
            const status: MuxUploadStatus = statusData.status;
            
            setUploadState(prev => ({
              ...prev,
              assetId: status.assetId,
              playbackId: status.playbackId,
              status: status.status === 'ready' ? 'ready' : 'processing'
            }));

            if (status.status === 'ready' && status.assetId && status.playbackId) {
              // Upload completed successfully
              clearInterval(pollInterval);
              setIsPolling(false);
              
              onUploadSuccess?.({
                uploadId,
                assetId: status.assetId,
                playbackId: status.playbackId
              });

              // Handle thumbnails from the status response
              if (statusData.urls?.thumbnails) {
                console.log('🖼️ Thumbnails ready:', statusData.urls.thumbnails);
                onThumbnailsReady?.(statusData.urls.thumbnails);
              }

              // Check for subtitles
              checkSubtitleStatus(status.assetId);
              
            } else if (status.status === 'errored') {
              clearInterval(pollInterval);
              setIsPolling(false);
              
              const errorMsg = status.error || 'Upload processing failed';
              setUploadState(prev => ({
                ...prev,
                status: 'error',
                error: errorMsg
              }));
              onUploadError?.(errorMsg);
            }
          }
          
        } catch (pollError) {
          console.error('❌ Error polling upload status:', pollError);
        }
      }, 2000); // Poll every 2 seconds

      // Clear polling after 10 minutes max
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsPolling(false);
      }, 10 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Failed to start polling:', error);
      setIsPolling(false);
    }
  }, [isPolling, onUploadSuccess, onUploadError]);

  // Check subtitle status
  const checkSubtitleStatus = async (assetId: string) => {
    try {
      const subtitleResponse = await fetch(`/api/mux/subtitle-status/${assetId}`);
      const subtitleData = await subtitleResponse.json();

      if (subtitleData.success && subtitleData.hasSubtitles) {
        // Generate signed URLs if using signed playback
        const signedPlayback = createMuxSignedPlaybackFromEnv();
        
        if (signedPlayback && uploadState.playbackId) {
          const signedUrls = signedPlayback.getAllSignedUrls(uploadState.playbackId, {
            includeSubtitles: true,
            subtitleTracks: subtitleData.subtitleTracks
          });
          
          if (signedUrls.subtitles && signedUrls.subtitles.length > 0) {
            onSubtitlesReady?.({
              vttUrl: signedUrls.subtitles[0].vttUrl,
              srtUrl: signedUrls.subtitles[0].srtUrl
            });
          }
        }
        
        setUploadState(prev => ({
          ...prev,
          subtitlesReady: true
        }));
      }
    } catch (error) {
      console.error('❌ Error checking subtitle status:', error);
    }
  };

  // Handle upload events
  const handleUploadStart = () => {
    setUploadState(prev => ({
      ...prev,
      status: 'uploading',
      progress: 0
    }));
    
    onUploadStart?.();
    console.log('📤 Upload started for video:', videoId);
  };

  const handleUploadProgress = (event: CustomEvent) => {
    const progress = Math.round((event.detail?.progress || 0) * 100);
    
    setUploadState(prev => ({
      ...prev,
      progress
    }));
    
    onUploadProgress?.(progress);
  };

  const handleUploadSuccess = (event: CustomEvent) => {
    console.log('✅ Upload completed:', event.detail);
    
    setUploadState(prev => ({
      ...prev,
      status: 'processing',
      progress: 100
    }));

    // Start polling for asset status
    if (uploadState.uploadId) {
      pollUploadStatus(uploadState.uploadId);
    }
  };

  const handleUploadError = (event: CustomEvent) => {
    const errorMsg = event.detail?.message || 'Upload failed';
    
    setUploadState(prev => ({
      ...prev,
      status: 'error',
      error: errorMsg
    }));
    
    onUploadError?.(errorMsg);
    console.error('❌ Upload error:', errorMsg);
  };

  const getStatusMessage = () => {
    switch (uploadState.status) {
      case 'idle':
        return 'Ready to upload';
      case 'uploading':
        return `Uploading... ${uploadState.progress}%`;
      case 'processing':
        return 'Processing video and generating subtitles...';
      case 'ready':
        return uploadState.subtitlesReady ? 'Video ready with subtitles!' : 'Video ready!';
      case 'error':
        return `Error: ${uploadState.error}`;
      default:
        return 'Initializing...';
    }
  };

  const getProgressColor = () => {
    switch (uploadState.status) {
      case 'error':
        return 'bg-red-500';
      case 'ready':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (!uploadState.endpoint) {
    return (
      <div className={`p-4 border-2 border-dashed border-gray-300 rounded-lg text-center ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-600">Initializing uploader...</p>
        {uploadState.error && (
          <p className="text-red-500 text-sm mt-2">{uploadState.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Component */}
      <div className="relative">
        <MuxUploader
          endpoint={uploadState.endpoint}
          onUploadStart={handleUploadStart}
          onProgress={handleUploadProgress}
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
          style={{ 
            width: '100%', 
            minHeight: '200px',
            '--button-border-radius': '8px',
            '--upload-border-radius': '8px'
          } as React.CSSProperties}
        />
        
        {/* Overlay for processing state */}
        {(uploadState.status === 'processing' || uploadState.status === 'ready') && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              {uploadState.status === 'processing' && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              )}
              {uploadState.status === 'ready' && (
                <div className="text-green-400 text-4xl mb-2">✓</div>
              )}
              <p className="font-medium">{getStatusMessage()}</p>
              {uploadState.playbackId && (
                <p className="text-sm opacity-80 mt-1">Playback ID: {uploadState.playbackId}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Information */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{title || `Video ${videoId}`}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            uploadState.status === 'ready' ? 'bg-green-100 text-green-800' :
            uploadState.status === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {uploadState.status.toUpperCase()}
          </span>
        </div>

        {/* Progress Bar */}
        {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ 
                width: uploadState.status === 'processing' ? '100%' : `${uploadState.progress}%` 
              }}
            ></div>
          </div>
        )}

        {/* Status Message */}
        <p className="text-sm text-gray-600">{getStatusMessage()}</p>

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-400">Debug Info</summary>
            <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
              {JSON.stringify(uploadState, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}