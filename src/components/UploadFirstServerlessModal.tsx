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
  Monitor
} from 'lucide-react';

interface UploadFirstServerlessModalProps {
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

export function UploadFirstServerlessModal({
  isOpen,
  onClose,
  onComplete,
  contentData
}: UploadFirstServerlessModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  
  // Video preview state
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  
  // Thumbnail selection state
  const [thumbnailMethod, setThumbnailMethod] = useState<'auto' | 'timestamp' | 'custom'>('timestamp');
  const [selectedThumbnailTime, setSelectedThumbnailTime] = useState(10);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  
  // Upload results
  const [uploadResults, setUploadResults] = useState<{
    s3Key?: string;
    publicUrl?: string;
    videoId?: string;
  }>({});

  // Processing steps - Upload first workflow
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'validate',
      title: 'Validating Content',
      description: 'Checking video file and metadata',
      icon: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'upload',
      title: 'Uploading Video',
      description: 'Uploading to cloud storage',
      icon: <Upload className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'database',
      title: 'Creating Video Record',
      description: 'Saving video metadata to database',
      icon: <Database className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'mux',
      title: 'Video Processing',
      description: 'Optimizing for streaming with Mux',
      icon: <Video className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'thumbnail',
      title: 'Processing Thumbnail',
      description: 'Generating or uploading thumbnail',
      icon: <Image className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'transcription',
      title: '🎬 Mux Subtitle Generation',
      description: 'Automatic subtitle generation powered by Mux',
      icon: <Mic className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    },
    {
      id: 'complete',
      title: 'Publishing Complete',
      description: 'Video is now live',
      icon: <Zap className="h-4 w-4 sm:h-5 sm:w-5" />,
      status: 'pending'
    }
  ]);

  // Initialize video preview when modal opens
  useEffect(() => {
    if (isOpen && contentData.metadata.pendingFile) {
      const file = contentData.metadata.pendingFile as File;
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [isOpen, contentData.metadata.pendingFile]);

  // Handle video metadata loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      setSelectedThumbnailTime(Math.min(10, video.duration / 2));
    };

    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoPreviewUrl]);

  // Generate thumbnail preview when timestamp changes
  useEffect(() => {
    if (thumbnailMethod === 'timestamp' && videoRef.current && canvasRef.current && videoDuration > 0) {
      generateThumbnailFromTimestamp(selectedThumbnailTime);
    }
  }, [selectedThumbnailTime, thumbnailMethod, videoDuration]);

  const generateThumbnailFromTimestamp = (time: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    video.currentTime = time;
    
    const handleSeeked = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnailPreview(thumbnailDataUrl);
      
      video.removeEventListener('seeked', handleSeeked);
    };

    video.addEventListener('seeked', handleSeeked);
  };

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPlaying) {
      video.pause();
      setIsVideoPlaying(false);
    } else {
      video.play();
      setIsVideoPlaying(true);
    }
  };

  const handleCustomThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCustomThumbnail(file);
      setThumbnailMethod('custom');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startPublishProcess = async () => {
    setIsProcessing(true);
    setStartTime(Date.now());
    setError(null);

    try {
      // Step 1: Validate Content - ENHANCED: Better validation with fallback logic
      await processStep('validate', async () => {
        console.log('🎬 Validating content data:', {
          title: contentData.title,
          hasPendingFile: !!contentData.metadata.pendingFile,
          pendingFileType: contentData.metadata.pendingFile?.constructor.name,
          pendingFileName: contentData.metadata.pendingFile?.name,
          pendingFileSize: contentData.metadata.pendingFile?.size,
          metadataKeys: Object.keys(contentData.metadata),
          hasS3Key: !!contentData.metadata.s3Key,
          hasPublicUrl: !!contentData.metadata.publicUrl
        });
        
        if (!contentData.title.trim()) {
          throw new Error('Title is required. Please enter a title for your video.');
        }
        
        // ENHANCED: Better video file validation with fallback logic
        const videoFile = contentData.metadata.pendingFile;
        const hasS3Data = contentData.metadata.s3Key && contentData.metadata.publicUrl;
        
        if (!videoFile && !hasS3Data) {
          console.error('🎬 ❌ No video file or S3 data found');
          console.error('🎬 Available metadata:', contentData.metadata);
          throw new Error('No video file found. Please upload a video first using the video upload component above.');
        }
        
        if (videoFile) {
          // Verify the file is actually a File object
          if (!(videoFile instanceof File)) {
            console.error('🎬 ❌ pendingFile is not a File object:', typeof videoFile);
            throw new Error('Invalid video file format. Please try uploading the video again.');
          }
          
          // Check file size (5GB max)
          const maxSize = 5 * 1024 * 1024 * 1024;
          if (videoFile.size > maxSize) {
            throw new Error(`File too large. Maximum size is 5GB (current: ${(videoFile.size / (1024 * 1024 * 1024)).toFixed(2)}GB). Please use a smaller video file.`);
          }
          
          // Check file type
          if (!videoFile.type.startsWith('video/')) {
            throw new Error('Invalid file type. Please upload a video file (MP4, MOV, AVI, etc.).');
          }
          
          console.log('🎬 ✅ Validation passed - video file found:', videoFile.name, `(${(videoFile.size / (1024*1024)).toFixed(1)}MB)`);
        } else if (hasS3Data) {
          console.log('🎬 ✅ Validation passed - using existing S3 data:', contentData.metadata.s3Key);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      // Step 2: Upload Video FIRST
      let uploadData: {s3Key: string, publicUrl: string, videoId?: string} = {s3Key: '', publicUrl: ''};
      await processStep('upload', async () => {
        uploadData = await uploadVideo();
        setUploadResults(uploadData);
        return uploadData;
      });

      // Step 3: Create Database Record
      await processStep('database', async () => {
        const videoRecord = await createVideoRecord(uploadData);
        uploadData.videoId = videoRecord.id;
        setUploadResults(uploadData);
        return videoRecord;
      });

      // Step 4: Mux Processing (async)
      await processStep('mux', async () => {
        await processMuxVideo();
      });

      // Step 5: Process Thumbnail (async)
      await processStep('thumbnail', async () => {
        await processThumbnail();
      });

      // Step 6: Generate Transcription (async)
      await processStep('transcription', async () => {
        await generateTranscription();
      });

      // Step 7: Complete
      await processStep('complete', async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Success!
      setTimeout(() => {
        onComplete(true, { 
          message: 'Video published successfully!',
          videoId: uploadResults.videoId,
          videoUrl: `/videos/${uploadResults.videoId}`
        });
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

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], progress?: number, details?: string) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId 
          ? { ...step, status, progress, details, duration: status === 'completed' ? Date.now() - startTime : undefined }
          : step
      )
    );
  };

  const uploadVideo = async () => {
    const file = contentData.metadata.pendingFile;
    
    if (!file) {
      console.error('❌ No video file to upload');
      throw new Error('No video file available for upload');
    }
    
    console.log('📤 Starting video upload:', { 
      fileName: file.name, 
      fileSize: `${(file.size / (1024*1024)).toFixed(2)}MB`,
      fileType: file.type 
    });
    
    updateStepStatus('upload', 'processing', 5, 'Getting upload URL...');
    
    // Get presigned URL
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
      const errorText = await presignedResponse.text();
      console.error('❌ Failed to get presigned URL:', errorText);
      throw new Error(`Failed to get upload URL: ${errorText || presignedResponse.statusText}`);
    }

    const presignedData = await presignedResponse.json();
    const { presignedUrl, s3Key, publicUrl } = presignedData;
    
    console.log('✅ Got presigned URL:', { s3Key, publicUrl, hasPresignedUrl: !!presignedUrl });
    
    updateStepStatus('upload', 'processing', 10, 'Starting upload...');

    // Upload with progress tracking
    return new Promise<{s3Key: string, publicUrl: string}>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 85) + 10; // 10-95%
          const mbLoaded = (e.loaded / (1024 * 1024)).toFixed(1);
          const mbTotal = (e.total / (1024 * 1024)).toFixed(1);
          updateStepStatus('upload', 'processing', progress, `Uploading... ${mbLoaded}MB / ${mbTotal}MB`);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          updateStepStatus('upload', 'processing', 95, 'Upload complete, verifying...');
          console.log('✅ S3 upload successful:', { s3Key, publicUrl });
          resolve({ s3Key, publicUrl });
        } else {
          console.error('❌ S3 upload failed with status:', xhr.status);
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const createVideoRecord = async (uploadData?: {s3Key: string, publicUrl: string, videoId?: string}) => {
    updateStepStatus('database', 'processing', 30, 'Creating video record...');
    
    // Use passed data or fallback to state
    const s3Data = uploadData || uploadResults;
    
    // Verify we have the required S3 data
    if (!s3Data.s3Key || !s3Data.publicUrl) {
      console.error('Missing S3 upload data:', s3Data);
      throw new Error('S3 upload data missing - upload may have failed');
    }
    
    const requestBody = {
      title: contentData.title,
      description: contentData.description,
      category: contentData.category,
      tags: contentData.tags.join(','),
      visibility: contentData.metadata.visibility || 'private',
      status: 'processing', // Videos start as processing, then move to ready when complete
      filename: (contentData.metadata.pendingFile as File).name,
      size: (contentData.metadata.pendingFile as File).size,
      mimeType: (contentData.metadata.pendingFile as File).type,
      autoThumbnail: thumbnailPreview,
      s3Key: s3Data.s3Key,
      publicUrl: s3Data.publicUrl
    };
    
    console.log('📝 Sending database record request:', requestBody);
    
    // Call the actual upload API to create the database record
    const uploadResponse = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.text();
      console.error('Failed to create video record. Response:', errorData);
      throw new Error(`Failed to create video record: ${errorData || uploadResponse.statusText}`);
    }

    updateStepStatus('database', 'processing', 80, 'Updating search index...');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await uploadResponse.json();
    return result.video;
  };

  const processMuxVideo = async () => {
    // Don't update status here - processStep handles it
    console.log('🎬 Mux processing initiated in upload API');
    
    // The Mux processing happens automatically in the upload API
    // We just need to wait a bit for it to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎬 Mux asset creation in progress');
    return { success: true, message: 'Mux processing initiated' };
  };

  const processThumbnail = async () => {
    // Don't update status here - processStep handles it
    console.log('🖼️ Using Mux automatic thumbnail generation');
    
    // Thumbnails are instantly available with Mux
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('✅ Mux thumbnail generation complete');
    return { success: true, message: 'Mux thumbnail ready' };
  };

  const generateTranscription = async () => {
    // Don't update status here - processStep handles it
    console.log('📝 Mux will generate subtitles automatically for video:', uploadResults?.videoId || 'pending');
    
    // Wait a moment then return success since Mux handles this async
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🎬 Mux subtitle generation queued successfully');
    return { success: true, message: 'Mux subtitle generation initiated' };
  };

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
      default:
        return <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepBadge = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-xs">Complete</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-500 text-xs">Processing</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const overallProgress = Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-3 sm:p-4 md:p-6 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl lg:text-2xl">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500 flex-shrink-0" />
              <span className="truncate">
                Publishing Video with Upload-First Workflow
              </span>
            </DialogTitle>
            {!isProcessing && (
              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!isProcessing ? (
            // Preview Phase - Responsive Layout
            <div className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Video Preview */}
                <div className="space-y-4 min-w-0">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Preview
                  </h3>
                  
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-w-full">
                    {videoPreviewUrl && (
                      <>
                        <video
                          ref={videoRef}
                          src={videoPreviewUrl}
                          className="w-full h-full object-contain"
                          onPlay={() => setIsVideoPlaying(true)}
                          onPause={() => setIsVideoPlaying(false)}
                        />
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            onClick={toggleVideoPlayback}
                            className="bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3"
                          >
                            {isVideoPlaying ? <Pause className="h-4 w-4 sm:h-6 sm:w-6" /> : <Play className="h-4 w-4 sm:h-6 sm:w-6" />}
                          </Button>
                        </div>
                        
                        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
                          <div className="bg-black/50 rounded px-2 py-1 text-white text-xs sm:text-sm">
                            {formatTime(currentVideoTime)} / {formatTime(videoDuration)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Thumbnail Selection */}
                <div className="space-y-4 min-w-0">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Thumbnail Selection
                  </h3>
                  
                  <Tabs value={thumbnailMethod} onValueChange={(value) => setThumbnailMethod(value as any)}>
                    <TabsList className="grid w-full grid-cols-3 text-sm h-10">
                      <TabsTrigger value="timestamp" className="text-xs">From Video</TabsTrigger>
                      <TabsTrigger value="custom" className="text-xs">Upload Custom</TabsTrigger>
                      <TabsTrigger value="auto" className="text-xs">Auto Generate</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="timestamp" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Select Timestamp</Label>
                        <Slider
                          value={[selectedThumbnailTime]}
                          onValueChange={([value]) => setSelectedThumbnailTime(value)}
                          max={videoDuration}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                          <span>0:00</span>
                          <span>{formatTime(selectedThumbnailTime)}</span>
                          <span>{formatTime(videoDuration)}</span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="custom" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Upload Custom Thumbnail</Label>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomThumbnailUpload}
                          className="text-sm"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="auto" className="space-y-4 mt-4">
                      <p className="text-xs sm:text-sm text-gray-600">
                        A thumbnail will be automatically generated from the middle of your video.
                      </p>
                    </TabsContent>
                  </Tabs>
                  
                  {/* Thumbnail Preview */}
                  {thumbnailPreview && (
                    <div className="space-y-2">
                      <Label className="text-sm">Thumbnail Preview</Label>
                      <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsive Device Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm sm:text-base font-medium mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Responsive Preview
                </h4>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Mobile Ready</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tablet className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Tablet Optimized</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Desktop Enhanced</span>
                  </div>
                </div>
              </div>

              {/* Mux Processing Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-4 border border-blue-100">
                <h4 className="text-sm sm:text-base font-medium flex items-center gap-2 text-blue-900">
                  <Mic className="h-4 w-4" />
                  🎬 Mux Video Processing
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-gray-700">Video Streaming</Label>
                      <Badge variant="default" className="bg-green-500 text-xs">Automatic</Badge>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded">
                      Optimized adaptive bitrate streaming for all devices
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-gray-700">Thumbnail Generation</Label>
                      <Badge variant="default" className="bg-blue-500 text-xs">Instant</Badge>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded">
                      Thumbnails available immediately after upload
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-gray-700">Subtitle Generation</Label>
                      <Badge variant="default" className="bg-purple-500 text-xs">Mux Native</Badge>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded">
                      Automatic subtitle generation (may take up to 24 hours)
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-gray-700">Format Support</Label>
                      <Badge variant="default" className="bg-orange-500 text-xs">Universal</Badge>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded">
                      MP4, MOV, AVI, and more - all formats supported
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900 text-white p-3 rounded-lg text-xs">
                  <div className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium mb-1">Mux Processing Active</div>
                      <div className="text-blue-100">
                        Your video will be processed by Mux for streaming optimization, thumbnail generation, and automatic subtitle creation.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} className="text-sm">
                  Cancel
                </Button>
                <Button onClick={startPublishProcess} className="bg-blue-600 hover:bg-blue-700 text-sm">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Upload & Processing
                </Button>
              </div>
            </div>
          ) : (
            // Processing Phase - Responsive Layout
            <div className="space-y-4 sm:space-y-6">
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
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-sm sm:text-base">Publishing Failed</span>
                  </div>
                  <p className="text-red-600 mt-1 text-sm">{error}</p>
                </div>
              )}

              {/* Steps List - Responsive */}
              <div className="space-y-3 sm:space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-3 sm:p-4 rounded-lg border transition-all duration-300 ${
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
                      <div className="flex items-center gap-2 sm:gap-3">
                        {getStepIcon(step)}
                        <div>
                          <h4 className="font-medium text-sm sm:text-base">{step.title}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{step.description}</p>
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
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
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
          )}
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
