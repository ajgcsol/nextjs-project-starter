'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ThumbnailResult {
  success: boolean;
  videoId: string;
  videoTitle?: string;
  method: string;
  thumbnailUrl?: string;
  error?: string;
}

interface BatchResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  results: ThumbnailResult[];
  forceRegenerate?: boolean;
}

export default function FixThumbnailsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const fixThumbnails = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/videos/generate-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchMode: true,
          limit: 50,
          forceRegenerate
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix thumbnails');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getMethodBadge = (method: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'mediaconvert': 'default',
      'ffmpeg': 'secondary',
      'client_side': 'outline',
      'placeholder': 'destructive'
    };
    
    return (
      <Badge variant={variants[method] || 'outline'}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fix Broken Thumbnails</h1>
          <p className="text-muted-foreground mt-2">
            Regenerate thumbnails for videos with broken or missing thumbnail images.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Thumbnail Generation
            </CardTitle>
            <CardDescription>
              This will scan your video database and generate thumbnails for videos that have broken or missing thumbnails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forceRegenerate"
                checked={forceRegenerate}
                onChange={(e) => setForceRegenerate(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="forceRegenerate" className="text-sm font-medium">
                Force regenerate ALL thumbnails (not just broken ones)
              </label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={fixThumbnails} 
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing...' : 'Fix Thumbnails'}
              </Button>
            </div>

            {isProcessing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Processing videos... This may take a few minutes depending on the number of videos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Processing Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{result.processed}</div>
                  <div className="text-sm text-blue-600">Processed</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.successful}</div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-sm text-red-600">Failed</div>
                </div>
              </div>

              {result.processed === 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 No broken thumbnails found! All videos already have working thumbnails.
                  </AlertDescription>
                </Alert>
              )}

              {result.results && result.results.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Detailed Results:</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.results.map((res, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(res.success)}
                          <div>
                            <div className="font-medium">
                              {res.videoTitle || res.videoId || 'Unknown Video'}
                            </div>
                            {res.error && (
                              <div className="text-sm text-red-600">{res.error}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getMethodBadge(res.method)}
                          {res.success && res.thumbnailUrl && (
                            <a 
                              href={res.thumbnailUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>Broken Thumbnail Detection:</strong> Finds videos with API endpoint URLs, 404 errors, or placeholder thumbnails</p>
            <p>• <strong>4-Tier Fallback System:</strong> MediaConvert → FFmpeg → Client-side → Placeholder</p>
            <p>• <strong>Cloud Compatible:</strong> Works without MediaConvert using FFmpeg for beautiful SVG thumbnails</p>
            <p>• <strong>Database Updates:</strong> Automatically updates video records with new thumbnail URLs</p>
            <p>• <strong>Safe Operation:</strong> Only processes videos that actually need thumbnail fixes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
