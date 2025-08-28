'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Video,
  Users,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';

interface ProcessingItem {
  id: string;
  title: string;
  type: 'video' | 'transcript' | 'subtitles' | 'speakers';
  status: 'processing' | 'completed' | 'failed' | 'pending';
  progress?: number;
  startTime: string;
  estimatedCompletion?: string;
  details?: string;
  videoId?: string;
  error?: string;
}

interface ProcessingQueueProps {
  className?: string;
}

export function ProcessingQueue({ className = '' }: ProcessingQueueProps) {
  const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch processing queue
  const fetchProcessingQueue = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/processing-queue');
      
      if (!response.ok) {
        throw new Error('Failed to fetch processing queue');
      }
      
      const data = await response.json();
      setProcessingItems(data.items || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching processing queue:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for updates every 10 seconds
  useEffect(() => {
    fetchProcessingQueue();
    
    const interval = setInterval(fetchProcessingQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ProcessingItem['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getTypeIcon = (type: ProcessingItem['type']) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'transcript':
      case 'subtitles':
        return <FileText className="h-4 w-4" />;
      case 'speakers':
        return <Users className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ProcessingItem['status']) => {
    const variants = {
      processing: 'default',
      completed: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    } as const;
    
    const colors = {
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge 
        variant={variants[status]} 
        className={colors[status]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
    return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`;
  };

  const retryProcessing = async (itemId: string) => {
    try {
      const response = await fetch(`/api/processing-queue/${itemId}/retry`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchProcessingQueue(); // Refresh the queue
      }
    } catch (error) {
      console.error('Error retrying processing:', error);
    }
  };

  const viewVideo = (videoId: string) => {
    window.open(`/dashboard/videos/${videoId}`, '_blank');
  };

  if (isLoading && processingItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Processing Queue
          </CardTitle>
          <CardDescription>Real-time video processing status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Loading processing queue...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Processing Queue
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProcessingQueue}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (processingItems.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Processing Queue
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProcessingQueue}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>No items currently processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm">All processing complete!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Processing Queue
          <Badge variant="secondary" className="ml-2">
            {processingItems.filter(item => item.status === 'processing').length} active
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProcessingQueue}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time video processing status and subtitle generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {processingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-shrink-0">
                {getTypeIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium truncate">{item.title}</h4>
                  {getStatusBadge(item.status)}
                </div>
                
                <p className="text-xs text-gray-600 mb-2">
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • 
                  Started {getElapsedTime(item.startTime)} ago
                  {item.estimatedCompletion && (
                    <span> • Est. {item.estimatedCompletion}</span>
                  )}
                </p>
                
                {item.progress !== undefined && item.status === 'processing' && (
                  <div className="space-y-1">
                    <Progress value={item.progress} className="h-1" />
                    <p className="text-xs text-gray-500">{item.progress}% complete</p>
                  </div>
                )}
                
                {item.details && (
                  <p className="text-xs text-blue-600 mt-1">{item.details}</p>
                )}
                
                {item.error && (
                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                )}
              </div>
              
              <div className="flex-shrink-0 flex items-center gap-2">
                {item.videoId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewVideo(item.videoId!)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                )}
                
                {item.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retryProcessing(item.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProcessingQueue;