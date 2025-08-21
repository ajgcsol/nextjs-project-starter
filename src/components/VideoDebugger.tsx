'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Database,
  Cloud,
  Video
} from 'lucide-react';

interface VideoDebuggerProps {
  videoId: string;
}

interface DiagnosticResult {
  videoId: string;
  timestamp: string;
  database: {
    found: boolean;
    title?: string;
    s3_key?: string;
    s3_bucket?: string;
    file_path?: string;
    file_size?: number;
    is_processed?: boolean;
  };
  aws: {
    region?: string;
    hasCredentials: boolean;
    bucketName?: string;
  };
  urls: {
    streamingEndpoint: string;
    directS3?: string | null;
    cloudFront?: string | null;
  };
  tests: {
    presignedUrl?: {
      success: boolean;
      url?: string;
      expiresIn?: number;
      error?: string;
    };
    s3Access?: {
      success: boolean;
      status?: number;
      statusText?: string;
      contentType?: string;
      contentLength?: string;
      lastModified?: string;
      error?: string;
    };
  };
}

export function VideoDebugger({ videoId }: VideoDebuggerProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/debug/video-diagnostics?id=${videoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Diagnostics failed');
      }
      
      setDiagnostics(data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const testVideoPlayback = async () => {
    if (!diagnostics?.tests.presignedUrl?.success) {
      setError('Cannot test playback - presigned URL generation failed');
      return;
    }

    try {
      // Try to load the video element
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const loadPromise = new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          resolve({
            duration: video.duration,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState
          });
        };
        
        video.onerror = () => {
          const error = video.error;
          const errorMessage = error ? `Video error code: ${error.code}` : 'Unknown video error';
          reject(new Error(errorMessage));
        };
        
        // Set timeout
        setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);
      });
      
      video.src = diagnostics.urls.streamingEndpoint;
      
      const result = await loadPromise;
      console.log('Video metadata loaded:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Video test failed';
      setError(`Video playback test failed: ${errorMessage}`);
    }
  };

  useEffect(() => {
    // Auto-run diagnostics on mount
    runDiagnostics();
  }, [videoId]);

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <Clock className="h-4 w-4 text-gray-400" />;
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (success: boolean | undefined) => {
    if (success === undefined) return <Badge variant="secondary">Pending</Badge>;
    return success ? 
      <Badge variant="default" className="bg-green-500">Success</Badge> : 
      <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Diagnostics
        </CardTitle>
        <CardDescription>
          CloudWatch monitoring for video ID: {videoId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button 
            onClick={testVideoPlayback} 
            disabled={loading || !diagnostics?.tests.presignedUrl?.success}
            variant="outline"
          >
            Test Playback
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {diagnostics && (
          <div className="space-y-4">
            {/* Database Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4" />
                <h3 className="font-medium">Database</h3>
                {getStatusBadge(diagnostics.database.found)}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Title: {diagnostics.database.title}</p>
                <p>S3 Key: {diagnostics.database.s3_key}</p>
                <p>S3 Bucket: {diagnostics.database.s3_bucket}</p>
                <p>File Size: {diagnostics.database.file_size ? `${(diagnostics.database.file_size / (1024*1024)).toFixed(2)} MB` : 'Unknown'}</p>
                <p>Processed: {diagnostics.database.is_processed ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* AWS Status */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-4 w-4" />
                <h3 className="font-medium">AWS Configuration</h3>
                {getStatusBadge(diagnostics.aws.hasCredentials)}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Region: {diagnostics.aws.region}</p>
                <p>Bucket: {diagnostics.aws.bucketName}</p>
                <p>Credentials: {diagnostics.aws.hasCredentials ? 'Configured' : 'Missing'}</p>
              </div>
            </div>

            {/* Presigned URL Test */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(diagnostics.tests.presignedUrl?.success)}
                <h3 className="font-medium">Presigned URL Generation</h3>
                {getStatusBadge(diagnostics.tests.presignedUrl?.success)}
              </div>
              {diagnostics.tests.presignedUrl?.error && (
                <p className="text-sm text-red-600">{diagnostics.tests.presignedUrl.error}</p>
              )}
              {diagnostics.tests.presignedUrl?.success && (
                <p className="text-sm text-green-600">URL generated successfully (expires in {diagnostics.tests.presignedUrl.expiresIn}s)</p>
              )}
            </div>

            {/* S3 Access Test */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(diagnostics.tests.s3Access?.success)}
                <h3 className="font-medium">S3 File Access</h3>
                {getStatusBadge(diagnostics.tests.s3Access?.success)}
              </div>
              {diagnostics.tests.s3Access?.error && (
                <p className="text-sm text-red-600">{diagnostics.tests.s3Access.error}</p>
              )}
              {diagnostics.tests.s3Access?.success && (
                <div className="text-sm text-green-600 space-y-1">
                  <p>Status: {diagnostics.tests.s3Access.status} {diagnostics.tests.s3Access.statusText}</p>
                  <p>Content-Type: {diagnostics.tests.s3Access.contentType}</p>
                  <p>Content-Length: {diagnostics.tests.s3Access.contentLength}</p>
                  <p>Last-Modified: {diagnostics.tests.s3Access.lastModified}</p>
                </div>
              )}
            </div>

            {/* URLs */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Available URLs</h3>
              <div className="text-sm space-y-1">
                <p><strong>Streaming Endpoint:</strong> {diagnostics.urls.streamingEndpoint}</p>
                {diagnostics.urls.directS3 && (
                  <p><strong>Direct S3:</strong> {diagnostics.urls.directS3.substring(0, 80)}...</p>
                )}
                {diagnostics.urls.cloudFront && (
                  <p><strong>CloudFront:</strong> {diagnostics.urls.cloudFront.substring(0, 80)}...</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
