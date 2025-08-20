'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface UploadStep {
  step: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  details: any;
  error?: string;
}

interface UploadSession {
  sessionId: string;
  filename: string;
  fileSize: number;
  startTime: string;
  steps: UploadStep[];
  currentStatus: 'active' | 'completed' | 'failed';
}

interface SessionSummary {
  sessionId: string;
  filename: string;
  fileSize: number;
  startTime: string;
  currentStatus: 'active' | 'completed' | 'failed';
  stepCount: number;
  lastStep: string;
}

export default function UploadMonitorPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<UploadSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/debug/upload-monitor?action=list');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/debug/upload-monitor?sessionId=${sessionId}`);
      const data = await response.json();
      setSelectedSession(data.session);
    } catch (error) {
      console.error('Failed to fetch session details:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSessions, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-500">Active</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Monitor Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of video upload processes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={fetchSessions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Sessions ({sessions.length})</CardTitle>
            <CardDescription>
              Click on a session to view detailed step-by-step progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No upload sessions found. Start a video upload to see monitoring data.
                  </AlertDescription>
                </Alert>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedSession?.sessionId === session.sessionId ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => fetchSessionDetails(session.sessionId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate">{session.filename}</span>
                      {getStatusBadge(session.currentStatus)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Size: {formatFileSize(session.fileSize)}</div>
                      <div>Started: {formatTimestamp(session.startTime)}</div>
                      <div>Steps: {session.stepCount} | Last: {session.lastStep}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>
              {selectedSession ? `Monitoring ${selectedSession.filename}` : 'Select a session to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSession ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Session ID:</strong>
                    <div className="font-mono text-xs">{selectedSession.sessionId}</div>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <div>{getStatusBadge(selectedSession.currentStatus)}</div>
                  </div>
                  <div>
                    <strong>File Size:</strong>
                    <div>{formatFileSize(selectedSession.fileSize)}</div>
                  </div>
                  <div>
                    <strong>Started:</strong>
                    <div>{formatTimestamp(selectedSession.startTime)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Upload Steps ({selectedSession.steps.length})</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedSession.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 border rounded">
                        {getStatusIcon(step.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{step.step}</span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(step.timestamp)}
                            </span>
                          </div>
                          {step.error && (
                            <div className="text-red-600 text-sm mt-1">{step.error}</div>
                          )}
                          {step.details && Object.keys(step.details).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer">
                                View Details
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(step.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select an upload session from the list to view detailed step-by-step progress.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>How to use:</strong> This dashboard monitors video uploads in real-time. 
          Start a video upload in the application and watch the progress here. 
          Each step of the upload process is tracked with timestamps and detailed information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
