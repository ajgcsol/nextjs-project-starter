'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Video {
  id: string;
  title: string;
  filename: string;
  s3_key?: string;
  thumbnail_path?: string;
  file_path?: string;
  uploaded_at: string;
}

interface ThumbnailResult {
  success: boolean;
  method: string;
  thumbnailUrl?: string;
  s3Key?: string;
  jobId?: string;
  error?: string;
  videoInfo?: any;
}

interface Config {
  mediaconvert: {
    available: boolean;
    role_arn: string;
    endpoint: string;
  };
  aws: {
    access_key: string;
    secret_key: string;
    region: string;
    s3_bucket: string;
  };
  cloudfront: {
    domain: string;
  };
  environment: {
    vercel: boolean;
    netlify: boolean;
    node_env: string;
  };
}

export default function ThumbnailTestPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ [key: string]: ThumbnailResult }>({});

  useEffect(() => {
    loadVideos();
    loadConfig();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos/test-thumbnail?action=list-videos&limit=20');
      const data = await response.json();
      if (data.success) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/videos/test-thumbnail?action=check-config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const testThumbnail = async (videoId: string, method: string = 'auto') => {
    setLoading(true);
    try {
      const response = await fetch('/api/videos/test-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, method }),
      });

      const result = await response.json();
      setResults(prev => ({
        ...prev,
        [videoId]: result
      }));
    } catch (error) {
      console.error('Thumbnail test failed:', error);
      setResults(prev => ({
        ...prev,
        [videoId]: {
          success: false,
          method: 'error',
          error: 'Network error'
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const batchTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/videos/generate-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchMode: true, limit: 5 }),
      });

      const result = await response.json();
      console.log('Batch result:', result);
      
      // Reload videos to see updated thumbnails
      await loadVideos();
    } catch (error) {
      console.error('Batch test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Thumbnail Generation Test</h1>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Configuration Status */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
            <CardDescription>Current system configuration for thumbnail generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">MediaConvert</h4>
                <Badge variant={config.mediaconvert.available ? "default" : "destructive"}>
                  {config.mediaconvert.available ? "Available" : "Not Available"}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Role ARN: {config.mediaconvert.role_arn}</div>
                  <div>Endpoint: {config.mediaconvert.endpoint}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">AWS</h4>
                <Badge variant={config.aws.access_key === 'configured' ? "default" : "destructive"}>
                  {config.aws.access_key === 'configured' ? "Configured" : "Missing"}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Region: {config.aws.region}</div>
                  <div>S3 Bucket: {config.aws.s3_bucket}</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Environment</h4>
                <Badge variant="outline">
                  {config.environment.node_env}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Vercel: {config.environment.vercel ? 'Yes' : 'No'}</div>
                  <div>CloudFront: {config.cloudfront.domain}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Actions</CardTitle>
          <CardDescription>Test thumbnail generation for multiple videos</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={batchTest} 
            disabled={loading}
            className="mr-2"
          >
            {loading ? 'Processing...' : 'Run Batch Thumbnail Generation'}
          </Button>
          <Button 
            onClick={loadVideos} 
            variant="outline"
          >
            Reload Videos
          </Button>
        </CardContent>
      </Card>

      {/* Videos List */}
      <Card>
        <CardHeader>
          <CardTitle>Videos Without Thumbnails ({videos.length})</CardTitle>
          <CardDescription>Test thumbnail generation for individual videos</CardDescription>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <Alert>
              <AlertDescription>
                No videos found that need thumbnails. All videos may already have thumbnails generated.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{video.title}</h3>
                      <p className="text-sm text-gray-600">{video.filename}</p>
                      <p className="text-xs text-gray-500">ID: {video.id}</p>
                      {video.s3_key && (
                        <p className="text-xs text-gray-500">S3: {video.s3_key}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => testThumbnail(video.id, 'auto')}
                        disabled={loading}
                      >
                        Auto
                      </Button>
                      {video.s3_key && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testThumbnail(video.id, 'mediaconvert')}
                            disabled={loading}
                          >
                            MediaConvert
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testThumbnail(video.id, 'ffmpeg')}
                            disabled={loading}
                          >
                            FFmpeg
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testThumbnail(video.id, 'placeholder')}
                        disabled={loading}
                      >
                        Placeholder
                      </Button>
                    </div>
                  </div>

                  {/* Test Results */}
                  {results[video.id] && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={results[video.id].success ? "default" : "destructive"}>
                          {results[video.id].success ? "Success" : "Failed"}
                        </Badge>
                        <Badge variant="outline">
                          {results[video.id].method}
                        </Badge>
                      </div>
                      
                      {results[video.id].success ? (
                        <div className="space-y-1 text-sm">
                          {results[video.id].thumbnailUrl && (
                            <div>
                              <strong>Thumbnail URL:</strong>{' '}
                              <a 
                                href={results[video.id].thumbnailUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {results[video.id].thumbnailUrl}
                              </a>
                            </div>
                          )}
                          {results[video.id].s3Key && (
                            <div><strong>S3 Key:</strong> {results[video.id].s3Key}</div>
                          )}
                          {results[video.id].jobId && (
                            <div><strong>Job ID:</strong> {results[video.id].jobId}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-red-600">
                          <strong>Error:</strong> {results[video.id].error}
                        </div>
                      )}

                      {/* Show thumbnail preview if available */}
                      {results[video.id].success && results[video.id].thumbnailUrl && (
                        <div className="mt-2">
                          <img 
                            src={results[video.id].thumbnailUrl} 
                            alt="Generated thumbnail"
                            className="max-w-xs max-h-32 object-contain border rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
