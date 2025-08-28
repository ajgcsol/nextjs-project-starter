"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
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
  Camera,
  Clock,
  UploadCloud,
  Eye,
  Mic,
  Settings,
  Smartphone,
  Tablet,
  Monitor,
  Users,
  UserCheck
} from 'lucide-react';
import { SpeakerIdentification } from './SpeakerIdentification';
import MuxUploaderComponent from './MuxUploaderComponent';

interface UploadFirstMuxModalProps {
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

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  details?: string;
  duration?: number;
}

interface ThumbnailData {
  small: string;
  medium: string;
  large: string;
  variants: Array<{ time: number; url: string }>;
}

interface SubtitleData {
  vttUrl: string;
  srtUrl: string;
}

interface TranscriptData {
  text: string;
  speakerCount: number;
  captionUrl?: string;
}

export function UploadFirstMuxModal({
  isOpen,
  onClose,
  onComplete,
  contentData
}: UploadFirstMuxModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Modal state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Upload state
  const [uploadResults, setUploadResults] = useState<{
    videoId?: string;
    uploadId?: string;
    assetId?: string;
    playbackId?: string;
    thumbnails?: ThumbnailData;
    subtitles?: SubtitleData;
  }>({});
  
  // Processing steps
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    {
      id: 'upload',
      title: 'Video Upload',
      description: 'Uploading video directly to Mux',
      icon: <UploadCloud className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'processing',
      title: 'Video Processing',
      description: 'Mux is processing your video and generating thumbnails',
      icon: <Video className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'subtitles',
      title: 'Subtitle Generation',
      description: 'Auto-generating subtitles and captions',
      icon: <FileText className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'database',
      title: 'Database Storage',
      description: 'Saving video information and metadata',
      icon: <Database className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'speaker_identification',
      title: 'Speaker Identification',
      description: 'Identifying speakers in the transcript (if applicable)',
      icon: <Users className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'completion',
      title: 'Finalization',
      description: 'Completing upload and indexing',
      icon: <CheckCircle className="h-4 w-4" />,
      status: 'pending'
    }
  ]);

  // Advanced state
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [showSpeakerIdentification, setShowSpeakerIdentification] = useState(false);
  const [selectedThumbnails, setSelectedThumbnails] = useState<ThumbnailData | null>(null);

  // Utility function to update step status
  const updateStepStatus = (
    stepId: string, 
    status: ProcessingStep['status'], 
    progress?: number, 
    details?: string
  ) => {
    setProcessingSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        const updatedStep = { ...step, status, details };
        if (progress !== undefined) {
          updatedStep.progress = progress;
        }
        return updatedStep;
      }
      return step;
    }));
  };

  // Reset modal state
  const resetModalState = () => {
    setIsProcessing(false);
    setError(null);
    setUploadResults({});
    setTranscriptData(null);
    setShowSpeakerIdentification(false);
    setSelectedThumbnails(null);
    setStartTime(0);
    
    // Reset all steps to pending
    setProcessingSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      progress: undefined,
      details: undefined,
      duration: undefined
    })));
  };

  // Handle modal close
  const handleClose = () => {
    if (!isProcessing) {
      resetModalState();
      onClose();
    }
  };

  // Mux upload handlers
  const handleUploadStart = () => {
    setIsProcessing(true);
    setStartTime(Date.now());
    updateStepStatus('upload', 'processing', 0, 'Starting upload to Mux...');
  };

  const handleUploadProgress = (progress: number) => {
    updateStepStatus('upload', 'processing', progress, `Uploading... ${progress}%`);
  };

  const handleUploadSuccess = async (data: {
    uploadId: string;
    assetId?: string;
    playbackId?: string;
  }) => {
    console.log('🎉 Mux upload successful:', data);
    
    updateStepStatus('upload', 'completed', 100, 'Upload completed successfully!');
    updateStepStatus('processing', 'processing', 0, 'Processing video and generating assets...');
    
    setUploadResults(prev => ({ ...prev, ...data }));
    
    // Start polling for processing completion
    // The MuxUploaderComponent handles this internally, so we just wait for the callbacks
  };

  const handleThumbnailsReady = (thumbnails: ThumbnailData) => {
    console.log('🖼️ Thumbnails ready:', thumbnails);
    
    setSelectedThumbnails(thumbnails);
    setUploadResults(prev => ({ ...prev, thumbnails }));
    
    updateStepStatus('processing', 'completed', 100, 'Video processing completed with thumbnails!');
    updateStepStatus('subtitles', 'processing', 0, 'Checking subtitle generation...');
  };

  const handleSubtitlesReady = async (subtitles: SubtitleData) => {
    console.log('📝 Subtitles ready:', subtitles);
    
    setUploadResults(prev => ({ ...prev, subtitles }));
    
    updateStepStatus('subtitles', 'processing', 50, 'Fetching transcript data...');
    
    // Try to fetch the transcript content for speaker identification
    try {
      const transcriptResponse = await fetch(subtitles.vttUrl);
      if (transcriptResponse.ok) {
        const transcriptContent = await transcriptResponse.text();
        
        // Parse VTT content to extract transcript text
        const transcriptText = parseVTTContent(transcriptContent);
        const speakerCount = countSpeakersInTranscript(transcriptText);
        
        setTranscriptData({
          text: transcriptText,
          speakerCount,
          captionUrl: subtitles.vttUrl
        });
        
        updateStepStatus('subtitles', 'completed', 100, `Subtitles ready! ${speakerCount > 1 ? `Found ${speakerCount} speakers` : 'Single speaker detected'}`);
        
        // Continue to database storage
        await handleDatabaseStorage();
        
      } else {
        console.warn('Could not fetch transcript content for parsing');
        updateStepStatus('subtitles', 'completed', 100, 'Subtitles ready!');
        await handleDatabaseStorage();
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      updateStepStatus('subtitles', 'completed', 100, 'Subtitles ready!');
      await handleDatabaseStorage();
    }
  };

  const handleUploadError = (error: string) => {
    console.error('❌ Upload error:', error);
    setError(error);
    updateStepStatus('upload', 'error', undefined, error);
    setIsProcessing(false);
  };

  // Database storage handler
  const handleDatabaseStorage = async () => {
    updateStepStatus('database', 'processing', 0, 'Creating video record...');
    
    try {
      const videoId = `mux_${Date.now()}`;
      
      // Create video record in database
      const uploadResponse = await fetch('/api/videos/upload-mux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: contentData.title,
          description: contentData.description,
          category: contentData.category,
          tags: contentData.tags.join(','),
          visibility: contentData.metadata.visibility || 'private',
          // Set status based on subtitle completion
          status: uploadResults.subtitles ? 'published' : 'processing',
          uploadId: uploadResults.uploadId,
          assetId: uploadResults.assetId,
          playbackId: uploadResults.playbackId,
          thumbnails: selectedThumbnails,
          subtitles: uploadResults.subtitles,
          uploadMethod: 'mux_direct'
        }),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to create video record: ${uploadResponse.status} - ${errorText}`);
      }

      const result = await uploadResponse.json();
      const createdVideoId = result.video?.id || videoId;
      
      setUploadResults(prev => ({ ...prev, videoId: createdVideoId }));
      
      updateStepStatus('database', 'completed', 100, 'Video record created successfully!');
      
      // Check if speaker identification is needed
      if (transcriptData && transcriptData.speakerCount > 1) {
        updateStepStatus('speaker_identification', 'processing', 0, 'Multiple speakers detected...');
        setShowSpeakerIdentification(true);
      } else {
        // Skip speaker identification
        updateStepStatus('speaker_identification', 'completed', 100, 'Single speaker - no identification needed');
        await handleCompletion();
      }
      
    } catch (error) {
      console.error('❌ Database storage failed:', error);
      setError(`Database storage failed: ${error}`);
      updateStepStatus('database', 'error', undefined, `Database storage failed: ${error}`);
      setIsProcessing(false);
    }
  };

  // Speaker identification completion
  const handleSpeakerIdentificationComplete = async () => {
    updateStepStatus('speaker_identification', 'completed', 100, 'Speaker identification completed!');
    setShowSpeakerIdentification(false);
    await handleCompletion();
  };

  // Final completion
  const handleCompletion = async () => {
    updateStepStatus('completion', 'processing', 0, 'Finalizing upload...');
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    updateStepStatus('completion', 'completed', 100, `Upload completed in ${duration}s!`);
    
    setIsProcessing(false);
    
    // Notify parent component
    onComplete(true, {
      videoId: uploadResults.videoId,
      assetId: uploadResults.assetId,
      playbackId: uploadResults.playbackId,
      thumbnails: selectedThumbnails,
      subtitles: uploadResults.subtitles,
      duration
    });
  };

  // Utility functions
  const parseVTTContent = (vttContent: string): string => {
    try {
      const lines = vttContent.split('\n');
      let transcript = '';
      
      for (const line of lines) {
        // Skip VTT headers, timestamps, and empty lines
        if (line.startsWith('WEBVTT') || 
            line.match(/^\d{2}:\d{2}:\d{2}\.\d{3}/) || 
            line.trim() === '' ||
            line.includes('-->')) {
          continue;
        }
        
        if (line.trim()) {
          transcript += line.trim() + ' ';
        }
      }
      
      return transcript.trim();
    } catch (error) {
      console.error('Error parsing VTT content:', error);
      return vttContent;
    }
  };

  const countSpeakersInTranscript = (transcript: string): number => {
    // Simple heuristic - look for speaker patterns or sentence breaks that might indicate speaker changes
    // This is basic since Mux doesn't provide speaker diarization
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());
    
    // Estimate speakers based on content length and variety
    if (sentences.length < 3) return 1;
    if (sentences.length < 10) return Math.min(2, Math.ceil(sentences.length / 5));
    
    // For longer content, assume possible multiple speakers
    return Math.min(3, Math.ceil(sentences.length / 15));
  };

  const onSpeakersUpdated = (speakers: any) => {
    console.log('Speakers updated:', speakers);
    // This will be called when speaker identification is complete
    handleSpeakerIdentificationComplete();
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  const getOverallProgress = () => {
    const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
    const totalSteps = processingSteps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getCurrentStepIndex = () => {
    const currentStepIndex = processingSteps.findIndex(step => 
      step.status === 'processing' || (step.status === 'pending' && processingSteps.slice(0, processingSteps.indexOf(step)).every(s => s.status === 'completed'))
    );
    return currentStepIndex >= 0 ? currentStepIndex : processingSteps.length - 1;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Video className="h-6 w-6 text-blue-600" />
            Upload Video with Mux
            {isProcessing && (
              <Badge variant="secondary" className="ml-auto">
                Processing...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-500">{getOverallProgress()}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">Upload Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Mux Uploader Component */}
          {!isProcessing && !error && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Upload Your Video</h3>
              <MuxUploaderComponent
                videoId={`mux_video_${Date.now()}`}
                title={contentData.title}
                description={contentData.description}
                onUploadStart={handleUploadStart}
                onUploadProgress={handleUploadProgress}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
                onThumbnailsReady={handleThumbnailsReady}
                onSubtitlesReady={handleSubtitlesReady}
                config={{
                  generateSubtitles: true,
                  subtitleLanguage: 'en',
                  playbackPolicy: 'signed',
                  mp4Support: 'high',
                  maxResolution: '1080p',
                  normalizeAudio: true
                }}
                className="w-full"
              />
            </div>
          )}

          {/* Processing Steps */}
          {isProcessing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing Steps</h3>
              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      step.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : step.status === 'processing'
                        ? 'bg-blue-50 border-blue-200'
                        : step.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : step.status === 'processing' ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : step.status === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {step.icon}
                        <h4 className="font-medium">{step.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      {step.details && (
                        <p className="text-sm text-blue-600 mt-1">{step.details}</p>
                      )}
                      {step.progress !== undefined && step.status === 'processing' && (
                        <Progress value={step.progress} className="h-1 mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thumbnail Preview */}
          {selectedThumbnails && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">Generated Thumbnails</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Small</p>
                  <img 
                    src={selectedThumbnails.small} 
                    alt="Small thumbnail"
                    className="w-full h-auto border rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Medium</p>
                  <img 
                    src={selectedThumbnails.medium} 
                    alt="Medium thumbnail"
                    className="w-full h-auto border rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Large</p>
                  <img 
                    src={selectedThumbnails.large} 
                    alt="Large thumbnail"
                    className="w-full h-auto border rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Variant (15s)</p>
                  <img 
                    src={selectedThumbnails.variants[1]?.url || selectedThumbnails.large} 
                    alt="Thumbnail variant"
                    className="w-full h-auto border rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Speaker Identification Interface */}
          {showSpeakerIdentification && transcriptData && uploadResults.videoId && (
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Speaker Identification Required
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We detected {transcriptData.speakerCount} potential speakers in your transcript. Please review and name each speaker to improve transcript quality.
                </p>
                
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={handleSpeakerIdentificationComplete}
                    className="text-sm"
                  >
                    Skip Speaker Identification
                  </Button>
                </div>
              </div>
              
              <SpeakerIdentification
                videoId={uploadResults.videoId}
                transcript={transcriptData.text}
                videoRef={videoRef}
                onSpeakersUpdated={onSpeakersUpdated}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Close'}
            </Button>
            
            {processingSteps.every(step => step.status === 'completed') && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Upload Complete!
              </Badge>
            )}
          </div>
        </div>

        {/* Hidden canvas for any image processing */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Hidden video element for speaker identification if needed */}
        {uploadResults.playbackId && (
          <video 
            ref={videoRef}
            className="hidden"
            src={`https://stream.mux.com/${uploadResults.playbackId}.m3u8`}
            crossOrigin="anonymous"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}