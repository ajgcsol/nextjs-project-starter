"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Download,
  Globe
} from "lucide-react";

interface TestResult {
  test: string;
  url?: string;
  success: boolean;
  status?: number;
  responseTime?: number;
  error?: string;
  headers?: Record<string, string | null>;
  metadata?: any;
}

interface CloudFrontTestResults {
  videoId: string;
  videoSize: number;
  videoTitle: string;
  s3Key: string;
  tests: TestResult[];
  analysis: {
    overallHealth: string;
    issues: string[];
    recommendations: string[];
  };
}

export default function VideoStreamingDebugPage() {
  const [videoId, setVideoId] = useState("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<CloudFrontTestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCloudFrontTest = async () => {
    if (!videoId.trim()) {
      setError("Please enter a video ID");
      return;
    }

    setTesting(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`/api/debug/cloudfront-test?videoId=${encodeURIComponent(videoId.trim())}`);
      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown';
    
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Video Streaming Debug</h1>
            <p className="text-slate-600 mt-2">
              Test CloudFront configuration and video streaming performance for large files
            </p>
          </div>

          {/* Test Input */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                CloudFront & Streaming Test
              </CardTitle>
              <CardDescription>
                Enter a video ID to test CloudFront delivery, range request support, and streaming performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter video ID (e.g., 948f8a51-7f5a-45c3-b68b-6b977688d5b1)"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={runCloudFrontTest}
                  disabled={testing}
                  className="min-w-[120px]"
                >
                  {testing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {results && (
            <div className="space-y-6">
              {/* Video Info */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Video Information</span>
                    {getHealthBadge(results.analysis.overallHealth)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Video ID</label>
                      <p className="text-sm font-mono">{results.videoId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">Title</label>
                      <p className="text-sm">{results.videoTitle}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">File Size</label>
                      <p className="text-sm">{formatFileSize(results.videoSize)}</p>
                    </div>
                  </div>
                  {results.s3Key && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-slate-600">S3 Key</label>
                      <p className="text-sm font-mono break-all">{results.s3Key}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>
                    Detailed results for CloudFront delivery, range requests, and streaming endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.tests.map((test, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(test.success)}
                            <h4 className="font-medium">{test.test}</h4>
                          </div>
                          {test.responseTime && (
                            <Badge variant="outline">
                              {test.responseTime}ms
                            </Badge>
                          )}
                        </div>
                        
                        {test.url && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-slate-600">URL</label>
                            <p className="text-xs font-mono break-all text-slate-800">{test.url}</p>
                          </div>
                        )}

                        {test.status && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-slate-600">HTTP Status</label>
                            <p className="text-xs">
                              <Badge variant={test.status < 300 ? "default" : "destructive"}>
                                {test.status}
                              </Badge>
                            </p>
                          </div>
                        )}

                        {test.error && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-slate-600">Error</label>
                            <p className="text-xs text-red-600">{test.error}</p>
                          </div>
                        )}

                        {test.headers && Object.keys(test.headers).length > 0 && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-slate-600">Important Headers</label>
                            <div className="text-xs space-y-1 mt-1">
                              {Object.entries(test.headers).map(([key, value]) => (
                                value && (
                                  <div key={key} className="flex justify-between">
                                    <span className="font-mono text-slate-600">{key}:</span>
                                    <span className="font-mono">{value}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}

                        {test.metadata && (
                          <div className="mb-2">
                            <label className="text-xs font-medium text-slate-600">Metadata</label>
                            <div className="text-xs space-y-1 mt-1">
                              {Object.entries(test.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-mono text-slate-600">{key}:</span>
                                  <span className="font-mono">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Analysis */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {results.analysis.issues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-red-800 mb-2">Issues Found</h4>
                      <ul className="space-y-1">
                        {results.analysis.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {results.analysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.analysis.issues.length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-medium">All tests passed!</p>
                      <p className="text-green-600 text-sm">CloudFront and streaming are configured correctly.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`/dashboard/videos/${results.videoId}`, '_blank')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      View Video
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`/api/videos/stream/${results.videoId}`, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Test Stream
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(`https://d24qjgz9z4yzof.cloudfront.net/${results.s3Key}`, '_blank')}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Direct CloudFront
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>How to Use This Tool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600">
                <p>1. Enter a video ID from your database (you can find these in the videos dashboard)</p>
                <p>2. Click "Run Test" to perform comprehensive CloudFront and streaming tests</p>
                <p>3. Review the results to identify issues with large video streaming</p>
                <p>4. Follow the recommendations to fix any configuration problems</p>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">What This Tool Tests:</h4>
                <ul className="space-y-1 text-slate-600">
                  <li>• CloudFront URL accessibility and response times</li>
                  <li>• Range request support (critical for large video streaming)</li>
                  <li>• Streaming endpoint functionality and redirects</li>
                  <li>• Video file metadata and format validation</li>
                  <li>• Cache headers and CloudFront configuration</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
