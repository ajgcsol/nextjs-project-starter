'use client';

import React, { useState } from 'react';
import MuxUploaderComponent from '@/components/MuxUploaderComponent';

export default function MuxUploaderDemoPage() {
  const [uploadResults, setUploadResults] = useState<{
    success: boolean;
    uploadId?: string;
    assetId?: string;
    playbackId?: string;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
      variants: Array<{ time: number; url: string }>;
    };
    subtitles?: {
      vttUrl: string;
      srtUrl: string;
    };
  } | null>(null);

  const handleUploadSuccess = (data: {
    uploadId: string;
    assetId?: string;
    playbackId?: string;
  }) => {
    console.log('🎉 Upload successful:', data);
    setUploadResults({
      success: true,
      ...data
    });
  };

  const handleThumbnailsReady = (thumbnails: {
    small: string;
    medium: string;
    large: string;
    variants: Array<{ time: number; url: string }>;
  }) => {
    console.log('🖼️ Thumbnails ready:', thumbnails);
    setUploadResults(prev => prev ? {
      ...prev,
      thumbnails
    } : null);
  };

  const handleSubtitlesReady = (subtitles: {
    vttUrl: string;
    srtUrl: string;
  }) => {
    console.log('📝 Subtitles ready:', subtitles);
    setUploadResults(prev => prev ? {
      ...prev,
      subtitles
    } : null);
  };

  const handleUploadError = (error: string) => {
    console.error('❌ Upload error:', error);
    setUploadResults({
      success: false
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Mux Video Uploader Demo</h1>
          <p className="text-gray-600">
            Upload videos with automatic subtitle generation, thumbnails, and signed URLs
          </p>
        </div>

        {/* Configuration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Features Enabled</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✅ Automatic subtitle generation (English)</li>
            <li>✅ Multiple thumbnail sizes and variants</li>
            <li>✅ Signed URL generation for secure playback</li>
            <li>✅ MP4 support for downloads</li>
            <li>✅ Audio normalization</li>
            <li>✅ Real-time upload progress tracking</li>
          </ul>
        </div>

        {/* Upload Component */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Your Video</h2>
          <MuxUploaderComponent
            videoId={`demo_video_${Date.now()}`}
            title="Demo Video Upload"
            description="Upload a video to test subtitle generation and signed URLs"
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            onThumbnailsReady={handleThumbnailsReady}
            onSubtitlesReady={handleSubtitlesReady}
            config={{
              generateSubtitles: true,
              subtitleLanguage: 'en',
              playbackPolicy: 'signed',
              mp4Support: 'high',
              maxResolution: '1080p'
            }}
            className="w-full"
          />
        </div>

        {/* Results Display */}
        {uploadResults && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Results</h2>
            
            {uploadResults.success ? (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600">Upload ID</div>
                    <div className="font-mono text-sm">{uploadResults.uploadId}</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600">Asset ID</div>
                    <div className="font-mono text-sm">{uploadResults.assetId || 'Processing...'}</div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600">Playback ID</div>
                    <div className="font-mono text-sm">{uploadResults.playbackId || 'Processing...'}</div>
                  </div>
                </div>

                {/* Thumbnails */}
                {uploadResults.thumbnails && (
                  <div>
                    <h3 className="font-medium mb-2">🖼️ Generated Thumbnails</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Small (320x180)</div>
                        <img 
                          src={uploadResults.thumbnails.small} 
                          alt="Small thumbnail"
                          className="w-full h-auto border rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Medium (640x360)</div>
                        <img 
                          src={uploadResults.thumbnails.medium} 
                          alt="Medium thumbnail"
                          className="w-full h-auto border rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Large (1280x720)</div>
                        <img 
                          src={uploadResults.thumbnails.large} 
                          alt="Large thumbnail"
                          className="w-full h-auto border rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Thumbnail Variants */}
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Time Variants</div>
                      <div className="flex space-x-4">
                        {uploadResults.thumbnails.variants.map((variant, index) => (
                          <div key={index} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{variant.time}s</div>
                            <img 
                              src={variant.url} 
                              alt={`Thumbnail at ${variant.time}s`}
                              className="w-24 h-auto border rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtitles */}
                {uploadResults.subtitles && (
                  <div>
                    <h3 className="font-medium mb-2">📝 Generated Subtitles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm text-gray-600 mb-2">WebVTT Format</div>
                        <a 
                          href={uploadResults.subtitles.vttUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {uploadResults.subtitles.vttUrl}
                        </a>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-sm text-gray-600 mb-2">SRT Format</div>
                        <a 
                          href={uploadResults.subtitles.srtUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {uploadResults.subtitles.srtUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600 font-medium">
                ❌ Upload failed. Check the console for details.
              </div>
            )}
          </div>
        )}

        {/* Environment Setup Guide */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Setup Required</h3>
          <p className="text-yellow-800 text-sm mb-3">
            To use this demo, you need to configure the following environment variables in your <code>.env.local</code> file:
          </p>
          <div className="bg-yellow-100 rounded p-3 font-mono text-xs">
            <div>VIDEO_MUX_TOKEN_ID=your_mux_token_id</div>
            <div>VIDEO_MUX_TOKEN_SECRET=your_mux_token_secret</div>
            <div>MUX_SIGNING_KEY_ID=your_signing_key_id</div>
            <div>MUX_SIGNING_KEY_PRIVATE=your_base64_encoded_private_key</div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">📖 How to Use</h3>
          <ol className="text-gray-700 text-sm space-y-2 list-decimal list-inside">
            <li>Ensure you have configured your Mux credentials in the environment variables</li>
            <li>Click on the upload area above or drag and drop a video file</li>
            <li>Wait for the upload to complete and processing to finish</li>
            <li>Once ready, you'll see generated thumbnails and subtitle download links</li>
            <li>All URLs are signed and secure for your configured playback policy</li>
          </ol>
        </div>
      </div>
    </div>
  );
}