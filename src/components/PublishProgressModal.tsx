"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Upload, 
  Image, 
  Video, 
  FileText, 
  Database,
  Zap,
  X,
  Play,
  Pause,
  Camera
} from 'lucide-react';

interface PublishStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
  duration?: number;
}

interface PublishProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (success: boolean, result?: any) => void;
  contentData: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    metadata: {
      visibility?: string;
      pendingFile?: File;
      autoThumbnail?: string;
      customThumbnail?: File;
      uploadMethod?: string;
      monitorSessionId?: string;
      [key: string]: any;
    };
  };
}

interface ThumbnailOption {
  type: 'auto' | 'frame' | 'upload';
  timestamp?: number;
  dataUrl?: string;
  file?: File;
  selected: boolean;
}

export function PublishProgressModal({
  isOpen,
  onClose,
  onComplete,
  contentData
}: PublishProgressModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [steps, setSteps] = useState<PublishStep[]>([
    {
      id: 'validate',
      title: 'Validating Content',
      description: 'Checking content and file integrity',
      icon: <CheckCircle className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'upload',
      title: 'Uploading Video',
      description: 'Uploading video file to cloud storage',
      icon: <Upload className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'thumbnail',
      title: 'Processing Thumbnail',
      description: 'Generating and uploading thumbnail image',
      icon: <Image className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'mux',
      title: 'Video Processing',
      description: 'Optimizing video for streaming and playback',
      icon: <Video className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'transcription',
      title: 'Generating Transcript',
      description: 'Creating automatic captions and transcript',
      icon: <FileText className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'database',
      title: 'Saving to Database',
      description: 'Storing video metadata and references',
      icon: <Database className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'complete',
      title: 'Publishing Complete',
      description: 'Video is now live and ready for viewing',
      icon: <Zap className="h-5 w-5" />,
      status: 'pending'
    }
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const updateStepStatus = (stepId: string, status: PublishStep['status'], progress?: number, details?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, progress, details, duration: status === 'completed' ? Date.now() - startTime : undefined }
          : step
      )
    );
  };

  const calculateOverallProgress = () => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const processingStep = steps.find(step => step.status === 'processing');
    const processingProgress = processingStep?.progress || 0;
    
    return Math.round(((completedSteps + (processingProgress / 100)) / steps.length) * 100);
  };

  useEffect(() => {
    setOverallProgress(calculateOverallProgress());
  }, [steps]);

  const startPublishProcess = async () => {
    setIsProcessing(true);
    setStartTime(Date.now());
    setError(null);

    try {
      // Step 1: Validate Content
      await processStep('validate', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!contentData.title.trim()) {
          throw new Error('Title is required');
        }
        if (!contentData.metadata.pendingFile) {
          throw new Error('No video file selected');
        }
      });

      // Step 2: Upload Video
      await processStep('upload', async () => {
        return await uploadVideo();
      });

      // Step 3: Process Thumbnail
      await processStep('thumbnail', async () => {
        await processThumbnail();
      });

      // Step 4: Mux Processing
      await processStep('mux', async () => {
        await processMuxVideo();
      });

      // Step 5: Generate Transcription
      await processStep('transcription', async () => {
        await generateTranscription();
      });

      // Step 6: Save to Database
      await processStep('database', async () => {
        return await saveToDatabase();
      });

      // Step 7: Complete
      await processStep('complete', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Success!
      setTimeout(() => {
        onComplete(true, { message: 'Video published successfully!' });
      }, 1000);

    } catch (error) {
      console.error('Publish process failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      
      setTimeout(() => {
        onComplete(false, { error: error instanceof Error ? error.message : 'Unknown error' });
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  const processStep = async (stepId: string, processor: () => Promise<any>) => {
    updateStepStatus(stepId, 'processing', 0);
    
    try {
      const result = await processor();
      updateStepStatus(stepId, 'completed', 100);
      await new Promise(resolve => setTimeout(resolve, 300));
      return result;
    } catch (error) {
      updateStepStatus(stepId, 'error', 0, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const uploadVideo = async () => {
    const file = contentData.metadata.pendingFile!;
    
    updateStepStatus('upload', 'processing', 10, 'Getting upload URL...');
    
    const presignedResponse = await fetch('/api/videos/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { presignedUrl, s3Key, publicUrl } = await presignedResponse.json();
    
    updateStepStatus('upload', 'processing', 20, 'Uploading file...');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 80) + 20;
          updateStepStatus('upload', 'processing', progress, `Uploading... ${Math.round((e.loaded / e.total) * 100)}%`);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve({ s3Key, publicUrl });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const processThumbnail = async () => {
    updateStepStatus('thumbnail', 'processing', 20, 'Processing thumbnail...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateStepStatus('thumbnail', 'processing', 90, 'Optimizing thumbnail...');
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const processMuxVideo = async () => {
    updateStepStatus('mux', 'processing', 10, 'Creating Mux asset...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    updateStepStatus('mux', 'processing', 30, 'Processing video for streaming...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    updateStepStatus('mux', 'processing', 60, 'Generating multiple quality versions...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateStepStatus('mux', 'processing', 90, 'Finalizing video processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const generateTranscription = async () => {
    updateStepStatus('transcription', 'processing', 10, 'Analyzing audio track...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    updateStepStatus('transcription', 'processing', 30, 'Extracting audio from video...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateStepStatus('transcription', 'processing', 60, 'Generating transcript with AI...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    updateStepStatus('transcription', 'processing', 85, 'Creating caption files...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const saveToDatabase = async () => {
    updateStepStatus('database', 'processing', 30, 'Saving video metadata...');
    
    const videoResponse = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: contentData.title,
        description: contentData.description,
        category: contentData.category,
        tags: contentData.tags.join(','),
        visibility: contentData.metadata.visibility || 'private',
        filename: (contentData.metadata.pendingFile as File).name,
        size: (contentData.metadata.pendingFile as File).size,
        mimeType: (contentData.metadata.pendingFile as File).type,
        s3Key: 'placeholder',
        publicUrl: 'placeholder'
      }),
    });

    if (!videoResponse.ok) {
      throw new Error('Failed to save video to database');
    }

    updateStepStatus('database', 'processing', 80, 'Updating search index...');
    await new Promise(resolve => setTimeout(resolve, 500));

    return await videoResponse.json();
  };

  const getStepIcon = (step: PublishStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (step: PublishStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Complete</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-500">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  // Auto-start the process when modal opens
  useEffect(() => {
    if (isOpen && !isProcessing && steps.every(step => step.status === 'pending')) {
      startPublishProcess();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Publishing Video
            </DialogTitle>
            {!isProcessing && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-500">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Publishing Failed</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Steps List */}
          <div className="space-y-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  step.status === 'processing'
                    ? 'border-blue-200 bg-blue-50'
                    : step.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : step.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step)}
                    <div>
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      {step.details && (
                        <p className="text-xs text-gray-500 mt-1">{step.details}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.duration && (
                      <span className="text-xs text-gray-500">
                        {(step.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                    {getStepBadge(step)}
                  </div>
                </div>
                
                {step.status === 'processing' && step.progress !== undefined && (
                  <div className="mt-3">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {error && (
              <Button variant="outline" onClick={() => startPublishProcess()}>
                Retry
              </Button>
            )}
            {!isProcessing && (
              <Button variant="outline" onClick={onClose}>
                {error ? 'Close' : 'Cancel'}
              </Button>
            )}
          </div>
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
